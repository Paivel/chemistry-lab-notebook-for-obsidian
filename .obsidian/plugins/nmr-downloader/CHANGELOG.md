# Changelog

## 1.8.8 — 2026-11-22
- **New — Shortcut in every program.** Settings → Run: **Record** a key combination (for example Ctrl+Alt+Shift+N) or type it; the download then starts from any program, also with Obsidian minimized (Obsidian must be running). A mouse button can send the same keys (Logi Options+: keyboard-shortcut action for all applications). While Obsidian is in the background, system notifications tell when the download starts, how it ended, and when the settings are unfinished or a download is already running. Keys taken by another program (or by the plugin in another open vault) are reported in the setting with the reason; **Clear** or an empty field turns it off, and the keys are released when the plugin is disabled. While recording, the old keys are let go (so pressing them does not start a download); Escape, closing the settings or redrawing them ends the recording and keeps the old keys.
- Checks: key recording and normalization, taken and invalid keys, no system shortcut API, Record/Clear, notifications only from the shortcut while Obsidian is in the background (shortcut test 31/31); verified in Obsidian 1.15.1 on Linux (X11) with system-level key presses, also with another program in front, and with the settings closed during recording.

## 1.8.7 — 2026-11-04
- **Fix — "Mark other mails from the sender as read" left the PDF printouts and could leave "Sample Measured" unread.** The setting promised to mark the mails that bring no archive, but it found them with Gmail's `-has:attachment`, so the IconNMR printout (*ICON-NMR Print of …*, a PDF) was never among them — since 1.8.4 it stayed unread and was listed as "no archive for <user> in it" — and Gmail's search could miss *Sample Measured* mails too. Now the sender's unread mails are listed (`is:unread from:(…)`) and each one is checked: a mail with no `.zip` attachment is marked as read; a mail with any `.zip` (for another user, not unpacked, or arriving during the run) never is, and a mail whose sender Gmail did not confirm stays unread and is listed. A sender written as a domain (`@uni.edu`) is searched as `uni.edu`.
- Checks: a printout, a forged and a look-alike *Sample Measured*, the setting off, a domain as the sender (mail test 59/59).

## 1.8.6 — 2026-11-04
Prepared for the Obsidian community directory.
- The widths of the text fields are set in the new `styles.css` instead of the code (Obsidian's guidelines); the settings look the same.
- `minAppVersion` 1.5.0 (was 1.0.0), as the other plugins of the notebook; tested on current Obsidian versions only.
- README: a section on the Google account and Cloud project needed, the Google servers contacted and when, the files written outside the vault and the programs started.

## 1.8.5 — 2026-11-04
Two weaknesses found while the tests were written again (KNOWN_ISSUES 2026-11-03).
- **Sender check reads only Gmail's own results.** The `Authentication-Results` header was searched as plain text, also inside Gmail's comments in brackets, which repeat the envelope address chosen by the sender. An envelope address such as `"smtp.mailfrom=uni.edu x"@evil.com` (SPF passing for evil.com) was read as uni.edu, so a forged mail could pass. Now the header is read as RFC 8601 defines it: comments are dropped, quoted parts of addresses are kept whole (a `;`, `=` or bracket in them separates nothing), and the domain is taken after the last `@` outside quotes; a quote or bracket left open hides the rest. Genuine Gmail headers give the same results as before.
- **The sign-in token is masked in every line.** Only the final `ERROR:` line showed `<token>`; an earlier line of the same run (e.g. *Could not mark other messages as read: …*) and the console could show the token in clear when Google's error message quoted it. Now every line of the run, the console, and the *Test* button's error show `<token>` (also a token renewed during the run).

## 1.8.4 — 2026-10-22
- **A mail is marked as read only after its archive was saved and unpacked** (PLUGIN_FIXES_FROM_REVIEW 2026-10-22, item 9). Before, every mail from the sender was marked as read right after the download, so an archive that then failed to unpack (or a mail without an archive for the user) was lost from the unread list. Now such a mail stays unread and the summary lists it (*Left unread: "…" — … not unpacked / no archive for <user> in it*). An error on a later mail no longer prevents the archives saved before it from being unpacked and their mails marked. Mails without any attachment (*Sample measured*) are still marked as read by **Mark other mails from the sender as read**.

## 1.8.3 — 2026-10-21
Fixes from an independent security review.
- **Program paths per computer.** The MestReNova and TopSpin paths (the programs the plugin starts) are kept on this computer, like the sign-in, and no longer in `data.json`: a synced or shared vault cannot point the plugin at another program. They are moved out of `data.json` on the first load (notice once).
- **Archives cannot exhaust memory or disk.** Entries are unpacked as a stream (one chunk in memory, not the whole file), stopped as soon as an entry grows beyond its declared size, and checked by CRC; a partial file is removed. An archive is refused before anything is written if it has more than 20 000 files, would unpack to more than 16 GB, needs more than the free disk space, or declares an impossible compression ratio.
- **No writing through links.** A folder or file in the destination that is a symbolic link (or junction) is refused for that entry, so an archive cannot write outside the spectra folder through a link placed there. Existing regular files are still replaced (downloading the same spectra again).
- **Windows:** archive paths with `%` or `!` (cmd.exe would expand them in the path given to MestReNova or TopSpin) or ending in a dot or space are skipped.
- **Sender check stricter:** DKIM or SPF must pass for exactly the sender's domain; a pass for a subdomain or the parent domain (e.g. a key of students.uni.edu for nmr@uni.edu) no longer counts. `dmarc=pass` (the domain owner's own alignment rules) still counts.
- **MestReNova script** is written into a new private temporary folder with a random name (owner only), so another user of the computer cannot predict and replace it.
- **Note fields** `NMR_id::` and `id::` are read with expressions without slow backtracking (a line of 40 000 `*` took 1.6 s); the forms read are unchanged.
- `__proto__` and similar keys in `data.json` are ignored.

## 1.8.2 — 2026-10-21
- **Check the sender** (on by default): archives are downloaded only from mails whose sender Gmail authenticated — `dmarc=pass` for the From domain, or `dkim=pass` / `spf=pass` for a domain aligned with it (the same domain, or one a subdomain of the other), read from the topmost `Authentication-Results` header with authserv-id `mx.google.com` (a header of the same name further down may come from the sender and is ignored). A mail with a forged From address is skipped, left unread and reported. Setting, `.env` key `CHECK_SENDER_AUTH`.
- **Test** also checks the 5 latest mails from the sender and reports how many pass.
- The sender address must match exactly (`nmr@uni.edu` does not accept `nmr@uni.edu.evil.com`; `@uni.edu` accepts that domain only). Fixed: a display name with an address in quotes (`"<nmr@uni.edu>" <evil@x.com>`) or two addresses in brackets were read as the trusted sender; now quoted names and comments are removed first and a From header with more than one address is refused.

## 1.8.1 — 2026-10-21
The Google sign-in is kept out of the vault (NMR_DOWNLOADER_TOKEN_STORAGE).
- The refresh token, the Google account address and the path to `credentials.json` are kept in this computer's local storage (Obsidian's application data, outside the vault), per vault, under `nmr-downloader:<vault name>:…`. They are no longer written to `data.json`.
- The token is encrypted with the operating system (Electron safeStorage: DPAPI on Windows, Keychain on macOS, libsecret / kwallet on Linux) and stored as `enc1:…`. Where no encryption is offered it is stored as `plain1:…` and a warning is shown once.
- A sign-in that cannot be decrypted (another Windows user, a copied profile, a changed keychain) counts as not signed in: "Sign in again: the saved Google sign-in cannot be read on this computer."
- Migration from 1.8.0: the three values are moved out of `data.json` on the first load (the notice is shown once); downloading works without signing in again. If local storage refuses them, `data.json` keeps them and the move is tried again on the next load.
- A renewed refresh token is written to local storage only.
- **Sign out** revokes the token at Google (`oauth2.googleapis.com/revoke`) and removes it and the account from this computer even when the revocation fails; it reports "Signed out and access revoked" or "Signed out on this computer; revoke access at myaccount.google.com/permissions".
- The settings show where the sign-in is kept ("Kept on this computer only (encrypted by Windows/macOS)" or "… (not encrypted)").
- Error messages and the console show `<token>` instead of the token.
- Unchanged: scope `gmail.modify`, the sign-in flow (local page on 127.0.0.1, 3-minute timeout), downloading and unpacking.

## 1.8.0 and earlier
See the history of the vault repository.
