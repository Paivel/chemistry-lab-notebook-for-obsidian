# Chemistry Word Report

An Obsidian desktop plugin that turns reaction notes listed in a Dataview table into an editable Word (DOCX) draft of chemistry Supporting Information: compound names, structure images, yields, and NMR/HRMS data formatted in ACS style.

Report generation runs entirely inside Obsidian. Python, Microsoft Word, a separate backend, and an internet connection are not required.

The plugin was developed for the Chemistry Lab Notebook for Obsidian vault but can be used in any vault whose reaction notes store data in Dataview inline fields.

## Requirements

- Obsidian 1.14 or later, desktop (tested on Windows and macOS; older versions are not tested)
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) (for reports from a Dataview query; not needed for a hand-written table)

## Installation

The plugin is not yet listed in the Obsidian Community Plugins directory; until it is, install it manually.

Manual installation: download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release of this repository, place them in `<vault>/.obsidian/plugins/chemistry-word-report/`, restart Obsidian, and enable the plugin under **Community plugins**.

## Setup

In the plugin settings, set the folder containing the reaction notes, the output folder for reports, and the image folder. Each path may be relative to the vault, absolute, or start with `~`. The reaction-notes folder and the image folder must exist.

## Use

1. Open a note that lists the reaction notes, either
   - with a fenced Dataview query (```` ```dataview ````), `TABLE` or `LIST`, whose rows link to the reaction notes (for example `TABLE WITHOUT ID file.link, yield FROM #report`). The first link to a note in each row is used; links to images are passed over. If the note has several Dataview blocks, the first one is used. `dataviewjs` blocks are not supported; or
   - without a query, with a Markdown table whose first column contains `[[links]]` to the reaction notes (written by hand, or frozen earlier with Dataview Serializer).
2. Run **Chemistry Word Report: Generate Word report from active Dataview table**, or click the ribbon icon.
3. The query is run through the Dataview API (relative sources such as `FROM [[]]` refer to the active note). No temporary notes are written. Right after Obsidian starts, the plugin waits up to 10 s for Dataview to finish indexing.
4. The window that opens shows where the notes come from, how many were found, and linked notes that do not exist. Check or edit the text formula, then click **Generate**.
5. The DOCX file is saved in the output folder as `NMR_Report.docx` (then `NMR_Report_1.docx`, `_2` …; existing reports are never overwritten) and opened in the default application. Notes without `num_in_article` are skipped and listed in the message. Compounds are ordered by `num_in_article` (1, 1a, 2.3 …), not by the order of the table rows.

Notes are read from the exact files Dataview returns, so they may also lie outside the reaction-notes folder.

## Text formula and fields

Each compound gets a heading `Name::` (**num_in_article**), the structure image from `pic::` (an embed `![[file]]`, looked up in the image folder and its subfolders; PNG, JPG, GIF, BMP or TIFF — SVG is not supported; 2 in wide), and the text formula. Only inline fields (`key:: value`) in the note text are read, not YAML properties; if a field appears twice, the last one is used. The document is Arial 12 pt on US Letter pages.

Write data in reaction notes as Dataview inline fields, for example `**yield**:: 82%`, and use them in the text formula as `[[yield]]`.

- Default values for `procedure`, `yield`, `MW`, `eluent`, `state`, and `scale` can be set in the plugin settings; they are used only when a field is absent or empty in a note, and the report lists the notes that use one. They are empty by default: a missing scale or procedure is written as `[scale]` or `[procedure]` and listed in the report, so a gap is never filled silently.
- Additional placeholders and their defaults can be added under **Custom placeholder defaults**.
- Special placeholders: `HNMR`, `CNMR`, `FNMR`, `DNMR`, `PNMR`, `SiNMR`, `BNMR`, `15NNMR`, `HRMS`, `mass` and `calcmass`. `mass` is the isolated mass as weighed, from the note's `mass::` field (`71 mg`, `2.06 g`; CDX Scheme Image writes it from the reagent table), in mg with one decimal below 10 mg (6.5) and whole mg above (71, 143), halves rounded up; in `[[mass]] mg` a mass of 1 g or more is written in g, without trailing zeros (`2.06 g`, `1.2 g`), the same for `[[calcmass]] mg`; without `mass::` the report shows `[mass not recorded]` (in `[[mass]] mg` the unit is then left out) and lists the note; a text such as `not isolated` is written as it is. A field written on more than one line of a note is never resolved silently: it shows as `[yield: field appears twice]` and the notice lists the note. `calcmass` is the calculated mass MW × scale × yield / 100 for those who want it (`yield` as `82%` or `82`); the report says which notes use it, and with MW, scale or yield missing it shows `[calculated mass: MW, scale or yield missing]`. An NMR line or `HRMS` without a value is left out together with its separator (no "; ." when, for example, `FNMR::` is empty; of the separators around several empty sections the strongest stays, . before ; before ,; a formula line holding only an empty section gives no paragraph). `HRMS` falls back to `Massd::` when `HRMS::` is empty; the ionization is taken from `Mass_Ionization::` (no default: `[ionization]` when it is empty, listed in the report). `solvent::` is used in the NMR lines (digits as subscripts, the d of DMSO-d6 or methanol-d4 in italics, as in ACS style; in the NMR data a hyphen before a number becomes a minus sign, −60.60, and a hyphen between two numbers an en dash).
- NMR frequencies: the `frequency` field is the ¹H frequency of the spectrometer (for example `500`, `600 MHz` or `600.13`). The ¹³C, ¹⁹F, ²H, ³¹P, ²⁹Si, ¹¹B and ¹⁵N frequencies are calculated from it with the IUPAC frequency ratios Ξ (Harris et al., *Pure Appl. Chem.* 2001, 73, 1795) and rounded to the nearest MHz: 400 → ¹³C 101, ¹⁹F 376, ³¹P 162 MHz; 500 → ¹³C 126, ¹⁹F 470, ³¹P 202 MHz; 600 → ¹³C 151, ¹⁹F 565 MHz. The ¹H line uses the number of the field, rounded (`600 MHz`, `600.13` → 600).
- NMR header pasted with the data: an NMR field may start with the header of a paper or SI, as in `1H NMR (500 MHz, C6D6) δ 7.5, 7.4, …` or `13C{1H} NMR (126 MHz, chloroform-d): δ …`. The header is taken off (the report writes its own) and compared with the note: the nucleus with the field, the frequency with `frequency::` (other nuclei with Ξ × `frequency::`, ±1 MHz) and the solvent with `solvent::` (chloroform-d = CDCl3, DMSO-d6 = (CD3)2SO and similar names count as the same). A difference is listed in the notice after the report, for example `IM_7: HNMR:: header "1H NMR (500 MHz, C6D6) δ" does not match the note (500 MHz in the header, frequency:: 400; C6D6 in the header, solvent:: CDCl3)`; the report uses the note's values. An empty `frequency::` or `solvent::` is taken from the header (before the defaults of the settings), and the notice says so.
- Use `**text**` for bold and `*text*` for italics. The generation window lists all placeholders; clicking one inserts it at the cursor.

## Building from source

The plugin has no npm dependencies (the docx library is vendored in `src/vendor/`). In the source repository, `node build.mjs` bundles `src/` and the shared modules in `../shared/` into a single `main.js` (needs `../tools/bundle.mjs`); `main.js` is attached to each GitHub release.

## Tests

The tests are in the plugin's source repository (with the sources and fixtures), not in the vault's plugin folder.

Plain Node.js scripts (Node 22, no dependencies), run in this folder; each prints `PASS`/`FAIL` per check, ends with `N/M passed` and exits non-zero on a failure. `<vault>` is the published example vault; it is only read (reports go to temporary folders or a temporary copy of the vault).

- `node tests/report.test.js "<vault>"` — the report of IM_1 and IM_2 against `docs/examples/Draft SI.docx`, masses, placeholders, NMR/HRMS formatting, NMR headers pasted into a field, order and skipped notes.
- `node tests/select.test.js` — note selection from a Dataview TABLE/LIST result (fake Dataview API) and from a static table.
- `node tests/plugin.test.js "<vault>"` — command, report window, notices and settings with mocked Obsidian and Electron; also checks that `main.js` is the build of `src/`.

## Network, files and accounts

All note parsing and report generation run locally. The plugin makes no network requests and needs no account. It reads the selected notes and their pictures and writes `NMR_Report.docx` into the output folder, which may be a folder outside the vault (an absolute path or `~/…`, as set in the settings); the finished report is opened in the program your system uses for `.docx` files.

## License

MIT License; see [LICENSE](LICENSE). The bundled docx library and its dependencies are distributed under their own permissive licenses; see [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
