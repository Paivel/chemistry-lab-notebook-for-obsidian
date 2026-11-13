# Template Guard guide

Template Guard keeps the structure of reaction notes intact: the headings, field labels, tables and buttons that come from the project template cannot be broken by accident, notes that lost a part are repaired, and fields you add to a template reach the notes that already exist.

*The pictures below are illustrations of the plugin's windows and messages, not screenshots.*

## Installation

Template Guard is already installed and enabled in this vault. To install it in another vault or to update it:

1. Close Obsidian (or be ready to restart it).
2. Copy the folder **template-guard** (with `main.js` and `manifest.json` inside) into the plugins folder of the vault: `<vault>/.obsidian/plugins/`. The `.obsidian` folder is hidden: on macOS press Cmd+Shift+. in Finder, on Windows turn on *View → Show → Hidden items*. When updating, replace the old folder; the settings (`data.json`) are kept if you copy only the files of the new version over it.
3. Start Obsidian, open **Settings → Community plugins**, turn off *Restricted mode* if it is on, and switch on **Template Guard** (press the refresh button next to *Installed plugins* if it is not listed).

Template Guard works on desktop and mobile. It needs project templates named after the project code (`Templates/Exp_.md`) and reaction notes in the **Journal** folder; both folders can be changed in the settings.

## Setup

There is nothing to set up. Template Guard is enabled in this vault and reads its rules from the project templates in the **Templates** folder: `Exp_.md`, `PAS_.md`, and any template named *code*`_.md`. A project created later with **add project** is guarded as soon as its template appears.

A note belongs to a project when it is in the **Journal** folder (any subfolder, including **Finished**) and its name starts with the project code: `Exp_12 Suzuki` belongs to project `Exp`.

You can see the guarded projects in **Settings → Template Guard**. **Stop guarding** switches a project off (it stays off after a restart); **Guard** switches it on again.

![[Template Guard-9.png|560]]

## What is protected

In every note of a guarded project:

- **section headings** (`## TLC`, `#### NMR`): they cannot be deleted, and nothing can be added to them. In the title `# Exp_5 Suzuki`, only `# Exp_5` is fixed; the name after the code can be edited;
- **field labels** up to `::` (`**yield**::`): the value after `::` is typed as usual;
- **the note number** `**id1**:: 005` (`id::`, `id1::`, `id2::`, …) together with its value: the next note number is counted from it. If it is missing, Restore writes it with the number of the note;
- **tables**: the `|` borders, the `| --- |` line and the first word of the header (`TLC`), by which the plugins find the table;
- **button blocks** (Add NMR, Open in TopSpin, Add Mass, Finish);
- **the page break** at the end of the note (`<div style="page-break-after: always;"></div>`), which starts each reaction on a new page in the PDF report. If it is missing, Restore puts it back at the end of the note.

Everything else is free: field values, table cells, the procedure, comments, images.

![[Template Guard-1.png|560]]

In Live Preview you can type in any cell of a table, change the header after `TLC` and add rows. Deleting a column or a row, or renaming `TLC`, is refused.

![[Template Guard-2.png|560]]

When you try to change a protected part, nothing happens and a short message appears:

![[Template Guard-4.png|380]]

### All Dataview fields (optional)

By default only the fields of the template are protected. Switch on **Protect all Dataview fields** in the settings to protect the labels of every field in the notes of guarded projects as well — fields you added by hand (`purity::`, `**color**::`, `- Rf::`) and inline fields (`[catalyst:: Pd]`, `(solvent:: THF)`). Their values stay editable. These fields are only protected; they are not restored if they are missing, because they are not part of the template. Frontmatter and code blocks are not affected.

Plugins and buttons that write into notes (CDX Scheme Image, TLC Photo Inbox, Add NMR, Add Mass, Templater) are not affected.

## Changing the structure of one note

Click **🔒 Template** in the status bar (bottom right). The note is unlocked until you click again or restart Obsidian. The command **Template Guard: Lock / unlock the template in this note** does the same, and you can give it a hotkey: **Settings → Hotkeys**, search for *Template Guard*, click **+** next to *Lock / unlock the template in this note* and press the keys (for example, Ctrl/Cmd+Shift+L). The **Set hotkey** button in the Template Guard settings opens that page.

![[Template Guard-10.png|560]]

![[Template Guard-3.png|560]]

## Missing parts: check and restore

When you open a note, Template Guard compares it with the template once per session. If a part is missing (for example, it was deleted on a phone without the plugin, or the note is older than the template), it lists what is missing and offers **Restore**. Restore puts each part back in its place and pads table rows that lost cells. It does not delete or change anything else.

![[Template Guard-5.png|470]]

The command **Template Guard: Check this note against the template** runs the check at any time.

## Adding a field to all notes of a project

1. Add the field (or a heading, table or button) to the project template, for example `Templates/Exp_.md`, and save it.

![[Template Guard-6.png|480]]

2. Template Guard asks whether to add it to the notes of the project. **Add to notes** puts it after the same neighbour as in the template (here after `MW::`) in every note that does not have it, including finished notes. From then on, the new field is protected too.

![[Template Guard-7.png|470]]

The command **Template Guard: Add missing template parts to all notes of this project** adds everything missing in all notes of the project at once, with a list first.

## Removing a field from the template

When you delete a field from the project template, Template Guard stops protecting and restoring it. It does not delete it from existing notes: old notes keep it as ordinary text, and new notes are created without it.

![[Template Guard-8.png|380]]

Renaming a field in the template counts as removing the old field and adding a new one: old notes keep the old field, and the new one is offered.

## Good to know

- The protection works only in Obsidian with the plugin enabled. Edits made elsewhere are found by the check when the note is opened.
- New notes are named right away by their code and number (`Exp_5`); the name after the code in the title is added to the file name automatically.
