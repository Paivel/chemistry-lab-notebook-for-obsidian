# Changelog

## 1.4.1 — 2026-11-04
Prepared for the Obsidian community directory.
- Table cells are split at `|` without a regular-expression lookbehind, which iOS before 16.4 does not support (same result: an escaped `\|` stays inside the cell).
- README: *Network, files and accounts*.

## 1.4.0 — 2026-10-16
- The note number field (`id::` / `id1::`, e.g. `**id1**:: 005`) is protected together with its value; Restore writes it with the number of the note.

## 1.3.0 — 2026-10-16
- HTML lines of the template, such as the page break for PDF export (`<div style="page-break-after: always;"></div>`), are protected and restored (at the end of the note).
- The command *Use this note as the template reference of its project* is removed: the rules always come from the project template.

## 1.2.0 — 2026-10-16
- Setting **Protect all Dataview fields**: the labels of fields that are not in the template (`key::`, `**key**::`, `- key::`, inline `[key:: …]`, `(key:: …)`) are protected too; values stay editable. Off by default.
- Setting **Hotkey to lock / unlock a note** opens Settings → Hotkeys at the plugin's commands.

## 1.1.2 — 2026-10-16
- Table cells can be edited in Live Preview: Obsidian's table editor rewrites the whole table (new column widths) on every keystroke, which was refused. A change touching table pipes is now allowed when every table keeps its structure (same first word of the header, same number of columns, valid separator, no row lost).

## 1.1.1 — 2026-10-16
- The first word of a table header (`| TLC `, by which plugins find the table) is protected too; the rest of the header cell stays editable.

## 1.1.0 — 2026-10-16
- No reference note needed: every project template (`Templates/<code>_.md`) is guarded automatically, also a template created later. The reference note command is optional. *Stop guarding* keeps a project off.

## 1.0.2 — 2026-10-16
- A part removed from the project template is no longer protected or restored; existing notes keep it. Templates changed while Obsidian was closed are compared at start.

## 1.0.1 — 2026-10-16
- Headings can no longer be extended (`#### NMR` + `abc`); no text can be typed in front of a protected line, and deleting a line break cannot glue text to a protected line. In the title (`# Exp_12 Suzuki`) only a space may follow the code; the name after it stays editable.

## 1.0.0 — 2026-10-16
- Reference note per project; protection of template parts in the editor; check and restore of missing parts and short table rows; new template parts offered for the existing notes of the project.
