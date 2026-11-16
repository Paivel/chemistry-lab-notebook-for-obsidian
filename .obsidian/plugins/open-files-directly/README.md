# Open Files Directly

Since Obsidian 1.15, a click on a link to a file that Obsidian cannot show itself (a `.cdxml` or `.cdx` reaction, a `.mnova` spectrum) first asks *"Open file in another app? This file will open outside of Obsidian…"*, and the file opens only after a second click on **Open this file**. With this plugin, links to the file types you list open in their program with one click, as Obsidian's own **Open in default app** menu item does, but only for files in one folder (**Files** and its subfolders, by default). For the same types anywhere else in the vault Obsidian keeps asking.

It works for every way of opening such a file: a link or an embed (`![[A_437.cdxml]]`) in Reading view or Live Preview, the file explorer, the quick switcher, buttons and commands that open a vault file.

## Settings
- **File types**, separated by commas (default `cdx, cdxml, mnova, pdf`). Dots, `*.` and capital letters are ignored (`.CDXML` = `cdxml`).
- **Folder** (default `Files`): only files in this folder and its subfolders open with one click. Empty = the whole vault. Paths with `.` or `..` parts never count as inside.
- Files that Obsidian shows itself (notes, images, PDF, audio, video) still open inside Obsidian; listing `pdf` changes nothing for them.
- Programs, scripts, installers, web pages, SVG, Office files with macros and disk images are never opened directly, even when listed (the settings name them). Obsidian also still asks before it runs anything executable, and before it opens a file on a network share.

## How it works
Obsidian opens a vault file in another app with `app.openWithDefaultApp(path, direct)`. Links call it with `direct` off, which makes Obsidian ask for file types it does not know. The **Open in default app** menu item calls it with `direct` on, which skips that question. The plugin wraps `app.openWithDefaultApp` and turns `direct` on for the listed types only. When the plugin is turned off, the original method is put back. `openWithDefaultApp` is not part of Obsidian's published API; if a later Obsidian version drops it, the plugin writes a warning to the console and links open as without it.

## Network, files and accounts
None: no network requests, no account. The plugin changes no files; its only setting is stored in its `data.json`. Desktop only.

## Tests
`node tests/plugin.test.js` (Node 22, no dependencies; mocked Obsidian): the list of types, the refused types, the folder, the wrapper, settings, unloading, another plugin wrapping the same method.

Checked by hand in Obsidian 1.15.1 on Linux: without the plugin a `.cdxml` link shows the question; with it, links and an embed in Reading view, a link in Live Preview and opening from the file explorer open `.cdxml`, `.cdx` and `.mnova` files at once; a file in `Files/sub` opens at once too; a `.cdxml` outside Files still asks; PDF opens in Obsidian; an unlisted type still asks; after turning the plugin off, links ask again.

## License
MIT (see `LICENSE`).
