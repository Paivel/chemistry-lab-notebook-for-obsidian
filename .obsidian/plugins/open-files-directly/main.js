'use strict';
/*
 * Open Files Directly: a link to a file Obsidian cannot show itself (a .cdxml, .cdx or .mnova file) opens the file in
 * the program the system uses for it. Since Obsidian 1.15 Obsidian first asks "Open file in another app?" for every
 * file type it does not know. Its own "Open in default app" menu item does not ask (it only asks before running a
 * program or a script). This plugin makes links to the file types listed in its settings open the same way as that
 * menu item, so they open with one click, but only for files in the folder set in its settings (Files, with its
 * subfolders, by default). Obsidian still asks for files elsewhere and before running anything executable.
 */
const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_SETTINGS = { extensions: 'cdx, cdxml, mnova, pdf', folder: 'Files' };

// File types that run code or open a program: never opened without Obsidian's question, even when listed
const REFUSED = new Set([
  // Windows
  'exe', 'bat', 'cmd', 'com', 'msi', 'msp', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'hta', 'scr', 'pif',
  'cpl', 'msc', 'reg', 'lnk', 'url', 'inf', 'dll', 'sys', 'appx', 'msix', 'appref-ms', 'application', 'gadget', 'jar',
  // scripts
  'py', 'pyw', 'pyc', 'rb', 'pl', 'php', 'sh', 'bash', 'zsh', 'csh', 'ksh', 'fish', 'command', 'tool', 'applescript',
  'scpt', 'scptd', 'osascript', 'workflow', 'action',
  // macOS and Linux programs and installers
  'app', 'appex', 'bundle', 'kext', 'pkg', 'mpkg', 'dmg', 'plugin', 'prefpane', 'saver', 'terminal', 'desktop',
  'appimage', 'deb', 'rpm', 'run', 'bin', 'elf', 'out',
  // pages and documents that can run scripts or macros when opened outside Obsidian
  'html', 'htm', 'xhtml', 'shtml', 'mht', 'mhtml', 'svg', 'xml', 'xsl', 'docm', 'xlsm', 'pptm', 'dotm', 'xltm', 'potm',
  'ppsm', 'xlam', 'ppam', 'one', 'iso', 'img', 'vhd', 'vhdx', 'library-ms', 'searchconnector-ms', 'settingcontent-ms',
]);

/** "cdx, .CDXML; mnova" -> { list: ['cdx', 'cdxml', 'mnova'], refused: [] }; refused types are left out */
function parseExtensions(text) {
  const list = []; const refused = [];
  for (const raw of String(text || '').split(/[\s,;]+/)) {
    const ext = raw.trim().replace(/^\*?\.+/, '').toLowerCase();
    if (!ext) continue;
    if (!/^[a-z0-9][a-z0-9_+-]*$/.test(ext) || REFUSED.has(ext)) { if (!refused.includes(ext)) refused.push(ext); continue; }
    if (!list.includes(ext)) list.push(ext);
  }
  return { list, refused };
}

/** 'Files/', '/Files', ' Files ' -> 'Files'; '' = the whole vault */
function normalizeFolder(folder) {
  return String(folder || '').trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '');
}

/** True for a vault path inside the folder (or one of its subfolders); paths with . or .. parts are never inside */
function inFolder(path, folder) {
  const p = String(path || '');
  if (!p || p.startsWith('/') || p.split('/').some((part) => part === '..' || part === '.')) return false;
  const f = normalizeFolder(folder);
  return !f || p.startsWith(f + '/');
}

/** Extension of a vault path ('Files/A_1.cdxml' -> 'cdxml'; no extension -> '') */
function extensionOf(path) {
  const name = String(path || '').split('/').pop();
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

class OpenFilesDirectlyPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.applyExtensions();
    this.addSettingTab(new OpenFilesDirectlySettingTab(this.app, this));
    this.wrapOpenWithDefaultApp();
  }

  applyExtensions() {
    this.extensions = new Set(parseExtensions(this.settings.extensions).list);
  }

  /** True for a file whose link should open directly */
  opensDirectly(path) {
    return !this.stopped && this.extensions.has(extensionOf(path)) && inFolder(path, this.settings.folder);
  }

  /**
   * app.openWithDefaultApp(path, direct) opens a vault file in its program; with `direct` false (links) Obsidian asks
   * first for types it does not know, with `direct` true (its "Open in default app" menu) it does not. The wrapper
   * passes true for the listed types. On unload the original method comes back; if another plugin wrapped it after
   * this one, the wrapper stays in place but only passes calls on.
   */
  wrapOpenWithDefaultApp() {
    const app = this.app;
    const original = app.openWithDefaultApp;
    if (typeof original !== 'function') {
      console.warn('Open Files Directly: this Obsidian version has no app.openWithDefaultApp; links open as before');
      return;
    }
    const hadOwn = Object.prototype.hasOwnProperty.call(app, 'openWithDefaultApp');
    const plugin = this;
    const wrapper = function (path, direct, ...rest) {
      return original.call(this, path, direct || plugin.opensDirectly(path), ...rest);
    };
    app.openWithDefaultApp = wrapper;
    this.register(() => {
      this.stopped = true;
      if (app.openWithDefaultApp !== wrapper) return;
      if (hadOwn) app.openWithDefaultApp = original; else delete app.openWithDefaultApp;
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.applyExtensions();
  }
}

class OpenFilesDirectlySettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const note = containerEl.createDiv();
    const show = () => {
      const { list, refused } = parseExtensions(this.plugin.settings.extensions);
      note.empty();
      const folder = normalizeFolder(this.plugin.settings.folder);
      const where = folder ? `in ${folder} and its subfolders` : 'anywhere in the vault';
      note.createEl('p', { text: list.length ? `Opened with one click: ${list.map((e) => '.' + e).join(', ')}, ${where}. Elsewhere Obsidian asks as before.` : 'No file type is listed: Obsidian asks for every file, as without this plugin.' });
      if (refused.length) note.createEl('p', { cls: 'mod-warning', text: `Not opened directly (they can run code, or are not file types): ${refused.map((e) => '.' + e).join(', ')}. Obsidian keeps asking for them.` });
    };
    new Setting(containerEl)
      .setName('File types')
      .setDesc('Links to these files open in the program the system uses for them, without the question "Open file in another app?". Separate the types with commas, for example: cdx, cdxml, mnova. Programs and scripts are never on this list. Files that Obsidian shows itself (notes, images, PDF) still open in Obsidian.')
      .addTextArea((t) => t
        .setPlaceholder(DEFAULT_SETTINGS.extensions)
        .setValue(this.plugin.settings.extensions)
        .onChange(async (v) => { this.plugin.settings.extensions = v; await this.plugin.saveSettings(); show(); }));
    new Setting(containerEl)
      .setName('Folder')
      .setDesc('Only files in this folder and its subfolders open with one click; for the same types elsewhere Obsidian asks as before. Empty = the whole vault.')
      .addText((t) => t
        .setPlaceholder(DEFAULT_SETTINGS.folder)
        .setValue(this.plugin.settings.folder)
        .onChange(async (v) => { this.plugin.settings.folder = normalizeFolder(v); await this.plugin.saveSettings(); show(); }));
    containerEl.appendChild(note);
    show();
  }
}

module.exports = OpenFilesDirectlyPlugin;
module.exports.parseExtensions = parseExtensions;
module.exports.extensionOf = extensionOf;
module.exports.inFolder = inFolder;
module.exports.normalizeFolder = normalizeFolder;
module.exports.REFUSED = REFUSED;
