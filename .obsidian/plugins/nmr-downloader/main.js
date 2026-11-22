'use strict';
/*
 * NMR Downloader - Obsidian plugin (desktop only).
 *
 * Downloads NMR spectra archives (.zip) that arrive by e-mail, unpacks them into
 * folders sorted by spectrometer frequency (or into one folder) and opens the
 * spectrum in MestReNova or Bruker TopSpin.
 *
 * Mail is read through the Gmail API with Google sign-in (OAuth, credentials.json),
 * exactly like the old Python script did.
 *
 * No third-party libraries: the OAuth/Gmail client and the ZIP reader below use only
 * modules that ship with Node/Electron.
 */

const obsidian = require('obsidian');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const zlib = require('zlib');
const os = require('os');
const { spawn } = require('child_process');
const net = require('net');

/* ========================================================================== */
/* Settings                                                                   */
/* ========================================================================== */

const STORAGE_MODES = ['by_frequency', 'single_folder', 'both'];
const OPEN_MODES = ['tens', 'each', 'name'];
const OPEN_WITH = ['mestrenova', 'topspin', 'none'];

// The Google sign-in (refresh token), the account address, the path to credentials.json and the paths of the programs
// that are started (MestReNova, TopSpin) are kept on this computer, outside the vault (see SecretStore); they are never
// written to data.json, so a synced or shared vault cannot carry a sign-in or point the plugin at another program.
const LOCAL_FIELDS = ['googleRefreshToken', 'googleAccount', 'credentialsFile', 'mnovaPath', 'topspinPath'];
const LOCAL_PATHS = ['credentialsFile', 'mnovaPath', 'topspinPath'];

const DEFAULT_SETTINGS = {
	senderEmail: '', // one or several addresses, comma separated
	archivePrefixes: 'MG,GM',
	nmrUsername: '',
	storageMode: 'by_frequency',
	downloadFolder: '',
	frequencyFolders: [], // [{ freq: '400', folder: 'C:\\...\\400' }]
	singleFolder: '',
	mnovaPath: '',
	openInMnova: true, // older setting; openWith decides
	openWith: 'mestrenova', // where downloaded spectra open: mestrenova | topspin | none
	topspinPath: '', // TopSpin folder (or topspin.cmd); empty = looked for in C:\Bruker, /opt
	keepZip: false,
	groupFolders: true, // unpack experiments 10-19, 20-29 ... of a spectrometer into one folder each (<prefix>_10-19)
	openMode: 'tens', // how spectra are put into MestReNova documents: tens | each | name
	launchDelayMs: 1500, // pause between two MestReNova launches
	markOtherRead: true, // also mark mails without an archive (e.g. "Sample Measured", the PDF printout) as read
	checkSenderAuth: true, // download only from mails that Gmail authenticated for the sender's domain (DMARC / DKIM / SPF)
	// "Open in TopSpin" button: spectrum folders named after the notebook page, e.g. 0100150101 =
	// notebook 01 + note (page) 0015 + experiment 01 + type 01
	pageFolders: false,
	notebooks: [], // [{ code: 'Exp', number: '01' }]
	pageDigits: 4, // digits of the note number in the folder name (3: up to 999, 4: up to 9999)
	pageSearchFolders: '', // folders with these spectra, one per line (empty = the spectra folders above)
	globalShortcut: '', // keys that start the download in every program, also with Obsidian minimized ('' = off)
};

/* ========================================================================== */
/* Shortcut in every program                                                  */
/* ========================================================================== */

const KEY_NAMES = {
	ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Space: 'Space', Enter: 'Enter', Tab: 'Tab',
	Insert: 'Insert', Delete: 'Delete', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Backquote: '`',
	Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
	Backslash: '\\', Pause: 'Pause', ScrollLock: 'Scrolllock', PrintScreen: 'PrintScreen',
};
/**
 * The Electron accelerator ("Ctrl+Alt+Shift+N") of a key press, from the key's place (e.code), so it does not depend
 * on the keyboard layout; null for a modifier alone, or for a key without Ctrl/Alt/Cmd that would stop it from being
 * typed in every program (F1–F24 alone are allowed: mouse programs often send them).
 */
function acceleratorFromEvent(e, platform = process.platform) {
	const mods = [];
	if (e.ctrlKey) mods.push('Ctrl');
	if (e.metaKey) mods.push(platform === 'darwin' ? 'Cmd' : 'Super');
	if (e.altKey) mods.push('Alt');
	if (e.shiftKey) mods.push('Shift');
	const c = String(e.code || '');
	let key = null;
	if (/^Key[A-Z]$/.test(c)) key = c.slice(3);
	else if (/^Digit\d$/.test(c)) key = c.slice(5);
	else if (/^F([1-9]|1\d|2[0-4])$/.test(c)) key = c;
	else if (/^Numpad\d$/.test(c)) key = 'num' + c.slice(6);
	else key = KEY_NAMES[c] || null;
	if (!key) return null;
	const strong = mods.some((m) => m !== 'Shift');
	if (!strong && !/^F\d+$/.test(key)) return null;
	return [...mods, key].join('+');
}
/** "ctrl + alt+shift+n", "Control+Option+N" -> "Ctrl+Alt+Shift+N" ('' stays '') */
function normalizeAccelerator(text) {
	const parts = String(text || '').split('+').map((p) => p.trim()).filter(Boolean);
	const names = { ctrl: 'Ctrl', control: 'Ctrl', alt: 'Alt', option: 'Alt', shift: 'Shift', cmd: 'Cmd', command: 'Cmd',
		super: 'Super', win: 'Super', meta: 'Super', cmdorctrl: 'CmdOrCtrl', commandorcontrol: 'CmdOrCtrl' };
	return parts.map((p, i) => (i < parts.length - 1 ? names[p.toLowerCase()] || p : p.length === 1 ? p.toUpperCase() : p.replace(/^f(\d+)$/i, 'F$1'))).join('+');
}

/* ========================================================================== */
/* Secrets on this computer                                                   */
/* ========================================================================== */

/**
 * Values kept in this computer's local storage (Obsidian's application data, outside the vault) under
 * "<prefix>:<name>". Secrets are encrypted with Electron safeStorage where the system offers it (Windows: DPAPI,
 * macOS: Keychain, Linux: libsecret / kwallet) and stored as "enc1:<base64>"; otherwise as "plain1:<text>".
 * opts (tests): { storage, safeStorage } replace window.localStorage and Electron's safeStorage (null = none).
 */
class SecretStore {
	constructor(prefix, opts) {
		this.prefix = prefix;
		this.opts = opts || {};
	}

	storage() {
		return this.opts.storage || window.localStorage;
	}

	safeStorage() {
		if ('safeStorage' in this.opts) return this.opts.safeStorage;
		try {
			const electron = require('electron');
			const ss = (electron.remote && electron.remote.safeStorage) || electron.safeStorage;
			return ss && ss.isEncryptionAvailable() ? ss : null;
		} catch (e) {
			return null;
		}
	}

	key(name) {
		return this.prefix + ':' + name;
	}

	/** Plain value (not secret): '' when missing or when storage is unavailable */
	get(name) {
		try {
			return this.storage().getItem(this.key(name)) || '';
		} catch (e) {
			return '';
		}
	}

	/** Stores a plain value ('' removes it); true when it was stored */
	set(name, value) {
		try {
			if (value) this.storage().setItem(this.key(name), String(value));
			else this.storage().removeItem(this.key(name));
			return this.get(name) === String(value || '');
		} catch (e) {
			return false;
		}
	}

	/** { value, state }: state 'none' | 'encrypted' | 'plain' | 'unreadable' (cannot be decrypted on this computer) */
	readSecret(name) {
		const raw = this.get(name);
		if (!raw) return { value: '', state: 'none' };
		if (raw.startsWith('enc1:')) {
			try {
				const ss = this.safeStorage();
				if (!ss) return { value: '', state: 'unreadable' };
				const value = ss.decryptString(Buffer.from(raw.slice(5), 'base64'));
				return value ? { value, state: 'encrypted' } : { value: '', state: 'unreadable' };
			} catch (e) {
				return { value: '', state: 'unreadable' };
			}
		}
		if (raw.startsWith('plain1:')) return { value: raw.slice(7), state: 'plain' };
		return { value: raw, state: 'plain' }; // stored before encryption was used
	}

	/** Stores a secret ('' removes it). Returns 'encrypted' | 'plain' | 'removed' | 'failed' (read back to check). */
	writeSecret(name, value) {
		if (!value) return this.set(name, '') ? 'removed' : 'failed';
		let stored = null;
		let state = 'plain';
		try {
			const ss = this.safeStorage();
			if (ss) {
				stored = 'enc1:' + Buffer.from(ss.encryptString(String(value))).toString('base64');
				state = 'encrypted';
			}
		} catch (e) {
			stored = null;
			state = 'plain';
		}
		if (!stored) stored = 'plain1:' + value;
		if (!this.set(name, stored)) return 'failed';
		const back = this.readSecret(name);
		return back.value === String(value) ? state : 'failed';
	}
}

/** Error text without the secrets in it */
function maskSecrets(text, secrets) {
	let out = String(text == null ? '' : text);
	for (const v of secrets || []) if (v && v.length >= 8) out = out.split(v).join('<token>');
	return out;
}

/** Revokes a Google token (refresh or access); true when Google confirmed it */
async function revokeGoogle(token, hooks) {
	if (!token) return false;
	try {
		const res = await httpRequest(endpointsFor(hooks).revokeUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ token }).toString(),
			tlsOptions: hooks && hooks.tlsOptions,
		});
		return res.status === 200;
	} catch (e) {
		return false;
	}
}

function escapeRegex(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** MG_Smith400-2026_12  ->  prefix "MG_Smith400-2026", freq "400", num "12" */
function buildArchiveRegex(prefixes, username) {
	const alt = prefixes.map(escapeRegex).join('|');
	return new RegExp(
		`^(?<prefix>(?:${alt})_${escapeRegex(username)}(?<freq>\\d{3})-\\d{4})_(?<num>\\d+)$`,
		'i'
	);
}

/** Where downloaded spectra open; older settings had only the MestReNova switch. */
/** A path from the settings: spaces and the quotes of Explorer's "Copy as path" removed */
function cleanPath(p) {
	return String(p || '').trim().replace(/^["'](.*)["']$/, '$1').trim();
}

function openWithOf(s) {
	if (OPEN_WITH.includes(s.openWith)) return s.openWith;
	return s.openInMnova === false ? 'none' : 'mestrenova';
}

/** Checks only the mail settings (used by the "Test" button). */
function prepareMailConfig(s, opts) {
	const problems = [];
	const need = (value, label) => {
		if (!String(value || '').trim()) problems.push(`${label} is empty`);
	};
	need(s.credentialsFile, 'Credentials file (credentials.json)');
	if (!(opts && opts.noSender)) {
		need(s.senderEmail, 'Sender e-mail');
		if (!String(s.googleRefreshToken || '').trim() && String(s.credentialsFile || '').trim())
			problems.push('Not signed in to Google: press "Authorize"');
	}
	const senders = splitSenders(s.senderEmail);
	if (problems.length) return { problems };
	return {
		problems,
		mail: {
			credentialsFile: cleanPath(s.credentialsFile),
			googleRefreshToken: String(s.googleRefreshToken || '').trim(),
			senders,
			senderEmail: senders.join(', '),
		},
	};
}

/** Validates the plugin settings and turns them into a ready-to-use config. */
function prepareConfig(s) {
	const mailPart = prepareMailConfig(s);
	const problems = mailPart.problems.slice();
	const need = (value, label) => {
		if (!String(value || '').trim()) problems.push(`${label} is empty`);
	};
	need(s.downloadFolder, 'Download folder');
	need(s.nmrUsername, 'User name in archive names');

	const prefixes = String(s.archivePrefixes || '')
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean);
	if (!prefixes.length) problems.push('Archive prefixes are empty (example: MG,GM)');

	const mode = String(s.storageMode || 'by_frequency').trim().toLowerCase().replace(/[\s-]+/g, '_');
	if (!STORAGE_MODES.includes(mode)) problems.push(`Unknown storage mode "${s.storageMode}"`);

	const folders = {};
	for (const row of s.frequencyFolders || []) {
		const freq = String(row.freq || '').trim();
		const folder = cleanPath(row.folder);
		if (!freq && !folder) continue;
		if (!/^\d+$/.test(freq)) problems.push(`Frequency "${freq}" must be a number (MHz)`);
		else if (!folder) problems.push(`Folder for ${freq} MHz is empty`);
		else folders[freq] = folder;
	}
	const openWith = openWithOf(s);
	if (openWith === 'mestrenova' && !String(s.mnovaPath || '').trim())
		problems.push('MestReNova program is empty (set the path to MestReNova.exe or turn off "Open the spectrum in MestReNova")');
	const single = cleanPath(s.singleFolder);
	if ((mode === 'by_frequency' || mode === 'both') && !Object.keys(folders).length)
		problems.push('Add at least one frequency folder');
	if ((mode === 'single_folder' || mode === 'both') && !single) problems.push('Single folder is empty');

	if (problems.length) return { problems };
	return {
		problems,
		cfg: Object.assign({}, mailPart.mail, {
			archiveRegex: buildArchiveRegex(prefixes, s.nmrUsername.trim()),
			prefixesText: prefixes.join(','),
			username: s.nmrUsername.trim(),
			mode,
			downloadFolder: cleanPath(s.downloadFolder),
			folders,
			singleFolder: single,
			mnovaPath: cleanPath(s.mnovaPath),
			openInMnova: openWith === 'mestrenova',
			openWith,
			topspinPath: cleanPath(s.topspinPath),
			keepZip: !!s.keepZip,
			groupFolders: s.groupFolders !== false,
			markOtherRead: s.markOtherRead !== false,
			checkSenderAuth: s.checkSenderAuth !== false,
			openMode: OPEN_MODES.includes(s.openMode) ? s.openMode : 'tens',
			launchDelayMs: Number.isFinite(Number(s.launchDelayMs)) ? Number(s.launchDelayMs) : 1500,
		}),
	};
}

function samePath(a, b) {
	const norm = (p) => {
		const r = path.resolve(p);
		return process.platform === 'win32' ? r.toLowerCase() : r;
	};
	return norm(a) === norm(b);
}

/** Folders an archive of this frequency is unpacked into (the first one is opened). */
function destinations(cfg, freq) {
	if (cfg.mode === 'single_folder') return [cfg.singleFolder];
	const result = cfg.folders[freq] ? [cfg.folders[freq]] : [];
	if (cfg.mode === 'both' && cfg.singleFolder && !result.some((f) => samePath(f, cfg.singleFolder)))
		result.push(cfg.singleFolder);
	return result;
}

/* ---- import of the old nmr_settings.env file ------------------------------ */

function decodeText(buf) {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, '');
	} catch (e) {
		try {
			return new TextDecoder('windows-1251').decode(buf);
		} catch (e2) {
			return buf.toString('latin1');
		}
	}
}

function parseEnv(text) {
	const out = {};
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith('#') || line.startsWith(';')) continue;
		const i = line.indexOf('=');
		if (i < 0) continue;
		let value = line.slice(i + 1).trim();
		if (value.length >= 2 && value[0] === value[value.length - 1] && '"\''.includes(value[0]))
			value = value.slice(1, -1);
		out[line.slice(0, i).trim().toUpperCase()] = value;
	}
	return out;
}

/** Copies the values found in an .env file into the settings. Returns how many were applied. */
function applyEnvToSettings(settings, env) {
	let n = 0;
	const set = (key, field, conv) => {
		if (env[key] === undefined || env[key] === '') return;
		settings[field] = conv ? conv(env[key]) : env[key];
		n++;
	};
	const bool = (v) => ['1', 'true', 'yes', 'y', 'on'].includes(v.trim().toLowerCase());
	set('CREDENTIALS_FILE', 'credentialsFile');
	set('SENDER_EMAIL', 'senderEmail');
	set('ARCHIVE_PREFIXES', 'archivePrefixes');
	set('NMR_USERNAME', 'nmrUsername');
	set('STORAGE_MODE', 'storageMode', (v) => v.trim().toLowerCase().replace(/[\s-]+/g, '_'));
	set('DOWNLOAD_FOLDER', 'downloadFolder');
	set('SINGLE_FOLDER', 'singleFolder');
	set('MNOVA_PATH', 'mnovaPath');
	set('OPEN_IN_MNOVA', 'openInMnova', bool);
	set('OPEN_WITH', 'openWith', (v) => v.trim().toLowerCase());
	set('TOPSPIN_PATH', 'topspinPath');
	set('KEEP_ZIP', 'keepZip', bool);
	set('GROUP_FOLDERS', 'groupFolders', bool);
	set('MARK_OTHER_READ', 'markOtherRead', bool);
	set('CHECK_SENDER_AUTH', 'checkSenderAuth', bool);
	set('OPEN_MODE', 'openMode', (v) => v.trim().toLowerCase());
	const rows = [];
	for (const [k, v] of Object.entries(env)) {
		const m = /^FOLDER_(\d+)$/.exec(k);
		if (m && v) rows.push({ freq: m[1], folder: v });
	}
	if (rows.length) {
		rows.sort((a, b) => Number(a.freq) - Number(b.freq));
		settings.frequencyFolders = rows;
		n += rows.length;
	}
	return n;
}

/* ========================================================================== */
/* Google sign-in (OAuth, "installed app" flow) and Gmail API                 */
/* Same method as the old Python script: credentials.json + saved token,      */
/* scope gmail.modify, query "is:unread has:attachment".                      */
/* ========================================================================== */

const GOOGLE = {
	authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
	tokenUrl: 'https://oauth2.googleapis.com/token',
	revokeUrl: 'https://oauth2.googleapis.com/revoke',
	apiBase: 'https://gmail.googleapis.com/gmail/v1/users/me',
	scope: 'https://www.googleapis.com/auth/gmail.modify',
};

/** Real Google addresses; tests may replace them through hooks.endpoints. */
function endpointsFor(hooks) {
	return Object.assign({}, GOOGLE, (hooks && hooks.endpoints) || {});
}

function b64url(buf) {
	return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s) {
	return Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Minimal HTTP(S) request with Node modules (no CORS limits, works for any status). */
function httpRequest(urlStr, opts) {
	return new Promise((resolve, reject) => {
		const u = new URL(urlStr);
		const lib = u.protocol === 'http:' ? http : https;
		const body = opts && opts.body;
		const headers = Object.assign({}, (opts && opts.headers) || {});
		if (body !== undefined) headers['Content-Length'] = Buffer.byteLength(body);
		const req = lib.request(
			u,
			Object.assign({ method: (opts && opts.method) || 'GET', headers }, (opts && opts.tlsOptions) || {}),
			(res) => {
				const chunks = [];
				res.on('data', (c) => chunks.push(c));
				res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
				res.on('error', reject);
			}
		);
		req.setTimeout((opts && opts.timeoutMs) || 60000, () => req.destroy(new Error('request timed out')));
		req.on('error', reject);
		if (body !== undefined) req.write(body);
		req.end();
	});
}

function parseJson(text) {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
}

/** Reads the credentials.json downloaded from Google Cloud ("Desktop app" client). */
function readCredentials(file) {
	let json;
	try {
		json = JSON.parse(decodeText(fs.readFileSync(file)));
	} catch (e) {
		throw new Error(`Cannot read credentials file "${file}": ${e.message}`);
	}
	const c = json && (json.installed || json.web);
	if (!c || !c.client_id) throw new Error(`"${file}" is not a Google credentials.json (no client_id)`);
	return { clientId: c.client_id, clientSecret: c.client_secret || '', isWeb: !json.installed };
}

function googleError(status, text) {
	const j = parseJson(text);
	const e = j && j.error;
	let msg = (e && (e.message || e.error_description)) || (j && j.error_description) || (typeof e === 'string' ? e : '') || text.slice(0, 200);
	if (j && j.error_description && typeof e === 'string') msg = `${e}: ${j.error_description}`;
	let hint = '';
	if (status === 403 && /has not been used|disabled|accessNotConfigured/i.test(text))
		hint = ' Enable the Gmail API for your Google Cloud project (APIs & Services > Library > Gmail API).';
	if (status === 403 && /insufficient/i.test(text)) hint = ' Press "Authorize" again to grant access to Gmail.';
	return new Error(`Google answered ${status}: ${msg}.${hint}`);
}

const DONE_PAGE = (title, body) =>
	`<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:sans-serif;margin:3em"><h2>${title}</h2><p>${body}</p></body>`;

/**
 * Opens the Google consent page (through openUrl) and waits for the redirect on
 * http://127.0.0.1:<random port>. Returns { refreshToken, accessToken, expiresAt }.
 */
async function authorizeGoogle(creds, hooks, openUrl) {
	const ep = endpointsFor(hooks);
	const verifier = b64url(crypto.randomBytes(48));
	const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
	const state = b64url(crypto.randomBytes(16));

	let server;
	const waitCode = new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('Sign-in timed out (3 minutes). Try again.')), (hooks && hooks.authTimeoutMs) || 180000);
		server = http.createServer((req, res) => {
			const url = new URL(req.url, 'http://127.0.0.1');
			if (url.pathname !== '/') {
				res.writeHead(404).end();
				return;
			}
			const err = url.searchParams.get('error');
			const code = url.searchParams.get('code');
			const okState = url.searchParams.get('state') === state;
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			if (err || !code || !okState) {
				res.end(DONE_PAGE('Sign-in failed', 'You can close this tab and try again in Obsidian.'));
				if (err || okState) {
					clearTimeout(timer);
					reject(new Error(err ? `Google sign-in refused: ${err}` : 'No code received from Google'));
				}
				return; // wrong state: ignore stray requests
			}
			res.end(DONE_PAGE('Signed in', 'You can close this tab and go back to Obsidian.'));
			clearTimeout(timer);
			resolve(code);
		});
		server.on('error', (e) => {
			clearTimeout(timer);
			reject(e);
		});
	});
	waitCode.catch(() => {}); // the rejection is reported below
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const redirectUri = `http://127.0.0.1:${server.address().port}`;
	try {
		const authUrl =
			ep.authUrl +
			'?' +
			new URLSearchParams({
				client_id: creds.clientId,
				redirect_uri: redirectUri,
				response_type: 'code',
				scope: ep.scope,
				access_type: 'offline',
				prompt: 'consent',
				state,
				code_challenge: challenge,
				code_challenge_method: 'S256',
			}).toString();
		await openUrl(authUrl);
		const code = await waitCode;
		const form = new URLSearchParams({
			code,
			client_id: creds.clientId,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
			code_verifier: verifier,
		});
		if (creds.clientSecret) form.set('client_secret', creds.clientSecret);
		const res = await httpRequest(ep.tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: form.toString(),
			tlsOptions: hooks && hooks.tlsOptions,
		});
		const j = parseJson(res.text);
		if (res.status !== 200 || !j || !j.access_token) throw googleError(res.status, res.text);
		if (!j.refresh_token) throw new Error('Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and authorize again.');
		return { refreshToken: j.refresh_token, accessToken: j.access_token, expiresAt: Date.now() + (j.expires_in || 3600) * 1000 };
	} finally {
		server.close();
	}
}

class GmailClient {
	constructor(opts) {
		this.creds = opts.creds;
		this.refreshToken = opts.refreshToken;
		this.ep = endpointsFor(opts.hooks);
		this.hooks = opts.hooks || {};
		this.access = null;
		this.expiresAt = 0;
	}

	async _refresh() {
		if (!this.refreshToken) throw new Error('Not signed in to Google. Open the plugin settings and press "Authorize".');
		const form = new URLSearchParams({
			client_id: this.creds.clientId,
			refresh_token: this.refreshToken,
			grant_type: 'refresh_token',
		});
		if (this.creds.clientSecret) form.set('client_secret', this.creds.clientSecret);
		const res = await httpRequest(this.ep.tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: form.toString(),
			tlsOptions: this.hooks.tlsOptions,
		});
		const j = parseJson(res.text);
		if (res.status !== 200 || !j || !j.access_token) {
			if (j && j.error === 'invalid_grant')
				throw new Error('Google sign-in has expired or was revoked. Open the plugin settings and press "Authorize" again.');
			throw googleError(res.status, res.text);
		}
		this.access = j.access_token;
		this.expiresAt = Date.now() + ((j.expires_in || 3600) - 60) * 1000;
		if (j.refresh_token && j.refresh_token !== this.refreshToken) {
			this.refreshToken = j.refresh_token;
			if (this.hooks.onRefreshToken) await this.hooks.onRefreshToken(j.refresh_token);
		}
	}

	async _token() {
		if (!this.access || Date.now() >= this.expiresAt) await this._refresh();
		return this.access;
	}

	async api(method, pathAndQuery, body) {
		for (let attempt = 0; ; attempt++) {
			const token = await this._token();
			const res = await httpRequest(this.ep.apiBase + pathAndQuery, {
				method,
				headers: Object.assign(
					{ Authorization: 'Bearer ' + token },
					body !== undefined ? { 'Content-Type': 'application/json' } : {}
				),
				body: body !== undefined ? JSON.stringify(body) : undefined,
				tlsOptions: this.hooks.tlsOptions,
			});
			if (res.status === 401 && attempt === 0) {
				this.access = null; // token rejected: get a fresh one once
				continue;
			}
			if (res.status < 200 || res.status >= 300) throw googleError(res.status, res.text);
			return parseJson(res.text) || {};
		}
	}

	async profile() {
		return this.api('GET', '/profile');
	}

	/** Ids of all messages matching a Gmail search query (like the old script, plus paging). */
	async listIds(query, limit) {
		const ids = [];
		let pageToken = '';
		for (let page = 0; page < 20; page++) {
			const q = new URLSearchParams({ q: query, maxResults: String(limit && limit < 100 ? limit : 100) });
			if (pageToken) q.set('pageToken', pageToken);
			const j = await this.api('GET', '/messages?' + q.toString());
			for (const m of j.messages || []) ids.push(m.id);
			pageToken = j.nextPageToken;
			if (!pageToken || (limit && ids.length >= limit)) break;
		}
		return ids;
	}

	getMessage(id) {
		return this.api('GET', `/messages/${encodeURIComponent(id)}?format=full`);
	}

	async getAttachment(messageId, attachmentId) {
		const j = await this.api('GET', `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`);
		return fromB64url(j.data);
	}

	markManyRead(ids) {
		return this.api('POST', '/messages/batchModify', { ids, removeLabelIds: ['UNREAD'] });
	}

	markRead(id) {
		return this.api('POST', `/messages/${encodeURIComponent(id)}/modify`, { removeLabelIds: ['UNREAD'] });
	}
}

/** "a@x.com, b@y.org" -> ['a@x.com', 'b@y.org'] */
function splitSenders(text) {
	return String(text || '')
		.split(/[,;\s]+/)
		.map((s) => s.trim().replace(/["\\()<>]/g, ''))
		.filter(Boolean);
}

/**
 * The address in a From header ("NMR Lab <nmr@uni.edu>" -> "nmr@uni.edu") must be one of
 * the configured senders exactly; an entry starting with "@" accepts the whole domain.
 * (A plain substring test would also accept e.g. "nmr@uni.edu.example.com".)
 */
/**
 * The one sender address of a From header, lower case, or '' when there is not exactly one. Quoted display names
 * and comments are removed first, so '"<nmr@uni.edu>" <evil@x.com>' gives evil@x.com, not nmr@uni.edu.
 */
function senderAddress(fromHeader) {
	const text = String(fromHeader || '')
		.replace(/"(?:[^"\\]|\\.)*"/g, ' ')
		.replace(/\((?:[^()\\]|\\.)*\)/g, ' ')
		.trim();
	const angles = text.match(/<[^<>]*>/g) || [];
	let address;
	if (angles.length === 1) {
		if (text.replace(angles[0], '').includes('@')) return ''; // another address outside the brackets
		address = angles[0].slice(1, -1).trim();
	} else if (angles.length === 0 && !/[<>,;\s]/.test(text)) address = text;
	else return '';
	address = address.toLowerCase();
	return /^[^@\s<>",;]+@[a-z0-9.-]+$/.test(address) ? address : '';
}

function isTrustedSender(fromHeader, senders) {
	const address = senderAddress(fromHeader);
	if (!address) return false;
	return senders.some((entry) => {
		const x = String(entry || '').toLowerCase();
		return x.startsWith('@') ? address.endsWith(x) : address === x;
	});
}

/** Domain of the address in a From header, lower case ('' when there is none) */
function fromDomain(fromHeader) {
	const address = senderAddress(fromHeader);
	return address ? address.slice(address.lastIndexOf('@') + 1) : '';
}

/**
 * The parts of an Authentication-Results value (RFC 8601), split at ";" and comments "(…)" dropped, each part as its
 * words (split at white space; "a = b" read as "a=b"). Quoted strings are kept whole, also inside a comment: Gmail's
 * comments and the smtp.mailfrom value repeat the envelope address, which the sender chooses, and a quoted local part
 * may hold ";", "=", "(" or ")". Only what stands outside quotes and comments separates or names anything.
 */
function authResultParts(value) {
	const parts = [];
	let words = [];
	let word = '';
	let depth = 0;
	let quoted = false;
	const s = String(value || '');
	const endWord = () => {
		if (word) words.push(word);
		word = '';
	};
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (quoted) {
			if (!depth) word += c;
			if (c === '\\' && i + 1 < s.length) {
				if (!depth) word += s[i + 1];
				i++;
			} else if (c === '"') quoted = false;
		} else if (c === '"') {
			quoted = true;
			if (!depth) word += c;
		} else if (c === '\\' && depth) i++;
		else if (c === '(') {
			if (!depth) endWord();
			depth++;
		} else if (c === ')' && depth) depth--;
		else if (depth) continue;
		else if (c === ';') {
			endWord();
			parts.push(words);
			words = [];
		} else if (/\s/.test(c)) {
			// "a = b" is one word "a=b"
			let j = i;
			while (j < s.length && /\s/.test(s[j])) j++;
			if (s[j] === '=' || word.endsWith('=')) i = j - 1;
			else endWord();
		} else word += c;
	}
	if (quoted) word = ''; // a quote left open: the word is not read
	endWord();
	parts.push(words);
	return parts;
}

/**
 * Did Gmail authenticate the sender's domain? The From header alone can be forged; Gmail records its checks in the
 * topmost Authentication-Results header (authserv-id mx.google.com; a header of the same name further down may come
 * from the sender and is ignored). Accepted: dmarc=pass for the From domain, or dkim=pass / spf=pass for exactly the
 * From domain.
 * Returns { ok, how, detail }.
 */
function senderAuthentication(message) {
	const headers = (message.payload && message.payload.headers) || [];
	const domain = fromDomain(headerValue(message, 'from'));
	const top = headers.find((h) => h.name && h.name.toLowerCase() === 'authentication-results');
	if (!domain) return { ok: false, how: '', detail: 'no sender address' };
	if (!top) return { ok: false, how: '', detail: 'Gmail added no authentication results' };
	const parts = authResultParts(top.value);
	const authserv = (parts[0] || []).join(' ').toLowerCase();
	if (authserv !== 'mx.google.com') return { ok: false, how: '', detail: `authentication results not from Gmail (${authserv || 'empty'})` };
	// exactly the sender's domain: a pass for another domain of the same organisation (a subdomain or the parent) does
	// not count, so a key for students.uni.edu cannot vouch for nmr@uni.edu. DMARC itself applies the domain owner's
	// alignment rules, so dmarc=pass for the From domain is the main test.
	// the domain of a property value: after the last "@" outside a quoted local part ("a@b"@evil.com -> evil.com)
	const aligned = (d) => {
		d = String(d || '').toLowerCase().replace(/"(?:[^"\\]|\\.)*"/g, '"q"');
		d = d.slice(d.lastIndexOf('@') + 1);
		return Boolean(d) && d === domain;
	};
	const results = [];
	for (const words of parts.slice(1)) {
		const m = /^(dmarc|dkim|spf)=([a-z]+)$/i.exec(words[0] || '');
		if (!m) continue;
		const method = m[1].toLowerCase();
		const result = m[2].toLowerCase();
		// a property is a word of its own, "name=value"; only the first of each name counts
		const prop = (k) => {
			const w = words.slice(1).find((x) => x.toLowerCase().startsWith(k + '='));
			return w ? w.slice(k.length + 1) : '';
		};
		const d = method === 'dmarc' ? prop('header.from') : method === 'dkim' ? prop('header.i') || prop('header.d') : prop('smtp.mailfrom');
		results.push({ method, result, domain: d });
	}
	for (const method of ['dmarc', 'dkim', 'spf']) {
		const hit = results.find((r) => r.method === method && r.result === 'pass' && aligned(r.domain));
		if (hit) return { ok: true, how: method, detail: `${method}=pass (${hit.domain})` };
	}
	const summary = results.map((r) => `${r.method}=${r.result}${r.domain ? ` (${r.domain})` : ''}`).join(', ');
	return { ok: false, how: '', detail: summary ? `${summary}; nothing passes for ${domain}` : 'no SPF / DKIM / DMARC result' };
}

/** The same search the old Python script used; the sender is checked afterwards, per message. */
function searchQuery() {
	return 'is:unread has:attachment';
}

function headerValue(message, name) {
	const h = ((message.payload && message.payload.headers) || []).find((x) => x.name && x.name.toLowerCase() === name);
	return h ? String(h.value || '') : '';
}

/** Every part of a Gmail message that is a file: [{ filename, attachmentId, data }] */
function messageFiles(message) {
	const out = [];
	const walk = (part, depth) => {
		if (!part || depth > 20) return;
		if (part.filename && part.body && (part.body.attachmentId || part.body.data))
			out.push({ filename: part.filename, attachmentId: part.body.attachmentId, data: part.body.data ? fromB64url(part.body.data) : null });
		for (const p of part.parts || []) walk(p, depth + 1);
	};
	walk(message.payload, 0);
	return out;
}

function makeGmail(cfg, hooks) {
	const credentials = readCredentials(cfg.credentialsFile);
	return new GmailClient({ creds: credentials, refreshToken: cfg.googleRefreshToken, hooks });
}

function safeFileName(name) {
	const base = path.basename(String(name).replace(/\\/g, '/')).replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim();
	return base && base !== '.' && base !== '..' ? base : '';
}

/* ========================================================================== */
/* ZIP reader                                                                 */
/* ========================================================================== */

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(buf) {
	return (crc32Update(0xffffffff, buf) ^ 0xffffffff) >>> 0;
}

/** Running CRC-32 (start with 0xffffffff, finish with ^ 0xffffffff) */
function crc32Update(c, buf) {
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return c;
}

// Limits for one archive (a spectra archive from Gmail is at most 25 MB; unpacked a few GB at most)
const ZIP_MAX_ENTRIES = 20000;
const ZIP_MAX_TOTAL = 16 * 1024 ** 3; // sum of the declared unpacked sizes
const ZIP_MAX_RATIO = 2000; // declared unpacked / packed size of one entry above 1 MB (a "zip bomb")

function zipName(buf, flags) {
	if (flags & 0x800) return buf.toString('utf8');
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(buf);
	} catch (e) {
		return buf.toString('latin1');
	}
}

function openZip(buf) {
	const minPos = Math.max(0, buf.length - 65557);
	let eocd = -1;
	for (let i = buf.length - 22; i >= minPos; i--) {
		if (buf.readUInt32LE(i) === 0x06054b50) {
			eocd = i;
			break;
		}
	}
	if (eocd < 0) throw new Error('not a valid zip file');
	const total = buf.readUInt16LE(eocd + 10);
	const cdOffset = buf.readUInt32LE(eocd + 16);
	if (total === 0xffff || cdOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported');
	const entries = [];
	let p = cdOffset;
	for (let i = 0; i < total; i++) {
		if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('damaged zip directory');
		const flags = buf.readUInt16LE(p + 8);
		const method = buf.readUInt16LE(p + 10);
		const crc = buf.readUInt32LE(p + 16);
		const csize = buf.readUInt32LE(p + 20);
		const usize = buf.readUInt32LE(p + 24);
		const nameLen = buf.readUInt16LE(p + 28);
		const extraLen = buf.readUInt16LE(p + 30);
		const commentLen = buf.readUInt16LE(p + 32);
		const offset = buf.readUInt32LE(p + 42);
		const name = zipName(buf.slice(p + 46, p + 46 + nameLen), flags);
		if (csize === 0xffffffff || usize === 0xffffffff || offset === 0xffffffff)
			throw new Error('ZIP64 archives are not supported');
		entries.push({ name, flags, method, crc, csize, usize, offset });
		p += 46 + nameLen + extraLen + commentLen;
	}
	return entries;
}

/** Refuses archives that would unpack to too much (checked before anything is written) */
function checkZipSize(entries, destDir) {
	if (entries.length > ZIP_MAX_ENTRIES) throw new Error(`too many files in the archive (${entries.length}; at most ${ZIP_MAX_ENTRIES})`);
	let total = 0;
	for (const e of entries) {
		total += e.usize;
		if (e.usize > 1024 ** 2 && e.usize / Math.max(1, e.csize) > ZIP_MAX_RATIO) throw new Error(`implausible compression (${e.name}: ${e.csize} bytes packed, ${e.usize} unpacked)`);
	}
	if (total > ZIP_MAX_TOTAL) throw new Error(`the archive would unpack to ${(total / 1024 ** 3).toFixed(1)} GB (at most ${ZIP_MAX_TOTAL / 1024 ** 3} GB)`);
	try {
		const st = fs.statfsSync(destDir);
		const free = Number(st.bavail) * Number(st.bsize);
		if (Number.isFinite(free) && total > free - 512 * 1024 ** 2) throw new Error(`not enough free disk space for the archive (${(total / 1024 ** 2).toFixed(0)} MB)`);
	} catch (e) {
		if (/free disk space/.test(e.message)) throw e; // statfs unavailable: no check
	}
	return total;
}

/** Creates the folders root/segments… one by one; refuses a folder that is a symbolic link (or junction) */
async function makeDirsNoLinks(root, segments) {
	let dir = root;
	for (const seg of segments) {
		dir = path.join(dir, seg);
		let st = null;
		try {
			st = await fsp.lstat(dir);
		} catch (e) {
			if (e.code !== 'ENOENT') throw e;
		}
		if (st && st.isSymbolicLink()) throw new Error(`refused: ${dir} is a link`);
		if (st && !st.isDirectory()) throw new Error(`refused: ${dir} is not a folder`);
		if (!st) await fsp.mkdir(dir).catch((e) => { if (e.code !== 'EEXIST') throw e; });
	}
	return dir;
}

/**
 * Writes one entry to `target`, streamed (never more than one chunk in memory), stopping as soon as it grows beyond
 * its declared size, and checking the CRC. An existing regular file is replaced; a link at `target` is refused.
 */
async function writeEntry(buf, e, target) {
	if (e.flags & 1) throw new Error(`encrypted entry: ${e.name}`);
	if (e.method !== 0 && e.method !== 8) throw new Error(`unsupported compression method ${e.method}: ${e.name}`);
	const o = e.offset;
	if (o + 30 > buf.length || buf.readUInt32LE(o) !== 0x04034b50) throw new Error(`damaged entry: ${e.name}`);
	const start = o + 30 + buf.readUInt16LE(o + 26) + buf.readUInt16LE(o + 28);
	if (start + e.csize > buf.length) throw new Error(`damaged entry: ${e.name}`);
	const raw = buf.subarray(start, start + e.csize);
	let st = null;
	try {
		st = await fsp.lstat(target);
	} catch (err) {
		if (err.code !== 'ENOENT') throw err;
	}
	if (st && !st.isFile()) throw new Error(`refused: ${target} is ${st.isSymbolicLink() ? 'a link' : 'not a file'}`);
	if (st) await fsp.unlink(target);
	const fh = await fsp.open(target, 'wx'); // a new file: a link put there meanwhile makes this fail
	let written = 0;
	let c = 0xffffffff;
	const put = async (chunk) => {
		written += chunk.length;
		if (written > e.usize) throw new Error(`larger than declared: ${e.name}`);
		c = crc32Update(c, chunk);
		await fh.write(chunk);
	};
	try {
		if (e.method === 0) await put(raw);
		else {
			const inflate = zlib.createInflateRaw({ chunkSize: 1024 * 1024 });
			inflate.end(raw);
			for await (const chunk of inflate) await put(chunk);
		}
		if (written !== e.usize || ((c ^ 0xffffffff) >>> 0) !== e.crc) throw new Error(`checksum mismatch: ${e.name}`);
	} catch (err) {
		await fh.close().catch(() => {});
		await fsp.unlink(target).catch(() => {});
		throw err;
	}
	await fh.close();
}

async function extractZip(buf, entries, destDir) {
	const root = path.resolve(destDir);
	await fsp.mkdir(root, { recursive: true });
	checkZipSize(entries, root);
	const skipped = [];
	for (const e of entries) {
		const clean = e.name.replace(/\\/g, '/');
		const segments = clean.split('/').filter((s) => s !== '' && s !== '.');
		// Windows: also % and ! (cmd.exe would expand %NAME% / !NAME! in a path given to MestReNova or TopSpin)
		const badChars = process.platform === 'win32' ? /[<>:"|?*%!\u0000-\u001f]|[. ]$/ : /[\u0000]/;
		if (clean.startsWith('/') || /^[A-Za-z]:/.test(clean) || segments.includes('..') || !segments.length ||
			segments.some((seg) => badChars.test(seg))) {
			skipped.push(e.name);
			continue;
		}
		const target = path.resolve(root, ...segments);
		if (target !== root && !target.startsWith(root + path.sep)) {
			skipped.push(e.name);
			continue;
		}
		try {
			if (clean.endsWith('/')) {
				await makeDirsNoLinks(root, segments);
				continue;
			}
			await makeDirsNoLinks(root, segments.slice(0, -1));
			await writeEntry(buf, e, target);
		} catch (err) {
			if (!/^refused:/.test(err.message)) throw err;
			skipped.push(`${e.name} (${err.message})`);
		}
	}
	return { names: entries.map((e) => e.name), skipped };
}

/* ========================================================================== */
/* The job: download -> unpack -> open                                        */
/* ========================================================================== */

const SPECTRUM_FILES = [
	['pdata', '1', '1r'],
	['pdata', '1', '2rr'],
	['acqu'],
];

/**
 * The folder of a group of ten experiments: archive MG_Smith400-2026_12 -> "MG_Smith400-2026_10-19"
 * (7172 -> "_7170-7179"), the same grouping as the MestReNova documents "by tens".
 */
function groupFolderName(prefix, num) {
	const n = Number(num);
	if (!Number.isFinite(n)) return `${prefix}_${num}`;
	const from = Math.floor(n / 10) * 10;
	return `${prefix}_${from}-${from + 9}`;
}

/** "MG_Smith400-2026/7222/pdata/1/1r" -> "7222/pdata/1/1r" when the first folder is the archive prefix. */
function stripTop(name, prefix) {
	const n = String(name).replace(/\\/g, '/');
	const i = n.indexOf('/');
	return i > 0 && n.slice(0, i).toLowerCase() === String(prefix).toLowerCase() ? n.slice(i + 1) : name;
}

/** The file MestReNova should open (1r, 2rr or acqu), or null. */
function findSpectrum(extractPath, prefix, num, names) {
	const roots = [path.join(extractPath, prefix, num)];
	for (const n of names) {
		const parts = n.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').split('/');
		let i = parts.indexOf('pdata');
		if (i < 0 && parts[parts.length - 1] === 'acqu') i = parts.length - 1;
		if (i < 0) continue;
		const root = path.join(extractPath, ...parts.slice(0, i));
		if (!roots.includes(root)) roots.push(root);
	}
	for (const root of roots)
		for (const rel of SPECTRUM_FILES) {
			const candidate = path.join(root, ...rel);
			if (fs.existsSync(candidate)) return candidate;
		}
	return null;
}

/** Looks for MestReNova*.exe in dir and (up to `depth` levels) its sub folders. */
function findExeIn(dir, depth) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (e) {
		return null;
	}
	const exact = entries.find((e) => e.isFile() && /^mestrenova\.exe$/i.test(e.name));
	if (exact) return path.join(dir, exact.name);
	if (depth <= 0) return null;
	for (const e of entries) {
		if (!e.isDirectory()) continue;
		const found = findExeIn(path.join(dir, e.name), depth - 1);
		if (found) return found;
	}
	return null;
}

/**
 * The MestReNova program to start: the configured path (a file, or the folder that holds it),
 * otherwise a search in the usual install folders. Returns { exe, detected, looked }.
 */
function resolveMnova(configured, extraBases) {
	const looked = [];
	const conf = String(configured || '').trim().replace(/^"(.*)"$/, '$1');
	if (conf) {
		looked.push(conf);
		try {
			const st = fs.statSync(conf);
			if (st.isFile() || (st.isDirectory() && conf.toLowerCase().endsWith('.app'))) return { exe: conf, detected: false, looked };
			if (st.isDirectory()) {
				const inside = findExeIn(conf, 2);
				if (inside) return { exe: inside, detected: true, looked };
			}
		} catch (e) {
			/* not there: search below */
		}
	}
	const env = process.env;
	const bases = (extraBases || [])
		.concat([env.ProgramW6432, env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs')])
		.concat(process.platform === 'win32' ? ['C:\\Program Files', 'C:\\Program Files (x86)'] : [])
		.filter(Boolean);
	for (const base of new Set(bases)) {
		let names;
		try {
			names = fs.readdirSync(base);
		} catch (e) {
			continue;
		}
		looked.push(base);
		for (const name of names.filter((n) => /^mestrelab/i.test(n))) {
			const found = findExeIn(path.join(base, name), 3);
			if (found) return { exe: found, detected: true, looked };
		}
	}
	return { exe: null, detected: false, looked };
}

/**
 * Every experiment of an unpacked archive (e.g. folders 10, 11, 12 of one sample): the file to open
 * in MestReNova for each (1r, 2rr or acqu), in natural order. [{ file, num }] - num is the
 * experiment number (name of the experiment folder) or null.
 */
function findAllSpectra(extractPath, names) {
	const roots = [];
	for (const n of names) {
		const parts = n.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').split('/');
		let i = parts.indexOf('pdata');
		if (i < 0 && parts[parts.length - 1] === 'acqu') i = parts.length - 1;
		if (i < 0) continue;
		const root = path.join(extractPath, ...parts.slice(0, i));
		if (!roots.includes(root)) roots.push(root);
	}
	roots.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
	const found = [];
	for (const root of roots)
		for (const rel of SPECTRUM_FILES) {
			const candidate = path.join(root, ...rel);
			if (fs.existsSync(candidate)) {
				const last = path.basename(root);
				found.push({ file: candidate, num: /^\d+$/.test(last) ? Number(last) : null });
				break;
			}
		}
	return found;
}

/**
 * Splits spectra into MestReNova documents. 'tens': experiments 10..19 of a spectrometer share a
 * document, 20..29 the next one, and so on. 'each': one document per experiment.
 * items: [{ file, num, freq }]. Returns [[file, ...], ...].
 */
function groupSpectra(items, mode) {
	const groups = new Map();
	items.forEach((it, i) => {
		const key = mode === 'tens' && it.num !== null ? `${it.freq}|${Math.floor(it.num / 10)}` : `single|${i}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(it);
	});
	const byNum = (a, b) => (a.num === null || b.num === null ? 0 : a.num - b.num);
	return Array.from(groups.values())
		.map((g) => g.sort(byNum))
		.sort((a, b) => a[0].freq.localeCompare(b[0].freq, undefined, { numeric: true }) || (a[0].num === null) - (b[0].num === null) || (a[0].num || 0) - (b[0].num || 0))
		.map((g) => g.map((x) => x.file));
}

/**
 * A MestReNova script (.qs) that opens each group of spectra in its own NEW document - the same as
 * pressing Ctrl+N and then opening the files. MestReNova runs the function named like the file
 * when started as: MestReNova.exe script.qs
 */
function buildMnovaScript(groups, name) {
	const ascii = (str) => str.replace(/[\u007f-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
	const data = groups.map((g) => g.map((f) => f.replace(/\\/g, '/')));
	return [
		'// Created by the NMR Downloader plugin - safe to delete.',
		`function ${name}() {`,
		`\tvar groups = ${ascii(JSON.stringify(data))};`,
		'\tfor (var i = 0; i < groups.length; i++) {',
		'\t\tvar dw = new DocumentWindow(Application.mainWindow.newWindow()); // new document, like Ctrl+N',
		'\t\tserialization.open(groups[i]); // all spectra of this group go into it',
		'\t}',
		'}',
		'',
	].join('\n');
}

/** Writes the script into the temp folder (old ones are removed). Returns its path. */
function writeMnovaScript(groups, dir) {
	// a new private folder each time (random name, owner only), so another user of the computer cannot predict or
	// replace the script before MestReNova runs it; folders older than two days are removed
	const base = dir || os.tmpdir();
	try {
		for (const f of fs.readdirSync(base)) {
			const p = path.join(base, f);
			if (/^nmr-downloader-[A-Za-z0-9]{6}$/.test(f) && Date.now() - fs.lstatSync(p).mtimeMs > 2 * 86400 * 1000) fs.rmSync(p, { recursive: true, force: true });
		}
	} catch (e) {
		/* cleanup is optional */
	}
	const folder = fs.mkdtempSync(path.join(base, 'nmr-downloader-'));
	try {
		fs.chmodSync(folder, 0o700);
	} catch (e) {
		/* Windows: the user's temp folder is private already */
	}
	const name = `nmr_downloader_${Date.now()}`;
	const file = path.join(folder, name + '.qs');
	fs.writeFileSync(file, buildMnovaScript(groups, name), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
	return file;
}

function openInMnova(mnovaPath, targets, log) {
	const files = [].concat(targets);
	const r = resolveMnova(mnovaPath);
	if (!r.exe) {
		log(`MestReNova not found at "${mnovaPath || '(empty)'}" and not in the usual install folders. Not opened: ${files.join(' ')}\n` +
			'Check the real path (right-click the MestReNova shortcut > Open file location) and press "Check MestReNova" in the plugin settings.');
		return;
	}
	if (r.detected) log(`MestReNova found at ${r.exe} (the configured path was not usable)`);
	let child;
	if (process.platform === 'win32') {
		// the same as Python's subprocess.Popen([exe, file], shell=True): cmd /c "exe" "file"
		child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${r.exe}" ${files.map((f) => `"${f}"`).join(' ')}"`], {
			detached: true,
			stdio: 'ignore',
			windowsHide: true,
			windowsVerbatimArguments: true,
		});
	} else if (process.platform === 'darwin' && r.exe.toLowerCase().endsWith('.app')) {
		child = spawn('open', ['-a', r.exe, ...files], { detached: true, stdio: 'ignore' });
	} else {
		child = spawn(r.exe, files, { detached: true, stdio: 'ignore' });
	}
	child.on('error', (e) => console.error('[NMR Downloader] Could not start MestReNova: ' + e.message));
	child.unref();
}

/* ========================================================================== */
/* Bruker TopSpin                                                             */
/* ========================================================================== */

/*
 * TopSpin is started with a data set as `topspin -j TOP_DATA=<path>` (TopSpin User Manual 2.1) and,
 * once running, takes commands from `prog/bin/sendgui <command>` (manual 3.5). sendgui fails with
 * exit code 1 ("Contact to GUI failed ... corbaloc:iiop:127.0.0.1:<port>/...") when TopSpin is not
 * running: then TopSpin is started with the first spectrum, and the others are sent once its port
 * answers. Each spectrum opens in its own window (`rew`), so the data set already on screen stays.
 * Tested on Windows 11 with TopSpin Processing 5.0.0.
 */

/** The TopSpin installation: { dir, start, sendgui, looked } (start/sendgui null when not found). */
function resolveTopSpin(configured) {
	const looked = [];
	const win = process.platform === 'win32';
	const startName = win ? 'topspin.cmd' : 'topspin';
	const inDir = (dir) => {
		const start = path.join(dir, startName);
		const sendguis = win ? [path.join(dir, 'prog', 'bin', 'sendgui.cmd')] : [path.join(dir, 'prog', 'bin', 'sendgui'), path.join(dir, 'prog', 'bin', 'scripts', 'sendgui')];
		if (!fs.existsSync(start)) return null;
		return { dir, start, sendgui: sendguis.find((f) => fs.existsSync(f)) || null };
	};
	const conf = String(configured || '').trim().replace(/^"(.*)"$/, '$1');
	if (conf) {
		looked.push(conf);
		try {
			const st = fs.statSync(conf);
			const found = inDir(st.isDirectory() ? conf : path.dirname(conf));
			if (found) return Object.assign(found, { detected: false, looked });
		} catch (e) {
			/* not there: search below */
		}
	}
	const bases = win ? ['C:\\Bruker', 'D:\\Bruker'] : ['/opt', '/opt/Bruker', '/Applications'];
	for (const base of bases) {
		let names;
		try {
			names = fs.readdirSync(base);
		} catch (e) {
			continue;
		}
		looked.push(base);
		// the newest version first: TopSpin5.0.0, TopSpinProcessing5.0.0, topspin4.3.0 ...
		const cands = names.filter((n) => /^topspin/i.test(n)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
		for (const name of cands) {
			const found = inDir(path.join(base, name));
			if (found) return Object.assign(found, { detected: true, looked });
		}
	}
	return { dir: null, start: null, sendgui: null, detected: false, looked };
}

/** The TopSpin data set of a spectrum file: .../expno/pdata/1 for 1r/2rr, the expno folder's pdata/1 (or the expno) for acqu. */
function topspinDataset(file) {
	const base = path.basename(file).toLowerCase();
	if (base === '1r' || base === '2rr' || base === '3rrr') return path.dirname(file);
	if (base === 'acqu' || base === 'acqus' || base === 'fid' || base === 'ser') {
		const expno = path.dirname(file);
		const p1 = path.join(expno, 'pdata', '1');
		return fs.existsSync(p1) ? p1 : expno;
	}
	return file; // a folder already
}

/**
 * Spectra in a folder: a data set itself (expno with pdata/1 or acqu, or a pdata/N folder), else every
 * experiment folder below it (two levels: sample folder > expno), in natural order.
 */
function spectraInFolder(dir) {
	const isExpno = (d) => fs.existsSync(path.join(d, 'pdata')) || fs.existsSync(path.join(d, 'acqu')) || fs.existsSync(path.join(d, 'acqus'));
	const isProcno = (d) => ['1r', '2rr', '3rrr', 'procs'].some((f) => fs.existsSync(path.join(d, f)));
	if (isProcno(dir) || isExpno(dir)) return [isProcno(dir) ? dir : topspinDataset(path.join(dir, 'acqu'))];
	const subdirs = (d) => {
		try {
			return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(d, e.name))
				.sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
		} catch (e) {
			return [];
		}
	};
	const found = [];
	for (const a of subdirs(dir)) {
		if (isExpno(a)) found.push(topspinDataset(path.join(a, 'acqu')));
		else for (const b of subdirs(a)) if (isExpno(b)) found.push(topspinDataset(path.join(b, 'acqu')));
	}
	return found;
}

/** Numbers in a note field such as `**NMR_id**:: 7180, 7190` (several lines with the field are read too). */
function noteFieldNumbers(text, field) {
	// one line only ([ \t], not \s), and no two adjacent quantifiers over the same characters (no slow backtracking)
	const re = new RegExp(`^(?:[ \\t>_-]|\\*(?=[ \\t]))*\\*{0,2}${field}\\*{0,2}::(.*)$`, 'gim');
	const out = [];
	let m;
	while ((m = re.exec(String(text || ''))) !== null) for (const x of m[1].match(/\d+/g) || []) out.push(Number(x));
	return Array.from(new Set(out));
}

/**
 * The spectra of an NMR id (the first experiment number of a sample, e.g. 7180) in the spectra folders:
 * the sample folder "<prefix>_7180-7189" (Folders by tens), otherwise the experiment folders 7180-7189
 * one level below a folder (<prefix>/7180, as unpacked before).
 */
function spectraForId(bases, id) {
	const g = Math.floor(id / 10) * 10;
	const groupRe = new RegExp(`_${g}-${g + 9}$`);
	const dirs = (d) => {
		try {
			return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(d, e.name));
		} catch (e) {
			return [];
		}
	};
	const groups = [];
	const loose = [];
	for (const base of bases) {
		for (const a of dirs(base)) {
			if (groupRe.test(path.basename(a))) groups.push(a);
			else {
				const n = Number(path.basename(a));
				if (/^\d+$/.test(path.basename(a)) && n >= g && n <= g + 9) loose.push(a);
				else for (const b of dirs(a)) {
					const k = path.basename(b);
					if (/^\d+$/.test(k) && Number(k) >= g && Number(k) <= g + 9) loose.push(b);
				}
			}
		}
	}
	return groups.length ? groups : loose.sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
}

/**
 * Code and number of a reaction note: from the file name (Exp_15 -> Exp, 15), otherwise from the first
 * idN field of the note (`**id1**:: 0015`) with the code from the title.
 */
function noteCodeNumber(basename, text) {
	const m = /^([A-Za-z][A-Za-z0-9-]*?)_0*(\d+)\b/.exec(String(basename || '').trim());
	if (m) return { code: m[1], number: Number(m[2]) };
	const id = /^(?:[ \t>_-]|\*(?=[ \t]))*\*{0,2}id\d*\*{0,2}::[ \t]*0*(\d+)/im.exec(String(text || ''));
	const t = /^#\s+([A-Za-z][A-Za-z0-9-]*?)_\d+/m.exec(String(text || ''));
	return id ? { code: t ? t[1] : '', number: Number(id[1]) } : null;
}

/** Folder-name start of a note's spectra: notebook number + note number with `digits` digits (01 + 0015) */
function pagePrefix(notebookNumber, noteNumber, digits) {
	return String(notebookNumber).trim() + String(noteNumber).padStart(Number(digits) || 4, '0');
}

/** Folders (in the bases and one level below them) whose name starts with `prefix` */
function foldersStartingWith(bases, prefix) {
	const out = [];
	const dirs = (d) => {
		try {
			return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(d, e.name));
		} catch (e) {
			return [];
		}
	};
	for (const base of bases)
		for (const a of dirs(base)) {
			if (path.basename(a).startsWith(prefix)) out.push(a);
			else for (const b of dirs(a)) if (path.basename(b).startsWith(prefix)) out.push(b);
		}
	return Array.from(new Set(out)).sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
}

/** Runs sendgui: resolves { code, out } (code 1 and "Contact to GUI failed" when TopSpin is not running). */
function topspinSend(ts, command, dataset, spawnFn) {
	const run = spawnFn || spawn;
	return new Promise((resolve) => {
		let child;
		const opts = { cwd: ts.dir, windowsHide: true };
		if (process.platform === 'win32')
			child = run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${ts.sendgui}" ${command} "${dataset}""`], Object.assign(opts, { windowsVerbatimArguments: true }));
		else child = run(ts.sendgui, [command, dataset], opts);
		let out = '';
		const timer = setTimeout(() => {
			try {
				child.kill();
			} catch (e) {
				/* gone */
			}
			resolve({ code: -1, out: out + '\n(sendgui did not answer in 30 s)' });
		}, 30000);
		if (child.stdout) child.stdout.on('data', (d) => (out += d));
		if (child.stderr) child.stderr.on('data', (d) => (out += d));
		child.on('error', (e) => {
			clearTimeout(timer);
			resolve({ code: -1, out: e.message });
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			resolve({ code, out });
		});
	});
}

/** Starts TopSpin with a data set (TopSpin keeps running after Obsidian is closed). */
function topspinStart(ts, dataset, spawnFn) {
	const run = spawnFn || spawn;
	let child;
	if (process.platform === 'win32')
		// Not detached: a detached cmd has no console, so every console program run by topspin.cmd opened a
		// window of its own. With a hidden console they share it; TopSpin itself is started by topspin.cmd and
		// keeps running after Obsidian is closed (Node lets grandchildren leave its job).
		child = run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${ts.start}" -j TOP_DATA="${dataset}""`], {
			cwd: ts.dir,
			stdio: 'ignore',
			windowsHide: true,
			windowsVerbatimArguments: true,
		});
	else child = run(ts.start, ['-j', `TOP_DATA=${dataset}`], { cwd: ts.dir, detached: true, stdio: 'ignore' });
	child.on('error', (e) => console.error('[NMR Downloader] Could not start TopSpin: ' + e.message));
	if (child.unref) child.unref();
}

/** Waits until something listens on 127.0.0.1:port (TopSpin's command port), up to `ms`. */
function waitForPort(port, ms) {
	const until = Date.now() + ms;
	return new Promise((resolve) => {
		const tryOnce = () => {
			const sock = net.connect({ host: '127.0.0.1', port });
			sock.once('connect', () => {
				sock.destroy();
				resolve(true);
			});
			sock.once('error', () => {
				sock.destroy();
				if (Date.now() > until) resolve(false);
				else setTimeout(tryOnce, 1000);
			});
		};
		tryOnce();
	});
}

/**
 * Opens spectra (1r / 2rr / acqu files or data-set folders) in TopSpin: through the running TopSpin,
 * else by starting it with the first one. Returns the number opened.
 */
async function openInTopSpin(topspinPath, targets, log, hooks) {
	const h = hooks || {};
	const ts = resolveTopSpin(topspinPath);
	if (!ts.start) {
		log(`TopSpin not found at "${topspinPath || '(empty)'}" or in ${ts.looked.join(', ')}. Set the TopSpin folder (with topspin.cmd) in the plugin settings.`);
		return 0;
	}
	if (ts.detected) log(`TopSpin found in ${ts.dir}`);
	const sets = Array.from(new Set([].concat(targets).flatMap((t) => {
		let dir = false;
		try {
			dir = fs.statSync(t).isDirectory();
		} catch (e) {
			/* a file that is not there yet: as given */
		}
		return dir ? spectraInFolder(t) : [topspinDataset(t)];
	}))).sort((x, y) => y.localeCompare(x, undefined, { numeric: true })); // last experiment first: 7222, 7221, 7220
	if (!sets.length) {
		log(`No Bruker spectra (pdata or acqu) found in ${[].concat(targets).join('  ')}`);
		return 0;
	}
	let rest = sets;
	if (ts.sendgui) {
		const first = await topspinSend(ts, 'rew', sets[0], h.spawn);
		if (first.code === 0) {
			log(`Opened in TopSpin: ${sets[0]}`);
			rest = sets.slice(1);
		} else {
			const port = Number((/127\.0\.0\.1:(\d+)/.exec(first.out) || [])[1]) || 5650;
			log(`TopSpin is not running: starting it with ${sets[0]}`);
			topspinStart(ts, sets[0], h.spawn);
			rest = sets.slice(1);
			// wait until TopSpin is up (also for one spectrum, so the "please wait" notice stays until then)
			if (h.status) h.status(`Starting TopSpin${rest.length ? `, then ${rest.length} more spectra` : ''} (this can take a minute)`);
			const ready = await (h.waitForPort || waitForPort)(port, h.startWaitMs || 180000);
			if (!ready) {
				log(`TopSpin did not answer on port ${port}${rest.length ? `; not opened: ${rest.join('  ')}` : ''}`);
				return 1;
			}
			if (rest.length) await sleepMs(h.settleMs === undefined ? 5000 : h.settleMs); // the window is up a little after the port
		}
	} else {
		log(`sendgui not found in ${ts.dir}; starting TopSpin with the first spectrum only`);
		topspinStart(ts, sets[0], h.spawn);
		return 1;
	}
	let n = sets.length - rest.length;
	for (const ds of rest) {
		if (h.status) h.status(`Opening in TopSpin ${n + 1} of ${sets.length}: ${path.basename(path.dirname(path.dirname(ds))) || ds}`);
		const r = await topspinSend(ts, 'rew', ds, h.spawn);
		if (r.code === 0) {
			n++;
			log(`Opened in TopSpin: ${ds}`);
		} else log(`TopSpin did not open ${ds}: ${r.out.trim().split('\n')[0]}`);
	}
	return n;
}

async function downloadArchives(cfg, log, hooks) {
	await fsp.mkdir(cfg.downloadFolder, { recursive: true });
	const gmail = (hooks && hooks.gmail) || makeGmail(cfg, hooks); // hooks.gmail: a fake mailbox for tests
	const saved = [];
	let failure = null;
	try {
		await downloadFromMessages(gmail, cfg, log, saved);
	} catch (e) {
		failure = e; // a broken attachment must not stop the "Sample Measured" mails from being marked read
	}
	if (cfg.markOtherRead) {
		try {
			await markOtherRead(gmail, cfg, log, saved);
		} catch (e) {
			if (!failure) failure = e;
			else log(`Could not mark other messages as read: ${e.message}`);
		}
	}
	// the mails are marked as read only after their archives were unpacked (runNmrDownload); an error here still lets
	// the archives saved so far be unpacked and their mails be marked
	Object.defineProperty(saved, 'gmail', { value: gmail, enumerable: false });
	if (failure) Object.defineProperty(saved, 'failure', { value: failure, enumerable: false });
	return saved;
}

/**
 * Saves the matching archives of the unread mails from a trusted (and confirmed) sender. Nothing is marked as read
 * here: `saved.messages` = [{ id, files }] tells runNmrDownload which mail brought which archives.
 */
async function downloadFromMessages(gmail, cfg, log, saved) {
	if (!saved.messages) Object.defineProperty(saved, 'messages', { value: [], enumerable: false });
	const ids = await gmail.listIds(searchQuery());
	if (!ids.length) log('No unread messages with attachments');
	const wanted = cfg.username.toLowerCase();
	let fromSender = 0;
	for (const id of ids) {
		const message = await gmail.getMessage(id);
		if (!isTrustedSender(headerValue(message, 'from'), cfg.senders)) continue; // not a trusted sender
		fromSender++;
		if (cfg.checkSenderAuth !== false) {
			const auth = senderAuthentication(message);
			if (!auth.ok) {
				// a forged From: nothing is downloaded, the mail stays unread for the user to look at
				if (!saved.skipped) Object.defineProperty(saved, 'skipped', { value: new Set(), enumerable: false });
				saved.skipped.add(id);
				log(`Skipped a mail from ${headerValue(message, 'from')} ("${headerValue(message, 'subject').slice(0, 60)}"): Gmail did not confirm the sender (${auth.detail}). If your NMR service is genuine, switch off "Check the sender" in the settings.`);
				continue;
			}
		}
		const files = [];
		// every archive of the mail, also one for another user: such a mail is never marked read by markOtherRead
		const zips = messageFiles(message).map((f) => String(f.filename || '')).filter((n) => /\.zip$/i.test(n));
		for (const f of messageFiles(message)) {
			const fname = safeFileName(f.filename);
			// like the old script: a .zip with the user name in its name
			if (!fname || !/\.zip$/i.test(fname) || !fname.toLowerCase().includes(wanted)) continue;
			const data = f.data || (await gmail.getAttachment(id, f.attachmentId));
			if (!data.length) continue;
			await fsp.writeFile(path.join(cfg.downloadFolder, fname), data);
			saved.push(fname);
			files.push(fname);
			log(`Downloaded: ${fname}`);
		}
		saved.messages.push({ id, files, zips, subject: headerValue(message, 'subject') });
	}
	if (ids.length && !fromSender) log(`No unread messages with attachments from ${cfg.senderEmail}`);
}

/** Gmail search terms for the senders: an address as it is, "@uni.edu" as "uni.edu" (each mail is checked afterwards) */
function senderSearch(senders) {
	return senders.map((x) => (x.startsWith('@') ? x.slice(1) : x)).join(' OR ');
}

/**
 * "Mark other mails from the sender as read": the sender's unread mails that bring no archive at all — "Sample
 * Measured" (no attachment) and "ICON-NMR Print" (a PDF) — are marked as read. A mail with a .zip attachment is never
 * marked here: its archive is downloaded and the mail marked once unpacked, or it stays unread and is listed (also a
 * new archive that arrives during the run). A mail whose sender Gmail did not confirm stays unread (with "Check the
 * sender" on). seen: the mails already read in this run by downloadFromMessages (id -> { zips }), not fetched again.
 * Before 1.8.7 only mails without any attachment were found (Gmail's -has:attachment), so the PDF printouts stayed
 * unread.
 */
async function markOtherRead(gmail, cfg, log, seen) {
	const known = new Map(((seen && seen.messages) || []).map((m) => [m.id, m]));
	const ids = await gmail.listIds(`is:unread from:(${senderSearch(cfg.senders)})`);
	const other = [];
	for (const id of ids) {
		const m = known.get(id);
		if (m) {
			if (!m.zips.length) other.push(id); // trusted and confirmed already, no archive in it
			continue;
		}
		if (seen && seen.skipped && seen.skipped.has(id)) continue; // a mail whose sender Gmail did not confirm
		const message = await gmail.getMessage(id);
		if (!isTrustedSender(headerValue(message, 'from'), cfg.senders)) continue;
		if (cfg.checkSenderAuth !== false && !senderAuthentication(message).ok) {
			log(`Left unread: "${headerValue(message, 'subject').slice(0, 60)}" — Gmail did not confirm the sender`);
			continue;
		}
		if (messageFiles(message).some((f) => /\.zip$/i.test(String(f.filename || '')))) continue; // an archive: never here
		other.push(id);
	}
	for (let i = 0; i < other.length; i += 1000) await gmail.markManyRead(other.slice(i, i + 1000));
	if (other.length) log(`Marked ${other.length} other message(s) from ${cfg.senderEmail} as read (no archive in them)`);
}

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Unpacks and opens archives. `only` = names of the archives downloaded in this run: nothing else
 * in the download folder is touched. Without `only` every .zip in the folder is processed.
 */
/** Unpacks and opens; returns the Set of the archive names that were unpacked */
async function processArchives(cfg, log, only) {
	const unpacked = new Set();
	let zips;
	if (only) {
		zips = Array.from(new Set(only));
		if (!zips.length) {
			log('No new archives to unpack');
			return unpacked;
		}
	} else {
		try {
			zips = (await fsp.readdir(cfg.downloadFolder)).filter((n) => /\.zip$/i.test(n));
		} catch (e) {
			log(`Cannot read ${cfg.downloadFolder}: ${e.message}`);
			return unpacked;
		}
		if (!zips.length) {
			log(`No zip archives in ${cfg.downloadFolder}`);
			return unpacked;
		}
	}
	zips.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
	let launched = 0;
	const launch = async (targets) => {
		if (launched++ && cfg.launchDelayMs > 0) await sleepMs(cfg.launchDelayMs); // let MestReNova take the previous file first
		log(`Opening${targets.length > 1 ? ` (one document, ${targets.length} spectra)` : ''}: ${targets.join('  ')}`);
		openInMnova(cfg.mnovaPath, targets, log);
	};
	const pending = []; // spectra of all archives of this run, opened together when everything is unpacked
	const openGroups = async (groups) => {
		if (cfg.openMode === 'tens') {
			// one MestReNova script: a new document (Ctrl+N) for each group, the spectra of the group opened into it
			const file = writeMnovaScript(groups, cfg.scriptFolder);
			for (const g of groups) log(`Opening (new document, ${g.length} spectr${g.length > 1 ? 'a' : 'um'}): ${g.join('  ')}`);
			openInMnova(cfg.mnovaPath, [file], log);
		} else for (const g of groups) await launch(g);
	};
	for (const zipName of zips) {
		const zipPath = path.join(cfg.downloadFolder, zipName);
		const m = cfg.archiveRegex.exec(zipName.slice(0, -4));
		if (!m) {
			log(`Skipped (name does not match ${cfg.prefixesText}_${cfg.username}<MHz>-<year>_<number>): ${zipName}`);
			continue;
		}
		const { prefix, freq, num } = m.groups;
		const bases = destinations(cfg, freq);
		// experiments of one sample (10-19, 20-29 ...) together in one folder; TopSpin opens that folder
		const targets = cfg.groupFolders ? bases.map((b) => path.join(b, groupFolderName(prefix, num))) : bases;
		if (!bases.length) {
			log(`Skipped ${zipName}: no folder for ${freq} MHz (storage mode: ${cfg.mode})`);
			continue;
		}
		let entryNames;
		try {
			const buf = await fsp.readFile(zipPath);
			let entries = openZip(buf);
			// in a sample folder the archive's own top folder (MG_Smith400-2026/7222/...) is left out: <sample folder>/7222/...
			if (cfg.groupFolders) entries = entries.map((e) => Object.assign({}, e, { name: stripTop(e.name, prefix) }));
			entryNames = entries.map((e) => e.name);
			for (const dir of targets) {
				const res = await extractZip(buf, entries, dir);
				for (const s of res.skipped) log(`Skipped unsafe path inside ${zipName}: ${s}`);
			}
		} catch (e) {
			log(`Could not unpack ${zipName}: ${e.message}`);
			continue;
		}
		log(`Unpacked: ${zipName} -> ${targets.join(' and ')}`);
		unpacked.add(zipName);

		if (cfg.openMode === 'name') {
			const target = findSpectrum(targets[0], prefix, num, entryNames);
			if (!target) log(`No 1r / 2rr / acqu found for ${prefix}_${num} in ${targets[0]}`);
			else if (cfg.openWith === 'topspin') pending.push({ freq, file: target, num: null, folder: targets[0] });
			else if (cfg.openInMnova) await launch([target]);
		} else {
			const all = findAllSpectra(targets[0], entryNames);
			if (!all.length) log(`No 1r / 2rr / acqu found in ${zipName} (${targets[0]})`);
			else for (const it of all) pending.push(Object.assign({ freq, folder: targets[0] }, it));
		}
		if (!cfg.keepZip) {
			try {
				await fsp.unlink(zipPath);
			} catch (e) {
				log(`Could not delete ${zipName}: ${e.message}`);
			}
		}
	}
	if (cfg.openWith === 'topspin' && pending.length) {
		// with group folders: the whole folder of each group (also experiments of the sample downloaded earlier)
		const what = cfg.groupFolders ? Array.from(new Set(pending.map((p) => p.folder))) : pending.map((p) => p.file);
		await openInTopSpin(cfg.topspinPath, what, log, cfg.topspinHooks);
	}
	else if (cfg.openInMnova && pending.length) await openGroups(groupSpectra(pending, cfg.openMode));
	return unpacked;
}

async function runNmrDownload(cfg, log, hooks) {
	const saved = await downloadArchives(cfg, log, hooks);
	const unpacked = await processArchives(cfg, log, saved); // only what was just downloaded
	// a mail is marked as read only when every archive it brought was saved and unpacked; a mail whose archive is for
	// another user or could not be unpacked stays unread and is listed; a mail that brings no archive at all (the PDF
	// printout) is marked by markOtherRead when that setting is on, and listed when it is off
	const done = []; const kept = [];
	for (const m of saved.messages || []) (m.files.length && m.files.every((f) => unpacked.has(f)) ? done : kept).push(m);
	for (const m of done) await saved.gmail.markRead(m.id);
	for (const m of kept) if (!(cfg.markOtherRead && !m.zips.length)) log(`Left unread: "${String(m.subject || '').slice(0, 60)}" — ${m.files.length ? `${m.files.join(', ')} not unpacked` : `no archive for ${cfg.username} in it`}`);
	if (saved.failure) throw saved.failure;
}

/** Checks the Google sign-in and counts the unread messages - used by the "Test" button. */
async function testMailLogin(mail, hooks) {
	const gmail = makeGmail(mail, hooks);
	const profile = await gmail.profile();
	const ids = await gmail.listIds(searchQuery());
	// the sender check on the latest mails from the sender (read only, nothing is marked)
	const fromSender = await gmail.listIds(`from:(${mail.senders.join(' OR ')})`, 5).catch(() => []);
	const checked = [];
	for (const id of fromSender.slice(0, 5)) {
		try {
			const message = await gmail.getMessage(id);
			if (isTrustedSender(headerValue(message, 'from'), mail.senders)) checked.push(senderAuthentication(message));
		} catch (e) {
			/* the check is informative only */
		}
	}
	return { account: profile.emailAddress || '', count: ids.length, auth: checked };
}

/* ========================================================================== */
/* Obsidian plugin                                                            */
/* ========================================================================== */

class NmrDownloaderPlugin extends obsidian.Plugin {
	async onload() {
		await this.loadSettings();
		this.addRibbonIcon('download', 'Download NMR spectra', () => this.runDownload());
		this.addCommand({
			id: 'download-nmr',
			name: 'Download NMR spectra',
			callback: () => this.runDownload(),
		});
		this.addCommand({
			id: 'open-note-in-topspin',
			name: 'Open the NMR spectra of this note in TopSpin',
			callback: () => this.openNoteInTopSpin(),
		});
		this.addCommand({
			id: 'open-folder-in-topspin',
			name: 'Open a Bruker spectrum folder in TopSpin',
			callback: () => this.askAndOpenTopSpin(),
		});
		this.addSettingTab(new NmrSettingTab(this.app, this));
		this.register(() => this.clearGlobalShortcut());
		this.app.workspace.onLayoutReady(() => {
			const r = this.applyGlobalShortcut();
			if (!r.ok) new obsidian.Notice(`NMR Downloader: the shortcut ${this.settings.globalShortcut} could not be set up: ${r.why}`, 12000);
		});
	}

	/** Electron's globalShortcut (main process, through remote); tests give their own */
	globalShortcutApi() {
		if (this.testHooks && this.testHooks.globalShortcut) return this.testHooks.globalShortcut;
		const electron = require('electron');
		const remote = electron.remote || require('@electron/remote');
		return remote.globalShortcut;
	}

	/**
	 * Registers settings.globalShortcut for the whole computer: the download then starts from any program, also with
	 * Obsidian minimized (while it runs). { ok, why } — why: the keys are taken (another program, or this plugin in
	 * another open vault), not a key combination, or no system shortcuts in this Obsidian.
	 */
	applyGlobalShortcut() {
		this.clearGlobalShortcut();
		const acc = normalizeAccelerator(this.settings.globalShortcut);
		if (!acc) return { ok: true, off: true };
		let gs;
		try {
			gs = this.globalShortcutApi();
		} catch (e) {
			return { ok: false, why: 'this Obsidian version does not let plugins set system shortcuts' };
		}
		let done = false;
		try {
			done = gs.register(acc, () => this.runDownload({ fromShortcut: true }));
		} catch (e) {
			return { ok: false, why: `"${acc}" is not a key combination (${e.message})` };
		}
		if (!done) return { ok: false, why: 'the keys are taken by another program or by NMR Downloader in another open vault' };
		this.registeredShortcut = acc;
		return { ok: true, acc };
	}

	clearGlobalShortcut() {
		if (!this.registeredShortcut) return;
		try {
			this.globalShortcutApi().unregister(this.registeredShortcut);
		} catch (e) {
			/* Obsidian is closing */
		}
		this.registeredShortcut = null;
	}

	/** A message of the system (for a download started with the shortcut while Obsidian is in the background) */
	systemNotify(text) {
		if (this.testHooks && this.testHooks.notify) return this.testHooks.notify(text);
		try {
			new window.Notification('NMR Downloader', { body: String(text).slice(0, 300) });
		} catch (e) {
			/* no system messages: the notices in Obsidian remain */
		}
	}

	/**
	 * Opens Bruker spectra in TopSpin (for buttons and scripts too):
	 * app.plugins.plugins['nmr-downloader'].openTopSpin('C:\\NMR\\400\\MG_...\\10')
	 * paths: a data-set folder (expno or expno/pdata/1), a folder with several experiments, a 1r / 2rr / acqu file, or a list.
	 */
	async openTopSpin(paths) {
		const lines = [];
		const log = (m) => {
			lines.push(m);
			console.log('[NMR Downloader]', m);
		};
		const list = [].concat(paths).map(cleanPath).filter(Boolean);
		const missing = list.filter((p) => !fs.existsSync(p));
		if (missing.length) {
			new obsidian.Notice('TopSpin: not found:\n' + missing.join('\n'), 10000);
			return 0;
		}
		const waiting = new obsidian.Notice('TopSpin: opening the spectra, please wait...', 0);
		const status = (m) => waiting.setMessage('TopSpin: ' + m + ' - please wait...');
		let n = 0;
		try {
			n = await openInTopSpin(this.settings.topspinPath, list, log, { status });
		} finally {
			waiting.hide();
		}
		new obsidian.Notice(lines.join('\n') || `Opened ${n} in TopSpin`, 8000);
		return n;
	}

	/**
	 * Opens in TopSpin the spectra named in the active note: `NMR_id:: 7180, 7190` (each id = one sample,
	 * its experiments 7180-7189), looked for in the spectra folders of the settings; `frequency:: 400`
	 * in the note limits the search to the 400 MHz folder.
	 */
	async openNoteInTopSpin(file) {
		const f = file || this.app.workspace.getActiveFile();
		if (!f) {
			new obsidian.Notice('TopSpin: open a reaction note first');
			return 0;
		}
		const text = await this.app.vault.cachedRead(f);
		const ids = noteFieldNumbers(text, 'NMR_id');
		const s = this.settings;
		const found = [];
		let byPage = null;
		if (s.pageFolders) {
			byPage = this.pageSpectra(f.basename, text);
			if (byPage.error && !ids.length) {
				new obsidian.Notice('TopSpin: ' + byPage.error, 10000);
				return 0;
			}
			if (byPage.error) new obsidian.Notice('TopSpin: ' + byPage.error, 10000);
			if (byPage.found) found.push(...byPage.found);
			if (byPage.found && !byPage.found.length && !ids.length) {
				new obsidian.Notice(`TopSpin: no folders starting with ${byPage.prefix} in\n${byPage.bases.join('\n')}`, 10000);
				return 0;
			}
			if (!ids.length) return this.openTopSpin(found);
		}
		if (!ids.length) {
			new obsidian.Notice('TopSpin: no NMR_id in this note (e.g. NMR_id:: 7180, 7190)', 8000);
			return 0;
		}
		const freq = String(noteFieldNumbers(text, 'frequency')[0] || '');
		const rows = (s.frequencyFolders || []).filter((r) => cleanPath(r.folder));
		let bases = rows.filter((r) => !freq || String(r.freq).trim() === freq).map((r) => cleanPath(r.folder));
		if (!bases.length) bases = rows.map((r) => cleanPath(r.folder));
		if (cleanPath(s.singleFolder)) bases.push(cleanPath(s.singleFolder));
		bases = Array.from(new Set(bases));
		if (!bases.length) {
			new obsidian.Notice('TopSpin: set the spectra folders in the NMR Downloader settings first', 8000);
			return 0;
		}
		const missing = [];
		for (const id of ids) {
			const hits = spectraForId(bases, id);
			if (hits.length) found.push(...hits);
			else missing.push(id);
		}
		if (missing.length) new obsidian.Notice(`TopSpin: no spectra found for NMR_id ${missing.join(', ')} in\n${bases.join('\n')}`, 10000);
		if (!found.length) return 0;
		return this.openTopSpin(Array.from(new Set(found)));
	}

	/** Spectrum folders named after the notebook page of a note: { prefix, bases, found } or { error } */
	pageSpectra(basename, text) {
		const s = this.settings;
		const cn = noteCodeNumber(basename, text);
		if (!cn) return { error: `cannot read the note code and number from "${basename}" (e.g. Exp_15)` };
		const nb = (s.notebooks || []).find((r) => String(r.code || '').trim().toLowerCase() === cn.code.toLowerCase());
		if (!nb || !String(nb.number || '').trim())
			return { error: `no notebook number for the code "${cn.code}" in the NMR Downloader settings (TopSpin > Notebooks)` };
		let bases = String(s.pageSearchFolders || '').split(/\r?\n/).map(cleanPath).filter(Boolean);
		if (!bases.length) {
			bases = (s.frequencyFolders || []).map((r) => cleanPath(r.folder)).filter(Boolean);
			if (cleanPath(s.singleFolder)) bases.push(cleanPath(s.singleFolder));
		}
		bases = Array.from(new Set(bases));
		if (!bases.length) return { error: 'set the folders with the spectra in the NMR Downloader settings (TopSpin > Folders with these spectra)' };
		const prefix = pagePrefix(nb.number, cn.number, s.pageDigits);
		return { prefix, bases, found: foldersStartingWith(bases, prefix) };
	}

	/** Asks for a folder path (paste from Explorer) and opens it in TopSpin. */
	askAndOpenTopSpin() {
		const plugin = this;
		const modal = new obsidian.Modal(this.app);
		modal.titleEl.setText('Open in TopSpin');
		let value = '';
		new obsidian.Setting(modal.contentEl)
			.setName('Spectrum folder or file')
			.setDesc('An experiment folder (e.g. ...\\7170), a folder with several experiments (each opens in its own window), a pdata\\1 folder or a 1r file. Paste the path from Explorer (Shift + right-click > Copy as path).')
			.addText((t) => {
				t.inputEl.addClass('nmr-downloader-wide');
				t.onChange((v) => (value = v));
				t.inputEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						modal.close();
						plugin.openTopSpin(value);
					}
				});
			});
		new obsidian.Setting(modal.contentEl).addButton((b) =>
			b.setButtonText('Open').setCta().onClick(() => {
				modal.close();
				plugin.openTopSpin(value);
			})
		);
		modal.open();
	}

	/** Local storage of this computer for this vault (the sign-in, the account, the credentials path) */
	secrets() {
		if (!this.secretStore) this.secretStore = new SecretStore('nmr-downloader:' + this.app.vault.getName(), this.testHooks && this.testHooks.secrets);
		return this.secretStore;
	}

	/** Loads the sign-in kept on this computer into the settings object (in memory only) */
	readLocalSignIn() {
		const st = this.secrets();
		const tok = st.readSecret('googleRefreshToken');
		this.settings.googleRefreshToken = tok.value;
		this.settings.googleAccount = st.get('googleAccount');
		for (const k of LOCAL_PATHS) this.settings[k] = st.get(k);
		this.signInState = tok.state; // none | encrypted | plain | unreadable
		if (tok.state === 'unreadable') {
			this.settings.googleAccount = '';
			new obsidian.Notice('NMR Downloader: sign in again: the saved Google sign-in cannot be read on this computer.', 15000);
		}
	}

	/** Keeps a new sign-in (token and account) on this computer; false when it could not be stored */
	writeSignIn(token, account) {
		const st = this.secrets();
		const state = st.writeSecret('googleRefreshToken', token || '');
		if (state === 'failed') return false;
		st.set('googleAccount', token ? account || '' : '');
		this.settings.googleRefreshToken = token || '';
		this.settings.googleAccount = token ? account || '' : '';
		this.signInState = token ? state : 'none';
		if (state === 'plain' && !st.get('plainWarned')) {
			st.set('plainWarned', '1');
			new obsidian.Notice('NMR Downloader: the sign-in token is kept on this computer only, outside the vault, but this system offers no encryption.', 15000);
		}
		return true;
	}

	/** Signs out: Google revokes the token, then it is removed from this computer whatever the answer */
	async signOut() {
		const token = this.settings.googleRefreshToken;
		const revoked = token ? await revokeGoogle(token, this.mailHooks()) : false;
		this.writeSignIn('', '');
		return revoked;
	}

	/**
	 * Moves the sign-in of NMR Downloader 1.8.0 (data.json) to this computer and removes it from data.json.
	 * Returns false when it could not be stored: then data.json keeps it and the move is tried on the next load.
	 */
	async migrateLocalFields(data) {
		if (!LOCAL_FIELDS.some((k) => k in data)) return true;
		const st = this.secrets();
		let ok = true;
		if (data.googleRefreshToken) ok = st.writeSecret('googleRefreshToken', data.googleRefreshToken) !== 'failed';
		if (ok && data.googleAccount) ok = st.set('googleAccount', data.googleAccount);
		for (const k of LOCAL_PATHS) if (ok && data[k]) ok = st.set(k, cleanPath(data[k]));
		if (!ok) {
			console.error('[NMR Downloader] could not move the Google sign-in out of data.json; it stays there for now');
			return false;
		}
		const rest = Object.assign({}, data);
		for (const k of LOCAL_FIELDS) delete rest[k];
		await this.saveData(rest);
		if (data.googleRefreshToken || data.googleAccount || data.credentialsFile)
			new obsidian.Notice('NMR Downloader: the Google sign-in is now kept on this computer, outside the vault.', 10000);
		else if (data.mnovaPath || data.topspinPath)
			new obsidian.Notice('NMR Downloader: the MestReNova and TopSpin paths are now kept on this computer, outside the vault.', 10000);
		return true;
	}

	async loadSettings() {
		const data = (await this.loadData()) || {};
		for (const k of ['__proto__', 'constructor', 'prototype']) if (Object.prototype.hasOwnProperty.call(data, k)) delete data[k];
		const moved = await this.migrateLocalFields(data);
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		for (const k of LOCAL_FIELDS) delete this.settings[k];
		if (moved) this.readLocalSignIn();
		else {
			// local storage refused the values: they are used from data.json, which keeps them until a later load moves them
			this.keepInDataJson = true;
			for (const k of LOCAL_FIELDS) this.settings[k] = typeof data[k] === 'string' ? data[k] : '';
			this.signInState = this.settings.googleRefreshToken ? 'data.json' : 'none';
		}
		if (data.openAllExperiments === false && !data.openMode) this.settings.openMode = 'name';
		this.settings.openWith = openWithOf(data);
		delete this.settings.openAllExperiments;
		for (const old of ['imapServer', 'imapPort', 'mailbox', 'emailAccount', 'emailAppPassword']) delete this.settings[old]; // IMAP version
		this.settings.frequencyFolders = Array.isArray(data.frequencyFolders)
			? data.frequencyFolders.map((r) => ({ freq: String(r.freq || ''), folder: String(r.folder || '') }))
			: [];
	}

	async saveSettings() {
		// the credentials path is kept on this computer; the sign-in is written only by writeSignIn
		const st = this.secrets();
		for (const k of LOCAL_PATHS) st.set(k, cleanPath(this.settings[k]));
		const out = Object.assign({}, this.settings);
		for (const k of LOCAL_FIELDS) delete out[k];
		if (this.keepInDataJson) {
			// the move out of data.json failed on load: keep the old values there until it succeeds
			const data = (await this.loadData()) || {};
			for (const k of LOCAL_FIELDS) if (data[k]) out[k] = data[k];
		}
		await this.saveData(out);
	}

	/** Text for error messages: the sign-in token masked */
	mask(text) {
		return maskSecrets(text, [this.settings && this.settings.googleRefreshToken]);
	}

	/** Extra settings for the Google client: saves a renewed token, test overrides. */
	mailHooks() {
		return Object.assign({}, this.testHooks, {
			onRefreshToken: async (token) => {
				this.writeSignIn(token, this.settings.googleAccount);
			},
		});
	}

	/** Opens the Google consent page in the system browser. */
	async openExternal(url) {
		if (this.testHooks && this.testHooks.openUrl) return this.testHooks.openUrl(url);
		try {
			await navigator.clipboard.writeText(url);
		} catch (e) {
			/* clipboard is optional */
		}
		new obsidian.Notice('Google sign-in opens in your browser. (The link is also copied to the clipboard.)', 8000);
		try {
			require('electron').shell.openExternal(url);
		} catch (e) {
			window.open(url);
		}
	}

	async runDownload(opts = {}) {
		// started with the system-wide shortcut while Obsidian is in the background: messages of the system as well
		const away = Boolean(opts.fromShortcut) && !(this.testHooks && 'focused' in this.testHooks ? this.testHooks.focused : document.hasFocus());
		if (this.running) {
			new obsidian.Notice('NMR download is already running');
			if (away) this.systemNotify('The download is already running.');
			return;
		}
		const { cfg, problems } = prepareConfig(this.settings);
		if (problems.length) {
			new obsidian.Notice('NMR Downloader: please finish the settings:\n- ' + problems.join('\n- '), 15000);
			if (away) this.systemNotify('Please finish the settings of NMR Downloader in Obsidian.');
			return;
		}
		this.running = true;
		if (away) this.systemNotify('Checking mail for NMR spectra…');
		const lines = [];
		const waiting = new obsidian.Notice('NMR: checking mail, please wait...', 0);
		const status = (m) => waiting.setMessage('NMR: ' + m + ' - please wait...');
		// every line of the run is shown with <token> for the sign-in token (also the one in use when the run began,
		// if Google renews it during the run)
		const tokenAtStart = this.settings.googleRefreshToken;
		const hide = (t) => maskSecrets(t, [this.settings.googleRefreshToken, tokenAtStart]);
		const log = (m) => {
			m = hide(m);
			lines.push(m);
			console.log('[NMR Downloader]', m);
			status(String(m).split('\n')[0]);
		};
		cfg.topspinHooks = Object.assign({}, cfg.topspinHooks, { status });
		try {
			await runNmrDownload(cfg, log, this.mailHooks());
			waiting.hide();
			new obsidian.Notice(lines.join('\n') || 'Done', 15000);
			if (away) this.systemNotify(lines.slice(-4).join('\n') || 'Done');
		} catch (e) {
			waiting.hide();
			lines.push('ERROR: ' + hide(e && e.message));
			console.error('[NMR Downloader]', hide(e && e.stack ? e.stack : e));
			new obsidian.Notice(lines.join('\n'), 20000);
			if (away) this.systemNotify('ERROR: ' + hide(e && e.message));
		} finally {
			this.running = false;
		}
	}
}

class NmrSettingTab extends obsidian.PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.envPath = '';
		this.stopRecording = null;
	}

	hide() {
		if (this.stopRecording) this.stopRecording();
		if (super.hide) super.hide();
	}

	display() {
		if (this.stopRecording) this.stopRecording();
		const { containerEl } = this;
		const s = this.plugin.settings;
		containerEl.empty();

		const save = async () => this.plugin.saveSettings();
		const text = (setting, field, placeholder, opts) => {
			setting.addText((t) => {
				t.setPlaceholder(placeholder || '')
					.setValue(String(s[field] === undefined ? '' : s[field]))
					.onChange(async (v) => {
						s[field] = opts && opts.number ? Number(v) || 0 : v;
						await save();
					});
				if (opts && opts.password) t.inputEl.type = 'password';
				if (opts && opts.wide) t.inputEl.addClass('nmr-downloader-wide');
			});
		};

		new obsidian.Setting(containerEl).setName('Google mail account').setHeading();
		text(
			new obsidian.Setting(containerEl)
				.setName('Credentials file (credentials.json)')
				.setDesc('The same credentials.json the old Python script used (Google Cloud > Desktop app OAuth client). Full path to the file. Kept on this computer only, not in the vault.'),
			'credentialsFile',
			'C:\\Users\\you\\credentials.json',
			{ wide: true }
		);
		new obsidian.Setting(containerEl)
			.setName('Google sign-in')
			.setDesc(
				(s.googleRefreshToken
					? 'Signed in' + (s.googleAccount ? ' as ' + s.googleAccount : '') + '. '
					: this.plugin.signInState === 'unreadable'
						? 'Sign in again: the saved Google sign-in cannot be read on this computer. '
						: 'Not signed in. Press Authorize, choose the Google account that receives the spectra and allow access to Gmail. ') +
					({
						encrypted: 'Kept on this computer only (encrypted by ' + (process.platform === 'darwin' ? 'macOS' : process.platform === 'win32' ? 'Windows' : 'the system keyring') + ').',
						plain: 'Kept on this computer only (not encrypted).',
						'data.json': 'Still in data.json: it could not be moved to this computer yet.',
					}[this.plugin.signInState] || 'Each computer signs in once; the sign-in is kept on that computer, outside the vault.')
			)
			.addButton((b) =>
				b
					.setButtonText(s.googleRefreshToken ? 'Authorize again' : 'Authorize')
					.setCta()
					.onClick(async () => {
						const { mail, problems } = prepareMailConfig(s, { noSender: true });
						if (problems.length) {
							new obsidian.Notice('Please fill in:\n- ' + problems.join('\n- '));
							return;
						}
						try {
							const hooks = this.plugin.mailHooks();
							const creds = readCredentials(mail.credentialsFile);
							const tok = await authorizeGoogle(creds, hooks, (u) => this.plugin.openExternal(u));
							const client = new GmailClient({ creds, refreshToken: tok.refreshToken, hooks });
							client.access = tok.accessToken;
							client.expiresAt = tok.expiresAt;
							let account = '';
							try {
								account = (await client.profile()).emailAddress || '';
							} catch (e) {
								account = '';
							}
							if (!this.plugin.writeSignIn(tok.refreshToken, account)) {
								new obsidian.Notice('Google sign-in worked, but it could not be saved on this computer (local storage unavailable).', 15000);
								return;
							}
							await save();
							new obsidian.Notice('Signed in to Google' + (s.googleAccount ? ' as ' + s.googleAccount : ''));
							this.display();
						} catch (e) {
							new obsidian.Notice('Google sign-in failed: ' + this.plugin.mask(e.message), 15000);
						}
					})
			)
			.addButton((b) =>
				b.setButtonText('Sign out').onClick(async () => {
					const had = Boolean(s.googleRefreshToken);
					const revoked = await this.plugin.signOut();
					new obsidian.Notice(
						revoked
							? 'Signed out and access revoked'
							: had
								? 'Signed out on this computer; revoke access at myaccount.google.com/permissions'
								: 'Not signed in on this computer',
						10000
					);
					this.display();
				})
			);
		text(
			new obsidian.Setting(containerEl)
				.setName('Sender e-mail')
				.setDesc('Only unread messages from exactly this address are processed. Several addresses: separate with commas; @university.edu accepts the whole domain.'),
			'senderEmail',
			'nmr-service@university.edu'
		);
		new obsidian.Setting(containerEl)
			.setName('Test mail login')
			.setDesc('Checks the Google sign-in and counts unread messages from the sender. Nothing is downloaded.')
			.addButton((b) =>
				b.setButtonText('Test').onClick(async () => {
					const { mail, problems } = prepareMailConfig(s);
					if (problems.length) {
						new obsidian.Notice('Please fill in:\n- ' + problems.join('\n- '));
						return;
					}
					try {
						const r = await testMailLogin(mail, this.plugin.mailHooks());
						const passed = r.auth.filter((a) => a.ok).length;
						const authLine = !r.auth.length
							? 'Sender check: no mail from the sender found to check.'
							: passed === r.auth.length
								? `Sender check: Gmail confirmed the sender in ${passed} of ${r.auth.length} latest mail(s) (${r.auth[0].detail}).`
								: `Sender check: Gmail confirmed the sender in only ${passed} of ${r.auth.length} latest mail(s) (${(r.auth.find((a) => !a.ok) || {}).detail}). Mails that fail are not downloaded while "Check the sender" is on.`;
						new obsidian.Notice(`Login OK (${r.account}). Unread messages with attachments: ${r.count}\n${authLine}`, 15000);
					} catch (e) {
						new obsidian.Notice('Mail test failed: ' + this.plugin.mask(e.message), 15000);
					}
				})
			);

		new obsidian.Setting(containerEl).setName('Archives').setHeading();
		text(
			new obsidian.Setting(containerEl)
				.setName('Archive prefixes')
				.setDesc('Archive names look like PREFIX_NAME400-2026_12.zip. Several prefixes: separate with commas.'),
			'archivePrefixes',
			'MG,GM'
		);
		text(
			new obsidian.Setting(containerEl)
				.setName('User name in archive names')
				.setDesc('The NAME part, e.g. Smith (upper/lower case does not matter). Other archives are ignored.'),
			'nmrUsername',
			'Smith'
		);

		new obsidian.Setting(containerEl).setName('Where to put the spectra').setHeading();
		new obsidian.Setting(containerEl)
			.setName('Storage mode')
			.setDesc('Sort by frequency, put everything into one folder, or both (sorted + a copy of everything in one folder).')
			.addDropdown((d) => {
				d.addOption('by_frequency', 'Sort by frequency')
					.addOption('single_folder', 'All in one folder')
					.addOption('both', 'Both')
					.setValue(STORAGE_MODES.includes(s.storageMode) ? s.storageMode : 'by_frequency')
					.onChange(async (v) => {
						s.storageMode = v;
						await save();
						this.display();
					});
			});
		text(
			new obsidian.Setting(containerEl)
				.setName('Download folder')
				.setDesc('Where the .zip archives are saved before unpacking.'),
			'downloadFolder',
			'C:\\Users\\you\\Downloads\\NMR archive',
			{ wide: true }
		);

		const mode = STORAGE_MODES.includes(s.storageMode) ? s.storageMode : 'by_frequency';
		if (mode === 'by_frequency' || mode === 'both') {
			new obsidian.Setting(containerEl)
				.setName('Folders by frequency')
				.setDesc('The frequency (MHz) is taken from the archive name, e.g. ...400-2026_12.zip goes to the 400 folder.');
			s.frequencyFolders.forEach((row, index) => {
				const setting = new obsidian.Setting(containerEl);
				setting.addText((t) => {
					t.setPlaceholder('MHz')
						.setValue(row.freq)
						.onChange(async (v) => {
							row.freq = v.trim();
							await save();
						});
					t.inputEl.addClass('nmr-downloader-narrow');
				});
				setting.addText((t) => {
					t.setPlaceholder('Folder for this frequency')
						.setValue(row.folder)
						.onChange(async (v) => {
							row.folder = v;
							await save();
						});
					t.inputEl.addClass('nmr-downloader-wide');
				});
				setting.addExtraButton((b) =>
					b
						.setIcon('trash')
						.setTooltip('Remove')
						.onClick(async () => {
							s.frequencyFolders.splice(index, 1);
							await save();
							this.display();
						})
				);
			});
			new obsidian.Setting(containerEl).addButton((b) =>
				b.setButtonText('Add frequency').onClick(async () => {
					s.frequencyFolders.push({ freq: '', folder: '' });
					await save();
					this.display();
				})
			);
		}
		if (mode === 'single_folder' || mode === 'both') {
			text(
				new obsidian.Setting(containerEl)
					.setName('Single folder')
					.setDesc('Every unpacked archive goes here' + (mode === 'both' ? ' (in addition to the frequency folders).' : '.')),
				'singleFolder',
				'C:\\Users\\you\\NMR\\all',
				{ wide: true }
			);
		}

		new obsidian.Setting(containerEl)
			.setName('Folders by tens')
			.setDesc('Experiments 10-19 of a spectrometer are unpacked into one folder (e.g. MG_Smith400-2026_10-19), 20-29 into the next, and so on - one folder per sample. TopSpin then opens the whole folder, each experiment in its own window; MestReNova opens the 1r files as before. Off: everything goes straight into the frequency folder.')
			.addToggle((t) =>
				t.setValue(s.groupFolders !== false).onChange(async (v) => {
					s.groupFolders = v;
					await save();
				})
			);
		new obsidian.Setting(containerEl).setName('Open spectra').setHeading();
		new obsidian.Setting(containerEl)
			.setName('Open downloaded spectra in')
			.setDesc('The program for the spectra of a download: MestReNova or Bruker TopSpin (their settings below), or none. The command "Open a Bruker spectrum folder in TopSpin" always uses TopSpin.')
			.addDropdown((d) =>
				d.addOption('mestrenova', 'MestReNova')
					.addOption('topspin', 'TopSpin')
					.addOption('none', "Don't open")
					.setValue(openWithOf(s))
					.onChange(async (v) => {
						s.openWith = v;
						s.openInMnova = v === 'mestrenova';
						await save();
					})
			);
		new obsidian.Setting(containerEl).setName('MestReNova').setHeading();
		text(
			new obsidian.Setting(containerEl)
				.setName('MestReNova program')
				.setDesc('Full path to MestReNova.exe. Kept on this computer only, not in the vault.'),
			'mnovaPath',
			'C:\\Program Files (x86)\\Mestrelab Research S.L\\MestReNova\\MestReNova.exe',
			{ wide: true }
		);
		new obsidian.Setting(containerEl)
			.setName('MestReNova documents')
			.setDesc(
				'Experiments are numbered 10, 11, 12 ... 19 for one sample, 20, 21 ... for the next. ' +
					'"By tens": for each group the plugin creates a new document (like Ctrl+N) and opens the spectra into it: 10-19 in one, 20-29 in the next, and so on (per spectrometer, within one download run). ' +
					'"Each separately": one document per experiment. "Archive number only": one spectrum per archive, as in the old Python script.'
			)
			.addDropdown((d) => {
				d.addOption('tens', 'By tens (10-19, 20-29 ...), new document for each')
					.addOption('each', 'Each experiment separately')
					.addOption('name', 'Archive number only')
					.setValue(OPEN_MODES.includes(s.openMode) ? s.openMode : 'tens')
					.onChange(async (v) => {
						s.openMode = v;
						await save();
					});
			});
		new obsidian.Setting(containerEl)
			.setName('Check MestReNova')
			.setDesc('Looks for the program at the path above (and in the usual install folders) and fixes the path if it finds it elsewhere.')
			.addButton((b) =>
				b.setButtonText('Check').onClick(async () => {
					const r = resolveMnova(s.mnovaPath);
					if (!r.exe) {
						new obsidian.Notice('MestReNova not found. Looked at:\n- ' + r.looked.join('\n- ') + '\nEnter the full path to MestReNova.exe.', 15000);
						return;
					}
					if (r.exe !== String(s.mnovaPath || '').trim()) {
						s.mnovaPath = r.exe;
						await save();
						this.display();
					}
					new obsidian.Notice('MestReNova found: ' + r.exe);
				})
			);
		new obsidian.Setting(containerEl).setName('TopSpin').setHeading();
		text(
			new obsidian.Setting(containerEl)
				.setName('TopSpin folder')
				.setDesc('The folder with topspin.cmd (empty = looked for in C:\\Bruker). Spectra open each in its own TopSpin window; if TopSpin is closed, it is started with the first one. Processing done in TopSpin stays in the spectrum folder (pdata). Kept on this computer only, not in the vault.'),
			'topspinPath',
			'C:\\Bruker\\TopSpin5.0.0',
			{ wide: true }
		);
		new obsidian.Setting(containerEl)
			.setName('Check TopSpin')
			.setDesc('Looks for topspin.cmd and prog\\bin\\sendgui.cmd and fills in the folder if it finds them elsewhere.')
			.addButton((b) =>
				b.setButtonText('Check').onClick(async () => {
					const r = resolveTopSpin(s.topspinPath);
					if (!r.start) {
						new obsidian.Notice('TopSpin not found. Looked at:\n- ' + r.looked.join('\n- ') + '\nEnter the TopSpin folder (with topspin.cmd).', 15000);
						return;
					}
					if (r.dir !== String(s.topspinPath || '').trim()) {
						s.topspinPath = r.dir;
						await save();
						this.display();
					}
					new obsidian.Notice('TopSpin found: ' + r.dir + (r.sendgui ? '' : '\n(sendgui not found: only starting TopSpin will work)'));
				})
			);
		new obsidian.Setting(containerEl)
			.setName('Spectrum folders named after the notebook page')
			.setDesc('For the Open in TopSpin button of a note. On: it opens every folder whose name starts with the notebook number + the note number, e.g. 010015 for Exp_15 in notebook 01 (0100150101, 01001502 ...; the rest of the name does not matter). Numbers in NMR_id are opened as well.')
			.addToggle((t) =>
				t.setValue(!!s.pageFolders).onChange(async (v) => {
					s.pageFolders = v;
					await save();
					this.display();
				})
			);
		if (s.pageFolders) {
			if (!Array.isArray(s.notebooks)) s.notebooks = [];
			new obsidian.Setting(containerEl)
				.setName('Notebooks')
				.setDesc('The project code in the note names (Exp for Exp_15) and its notebook number, the first digits of the folder names (01).');
			s.notebooks.forEach((row, i) => {
				new obsidian.Setting(containerEl)
					.setClass('nmr-dl-notebook-row')
					.addText((t) => {
						t.setPlaceholder('Code, e.g. Exp')
							.setValue(row.code || '')
							.onChange(async (v) => {
								row.code = v.trim();
								await save();
							});
					})
					.addText((t) => {
						t.setPlaceholder('Notebook number, e.g. 01')
							.setValue(row.number || '')
							.onChange(async (v) => {
								row.number = v.trim();
								await save();
							});
					})
					.addExtraButton((b) =>
						b
							.setIcon('trash')
							.setTooltip('Remove')
							.onClick(async () => {
								s.notebooks.splice(i, 1);
								await save();
								this.display();
							})
					);
			});
			new obsidian.Setting(containerEl).addButton((b) =>
				b.setButtonText('Add notebook').onClick(async () => {
					s.notebooks.push({ code: '', number: '' });
					await save();
					this.display();
				})
			);
			new obsidian.Setting(containerEl)
				.setName('Digits of the note number')
				.setDesc('How many digits the note (page) number has in the folder names: 3 for 001-999 (01 015 ...), 4 for 0001-9999 (01 0015 ...).')
				.addDropdown((d) =>
					d.addOption('2', '2 (01-99)')
						.addOption('3', '3 (001-999)')
						.addOption('4', '4 (0001-9999)')
						.addOption('5', '5 (00001-99999)')
						.setValue(String(s.pageDigits || 4))
						.onChange(async (v) => {
							s.pageDigits = Number(v);
							await save();
						})
				);
			new obsidian.Setting(containerEl)
				.setName('Folders with these spectra')
				.setDesc('One folder per line; the spectrum folders may be in them or one level below. Empty: the spectra folders set above.')
				.addTextArea((t) => {
					t.inputEl.rows = 3;
					t.inputEl.addClass('nmr-downloader-wide');
					t.setPlaceholder('C:\\NMR\\Notebook 01')
						.setValue(s.pageSearchFolders || '')
						.onChange(async (v) => {
							s.pageSearchFolders = v;
							await save();
						});
				});
		}
		new obsidian.Setting(containerEl).setName('Mail and archives').setHeading();
		new obsidian.Setting(containerEl)
			.setName('Mark other mails from the sender as read')
			.setDesc('Mails that bring no archive (like "Sample Measured" and the PDF printout) are also marked as read.')
			.addToggle((t) =>
				t.setValue(s.markOtherRead !== false).onChange(async (v) => {
					s.markOtherRead = v;
					await save();
				})
			);
		new obsidian.Setting(containerEl)
			.setName('Check the sender')
			.setDesc('Download only from mails whose sender Gmail confirmed (DMARC, DKIM or SPF pass for the domain of the sender address), so a mail with a forged From address is skipped and left unread. Press Test above to see the result for the latest mails of your NMR service; switch off only if its genuine mails fail.')
			.addToggle((t) =>
				t.setValue(s.checkSenderAuth !== false).onChange(async (v) => {
					s.checkSenderAuth = v;
					await save();
				})
			);
		new obsidian.Setting(containerEl)
			.setName('Keep the .zip after unpacking')
			.addToggle((t) =>
				t.setValue(!!s.keepZip).onChange(async (v) => {
					s.keepZip = v;
					await save();
				})
			);

		new obsidian.Setting(containerEl).setName('Run').setHeading();
		new obsidian.Setting(containerEl)
			.setName('Download NMR spectra now')
			.setDesc('The same as the command "Download NMR spectra" and the download icon in the left ribbon.')
			.addButton((b) => b.setButtonText('Run').setCta().onClick(() => this.plugin.runDownload()));
		const shortcut = new obsidian.Setting(containerEl)
			.setName('Shortcut in every program')
			.setDesc('Starts the download from any program, also with Obsidian minimized (Obsidian has to be running). Click Record and press the keys, for example Ctrl+Alt+Shift+N; then give a mouse button the same keys (Logi Options+: keystroke). While Obsidian is in the background, a system notification tells when the download starts and how it ended. Empty = off.');
		const state = shortcut.descEl.createDiv({ cls: 'nmr-downloader-shortcut-state' });
		let shortcutText;
		const apply = async (value) => {
			s.globalShortcut = normalizeAccelerator(value);
			if (shortcutText) shortcutText.setValue(s.globalShortcut);
			await save();
			const r = this.plugin.applyGlobalShortcut();
			state.setText(r.off ? 'Off.' : r.ok ? `On: ${r.acc}.` : `Not set up: ${r.why}.`);
		};
		shortcut.addText((t) => {
			shortcutText = t;
			t.setPlaceholder('Ctrl+Alt+Shift+N').setValue(s.globalShortcut || '');
			t.inputEl.addEventListener('change', () => apply(t.getValue()));
		});
		shortcut.addButton((b) =>
			b.setButtonText('Record').onClick(() => {
				if (this.stopRecording) return;
				// the shortcut is let go while recording, so pressing it does not start a download
				this.plugin.clearGlobalShortcut();
				b.setButtonText('Press the keys…');
				const onKey = (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (e.code === 'Escape') return done(null);
					const acc = acceleratorFromEvent(e);
					if (acc) done(acc);
				};
				const done = (acc) => {
					window.removeEventListener('keydown', onKey, true);
					this.stopRecording = null;
					b.setButtonText('Record');
					apply(acc || s.globalShortcut || '');
				};
				// closing the settings (or redrawing them) ends the recording and keeps the old keys
				this.stopRecording = () => done(null);
				window.addEventListener('keydown', onKey, true);
			})
		);
		shortcut.addButton((b) => b.setButtonText('Clear').onClick(() => apply('')));
		state.setText(!s.globalShortcut ? 'Off.' : this.plugin.registeredShortcut ? `On: ${this.plugin.registeredShortcut}.` : 'Not set up (see the message when Obsidian started).');

		new obsidian.Setting(containerEl).setName('Import').setHeading();
		new obsidian.Setting(containerEl)
			.setName('Import from nmr_settings.env')
			.setDesc('Reads a settings file used by the old Python script and fills in the fields above.')
			.addText((t) => {
				t.setPlaceholder('Path to nmr_settings.env').onChange((v) => (this.envPath = v.trim()));
				t.inputEl.addClass('nmr-downloader-wide');
			})
			.addButton((b) =>
				b.setButtonText('Import').onClick(async () => {
					try {
						const env = parseEnv(decodeText(fs.readFileSync(this.envPath)));
						const n = applyEnvToSettings(s, env);
						await save();
						new obsidian.Notice(`Imported ${n} values`);
						this.display();
					} catch (e) {
						new obsidian.Notice('Import failed: ' + e.message, 10000);
					}
				})
			);
	}
}

module.exports = NmrDownloaderPlugin;
// For automated tests only; Obsidian ignores extra properties.
module.exports.core = {
	prepareConfig, prepareMailConfig, testMailLogin, destinations, buildArchiveRegex, parseEnv, applyEnvToSettings,
	openZip, extractZip, findSpectrum, runNmrDownload, downloadArchives, processArchives,
	buildMnovaScript, writeMnovaScript, findAllSpectra, groupSpectra, resolveMnova, openInMnova, resolveTopSpin, topspinDataset, groupFolderName, stripTop, noteFieldNumbers, spectraForId, noteCodeNumber, pagePrefix, foldersStartingWith, topspinSend, topspinStart, openInTopSpin, openWithOf, spectraInFolder, GmailClient, authorizeGoogle, readCredentials, messageFiles, splitSenders, searchQuery,
	acceleratorFromEvent, normalizeAccelerator,
	SecretStore, maskSecrets, revokeGoogle, LOCAL_FIELDS, senderAuthentication, fromDomain, senderAddress, downloadFromMessages,
	crc32, crc32Update, checkZipSize, writeEntry, makeDirsNoLinks, ZIP_MAX_TOTAL, ZIP_MAX_ENTRIES, safeFileName, isTrustedSender, STORAGE_MODES, DEFAULT_SETTINGS, NmrSettingTab,
};
