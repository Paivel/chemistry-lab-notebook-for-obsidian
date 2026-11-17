# Template Guard

Keeps the structure of the reaction notes in the journal folder:

- **(a) Protection while editing.** Section headings, field labels (`**yield**::`), the note number field with its value (`**id1**:: 005`), the structure of tables (pipes, the separator line and the first word of the header, e.g. `TLC`, by which plugins find the table) and button blocks and the page-break line (`<div style="page-break-after: always;"></div>`) of the template cannot be deleted or changed by typing, pasting or dragging; nothing can be added to a heading (`#### NMR` stays `#### NMR`; in the title `# Exp_12 Suzuki` only the code is fixed, the name after it can be edited). Field values, table cells, the procedure and all other text stay editable. Click **🔒 Template** in the status bar (or run *Lock / unlock the template in this note*) to change the structure of one note on purpose; the lock comes back after a restart.
- **All Dataview fields (optional).** With *Protect all Dataview fields* on, the labels of fields that are not in the template are protected as well — `key::`, `**key**::`, `- key::` and inline `[key:: …]` / `(key:: …)` — in every guarded note (not in frontmatter or code blocks). They are only protected, not restored.
- **Hotkey.** *Lock / unlock the template in this note* can get a hotkey in Settings → Hotkeys (the plugin's settings have a **Set hotkey** button).
- **(b) Check and restore.** When a guarded note is opened (setting *Check notes when they are opened*; once per note and session), or with *Check this note against the template*, missing template parts and table rows with a wrong number of cells are listed; **Restore** adds the missing parts in their place (each after the nearest earlier part the note has) and completes the short rows. Nothing is deleted.
- **New template fields in existing notes.** When a project template (`Templates/Exp_.md`) is saved with new parts — a field, a heading, a table, a button — Template Guard offers to add them to every note of that project that lacks them (including `Finished/`), and protects them from then on. *Add missing template parts to all notes of this project* adds everything missing at once (with a list first).
- **Parts removed from the template.** When a part is deleted from the project template, Template Guard stops protecting and restoring it. It does not delete it from existing notes: old notes keep it as ordinary text, new notes are created without it.

## Setup
Nothing to do. Every project template in the templates folder (`Templates/Exp_.md`, `Templates/PAS_.md`, … — the code followed by `_`) is guarded from the start: Template Guard reads the template, ignores the Templater code in it (`Exp_<% id %>` is read as the note's code) and protects its headings, field labels, tables and buttons in every note of the project. A project created later with *add project* is guarded as soon as its template appears. Notes belong to a project by the code their name starts with (`Exp_12 Suzuki` → project `Exp`) and must be in the journal folder (any subfolder). A project can be switched off in the settings (*Stop guarding*).

Plugins that change notes (CDX Scheme Image, TLC Photo Inbox, the NMR/Mass buttons, Templater) are not affected: only typing, deleting, pasting and dragging in the editor are checked. Notes changed outside Obsidian are not protected, but the check (b) finds what is missing.

## Network, files and accounts
None: no network requests, no account. The plugin reads the project templates and changes a note only when you confirm a restore or the adding of new template parts. It works on desktop and mobile.

## Building
`node build.mjs` bundles `src/` into `main.js` (needs `../tools/bundle.mjs`; `obsidian` and `@codemirror/state` come from Obsidian).

## Tests
The tests are in the plugin's source repository (with the sources and fixtures; it will be published on GitHub soon), not in the vault's plugin folder.

Plain Node.js scripts (Node 22, no dependencies), run in this folder; each prints `PASS`/`FAIL` per check, ends with `N/M passed` and exits non-zero on a failure. The vault is optional (default `../fixtures/vault`; the published example vault works too) and is only read.
- `node tests/skeleton.test.js ["<vault>"]` — skeleton from the templates, missing parts and Restore on the example notes, protected ranges, table shapes, template changes.
- `node tests/plugin.test.js ["<vault>"]` — the editor change filter, check and restore, template changes, commands and settings with mocked Obsidian and CodeMirror; also checks that `main.js` is the build of `src/`.

## License
MIT — see `LICENSE`.
