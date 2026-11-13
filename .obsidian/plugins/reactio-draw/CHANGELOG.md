# Changelog

## 0.10.1 — 2026-11-13
- **Fix: the Reactio Draw tab did not open in Obsidian 1.15** (*View failed to load … reading 'path'*). The view had a method `load(file)`; Obsidian 1.15 calls a view's own `load()` (from Obsidian's Component) without arguments when it opens it. The method is now `loadFile(file)`. The load test now builds the view on native Obsidian classes and calls `load()` as Obsidian 1.15 does.
- **Fix: stereo kept in SMILES and InChI of a drawing opened from a note.** Reactio Draw reports *ready* before the end of its page has been read, where OpenChemLib sits; a drawing set at once then lost its stereo for the session (*Stereo (wedges, @, E/Z) is left out of the SMILES and InChI*). Commands now also wait for the page's load event.
- Checked in Obsidian 1.15.1 on Linux: the tab opens, `IM_1.cdxml` opens with its tables, and its SMILES keeps `@`/`@@`.

## 0.10.0 — 2026-11-13
- **Reactio Draw 1.15.2** (tag v1.15.2, commit 5eeaf67; `reactio/reactio.html` is `Reactio Draw.html` of `ReactioDraw-Web.zip`, identical to `index.html` of the tag). `main.js` grows to about 13 MB. New since 1.7.1, among others: names → structures read in the page itself (OPSIN compiled to JavaScript, Octet Draw's name tables, a Wikidata dictionary with CAS numbers, ChEBI drawings of natural products), the CAS number in Properties, pKa estimates, animations between two drawings, cyclohexane boats and twist-boats, metal complexes drawn and laid out as chemists draw them, labels placed as ChemDraw places them (NH with the H above, HO2C right-justified).
- **Reactio Draw's licence is now the Mozilla Public License 2.0** (from Reactio Draw 1.15; up to 1.14.1 it was AGPL-3.0-or-later). The MPL-2.0 covers Reactio Draw's own files only, so this plugin's `main.js` is no longer AGPL as a whole: the wrapper is MIT (`LICENSE`, formerly `LICENSE-MIT`), the page inside it MPL-2.0 (`reactio/LICENSE.txt`). New licence files of Reactio Draw's components: Octet Draw (Apache-2.0), OPSIN in JavaScript, Dimorphite-DL (Apache-2.0), cdxmorph (MIT), ChEBI (CC BY 4.0), Wikidata (CC0).
- **Structure from a name** uses the page's own name reader first, so systematic names and CAS numbers work without the Reactio Draw app; *Name the selected structure* still needs the app. Settings and README say so.
- **Network** (README): Reactio Draw's page goes online only on its *Check for updates* (GitHub) and *Search PubChem* (sends the InChIKey of the selected compound) buttons.
- Checks: the bridge tests in headless Chromium pass on 1.15.2 (and still on 1.7.1). IM_00 opened and saved again is byte-identical; IM_1 and IM_2 keep their Reactio record (structures, table, conditions) and SMILES, and their CDXML gains ChemDraw's label places (`LabelAlignment="Above"` on the product's NH, right-justified HO2C labels) on the first save. CDX Scheme Image draws such a file as before, the NH now with the H above the N as Reactio Draw shows it (test added); the tables are unchanged.

## 0.9.0 — 2026-11-04
Prepared for the Obsidian community directory, which installs only `main.js`, `manifest.json` and `styles.css`.
- **Reactio Draw's page is built into `main.js`** (`build.mjs`) and written to `reactio/reactio.html` in the plugin folder when the first drawing tab opens, if it is missing or differs from the built-in one; nothing is downloaded. `main.js` grows to about 7 MB. The vault still ships `reactio/` with the page and its licences; the plugin finds the same page there and leaves it.
- **Styles in `styles.css`** instead of the code (the drawing tab, the frame, the scheme picture, the name window).
- Drawing tabs are no longer closed when the plugin is unloaded (Obsidian's guidelines): they stay where you put them.
- The description no longer names Obsidian; the README lists network use (none by the plugin; Reactio Draw's *Check for updates* button asks GitHub), the programs it can start and the files it writes.
- `update-reactio.mjs`: one command puts a new Reactio Draw web version into the plugin, sets the version, builds and tests.
- Checks: `tests/page.test.js` (12): the page in `main.js` equals `reactio/reactio.html`; written on a fresh install, kept when the same, replaced when changed or unreadable, prepared once per session.

## 0.8.0 — 2026-11-03
- New setting **Open reaction files in**: *Reactio Draw tab in Obsidian* (as before, the default) or *Default program outside Obsidian*. In the second mode a click on the placeholder picture of a reaction note creates `A_122.cdxml` as a blank sheet (Reactio Draw's own blank CDXML: ACS document settings, Arial, no Reactio record), changes the note's link from `A_122.cdx` to `A_122.cdxml`, and opens the file in the program the system uses for `.cdxml` (ChemDraw, the Reactio Draw app…); an existing `A_122.cdx` or `A_122.cdxml` (the newer one if both exist) opens as it is. A click on the scheme picture `A_122 scheme.svg` opens the file the same way, also for ChemDraw files. When the program saves the file, CDX Scheme Image puts the scheme and the table into the note as for any reaction file; the blank file itself changes nothing (the placeholder stays). If no program is set for the file type, a notice says so.
- Checks: with a mocked Obsidian and Electron, both modes for a new note, an existing `.cdx`, both files, no program for the type, the scheme click and the placeholder click (11/11); CDX Scheme Image reads the blank file as "nothing to draw" and keeps the current picture.

## 0.7.1 — 2026-11-02
- Reactio Draw 1.7.1 (tag v1.7.1, commit 5860926; `reactio/reactio.html` is `Reactio Draw.html` of `ReactioDraw-Web.zip`, identical to `index.html` of the tag): hotkeys follow the letters printed on the keys (AZERTY, QWERTZ); keyboards whose letters are not Latin (Russian, Greek) use the key's place, as before. License files unchanged.
- Ctrl/Cmd+S (save and close) and Ctrl/Cmd+W (close) in a Reactio tab are found the same way: the Latin letter printed on the key, or on a keyboard with non-Latin letters the key's place. Before, with a Russian layout Ctrl+S opened Reactio Draw's own "Save as which format?" box instead of saving and closing the tab, and Ctrl+W did nothing.
- Checks: headless Chromium bridge test 10/10 with 1.7.1; IM_00, IM_1 and IM_2 saved by 1.7.1 give the same CDXML and the same Reactio document as with 1.3; the key letter for US, Russian, AZERTY, QWERTZ and Greek layouts 11/11.

## 0.7.0 — 2026-11-02
- Reactio Draw 1.7 (tag v1.7, commit 1347d0b; `reactio/reactio.html` is `Reactio Draw.html` of `ReactioDraw-Web.zip`, identical to `index.html` of the tag). New since 1.3, among others: Clean Up 2D and Clean Up of a part, a foldable side panel (1.4); 3D styles (ball and stick, tubes, spheres), crystal structures from CIF, more Clean Up layouts (1.5); multi-step CDX/CDXML grids read into the right step (1.5.1); XYZ files with a conformer search, R/S and E/Z labels, cLogP/TPSA, Markush structures (1.6); predicted ¹H multiplicities and couplings, isotopes, orbitals and mechanism arrows, chair and bridged templates, Mirror label; the reagent table keeps the equivalents when the limiting reagent's amount is typed (1.7). Licence files: `LICENSE.txt` unchanged; `LICENSES/xyzrender-MIT.txt` and its line in `THIRD-PARTY-NOTICES.md` added.
- The wrapper is unchanged. Checks in headless Chromium: the commands the wrapper uses (set, export cdxml/json/svg/smiles, list, selection, zoom, markSaved, saved, addSmiles, smilesFromName, events ready/change) answer as before (10/10); IM_00, IM_1 and IM_2 opened and saved by 1.7 give the same CDXML and the same Reactio document as with 1.3, so the reaction search, ORD/PubChem export and CDX Scheme Image read them the same way. `list` now also gives each structure's `id` (not used by the wrapper).

## 0.6.3 — 2026-10-22
- Reactio Draw 1.3 (tag v1.3; `reactio/reactio.html` is `Reactio Draw.html` of `ReactioDraw-Web.zip`, identical to `index.html` of the tag): Clean Up keeps R/S and E/Z; fused rings laid out on the hexagon grid (acenaphthene flat, fluorene symmetric); reagents written as text (MeMgBr, K2CO3) stay text and are counted in the reagent table, with a button to attach a structure to a text; more abbreviations from BChemLookup (CC0, now listed in THIRD-PARTY-NOTICES); the version in Info. The wrapper is unchanged. Checks: the bridge tests in headless Chromium pass, and IM_00, IM_1 and IM_2 opened and saved again by 1.3 give byte-identical files to 1.2, so the reaction search, ORD/PubChem export and CDX Scheme Image read them the same way.

## 0.6.2 — 2026-10-20
- When a reaction file `A_122.cdxml` is created from the placeholder, the note's link to `A_122.cdx` (from the templates) is changed to `A_122.cdxml`, so the link is not broken.

## 0.6.1 — 2026-10-20
- Reactio Draw 1.2 (tag v1.2): CDX/CDXML import keeps bold double bonds, generic labels (OR, NR2, CO2R, Ar), formula-style captions, curved arrows, brackets; a new color-blind-safe theme; and the 1.1 changes (foldable top bar, curved-arrow ends, orbitals). License files unchanged.

## 0.6.0 — 2026-10-19
- Reactio Draw 1.0.1, the first public release (https://github.com/Paivel/reactio-draw, AGPL-3.0-or-later): `reactio/reactio.html` is the `index.html` of tag v1.0.1, with its LICENSE, THIRD-PARTY-NOTICES and LICENSES (now also go-ole).
- Reactio Draw documents (`.reactio`, the JSON documents of the Reactio Draw apps) open in the tab (file menu *Edit in Reactio Draw*, or *Open*) and are saved back in place.

## 0.5.1 — 2026-10-18
- Reactio Draw web version of 2026-10-18: group labels left of a bond (HO2C, F3C) are written as ChemDraw writes them (text in normal order, right-justified), so ChemDraw and ChemDraw Scheme Image show them the right way round.

## 0.5.0 — 2026-10-17
- Part of the main vault (merged from the test branch). Reactio Draw web version of 2026-10-17 (its binary CDX now has ChemDraw's 22-byte header and an Arrow object).

## 0.4.6 — 2026-10-17
- One Reactio tab per file: opening a file that is already open (placeholder or scheme click, Open a drawing file, Edit in Reactio Draw) brings its tab to the front instead of opening a second one.

## 0.4.5 — 2026-10-17
- Ctrl/Cmd+S saves and closes the Reactio tab, like Ctrl/Cmd+W (the side panels come back). A new drawing asks for a name first; cancelled, it stays open. Placeholder text updated.

## 0.4.4 — 2026-10-17
- Side panels are hidden only while a Reactio tab is the active tab: switching to a note (for example after Ctrl/Cmd+S, which keeps the drawing open) brings them back, switching to the drawing hides them again.

## 0.4.3 — 2026-10-17
- Side panels: hidden when a Reactio tab opens and restored when the last one closes, judged from the Reactio tabs that really exist instead of a counter (a tab restored at start or closed another way left the counter wrong, so the panels were no longer hidden).

## 0.4.2 — 2026-10-17
- The placeholder is recognised by its name whatever its format: notes made from the earlier template (`Click to draw the reaction.png`) open Reactio Draw again.

## 0.4.1 — 2026-10-17
- Ctrl/Cmd+S while the drawing has the focus: Reactio Draw's own “Save as which format?” box is closed again (Escape) after the plugin has saved the file.

## 0.4.0 — 2026-10-16
- Names through the installed Reactio Draw app (its command line `reactio op …`): **Name the selected structure** (IUPAC name, with the OPSIN check; copy or insert into the note) and **Structure from a name** (common names in Reactio itself, systematic names through the app). Setting *Reactio Draw app*; found automatically in the usual install places.

## 0.3.1 — 2026-10-16
- Ctrl/Cmd+S in a Reactio tab saves the drawing (also while the drawing has the focus). The placeholder is now a vector picture (`Click to draw the reaction.svg`).

## 0.3.0 — 2026-10-16
- Reaction notes: a click on the template picture under **Table** creates `Files/<code>.cdxml` (code from the note name) and opens it; a click on the scheme picture drawn from a Reactio CDXML opens it again. Closing the tab (Ctrl/Cmd+W or ×) saves without a question (also `.rdraw` schemes). Ctrl/Cmd+W works inside the drawing (Electron `before-input-event`). Side panels hidden while a Reactio tab is open and restored afterwards. Settings: reaction folder, placeholder picture, hide side panels.

## 0.2.0 — 2026-10-16
- Schemes in notes are `.rdraw` files (SVG + drawing) instead of `.svg`: Obsidian no longer treats them as images (no zoom on click); the plugin draws the picture in the note (Live Preview and Reading view) and a click opens it in Reactio Draw. `![[x.rdraw|300]]` sets the width. An open drawing is brought to the front instead of opening a second tab.

## 0.1.0 — 2026-10-16
- Reactio Draw (web version, unchanged) in an Obsidian tab: search queries for Reaction Structure Search, editable SVG scheme pictures in notes (double-click to edit), CDXML drawings with the full Reactio document. No autosave.
