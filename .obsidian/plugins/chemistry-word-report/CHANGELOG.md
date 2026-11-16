# Changelog

## 1.2.4 — 2026-11-16
- `[[mass]] mg` and `[[calcmass]] mg` of 1 g or more are written in g with two decimals (`2.06 g`), below 1 g in mg as before (`71 mg`, `6.5 mg`). This follows CDX Scheme Image 1.8.13, which writes `mass::` of 1 g or more in g; an older `mass:: 2057.0 mg` also gives `2.06 g`.

## 1.2.3 — 2026-11-04
Prepared for the Obsidian community directory.
- The settings use Obsidian's own section headings (*Folders*, *Default placeholder values*, *Custom placeholder defaults*, *Text formula*) instead of HTML headings; the heading with the plugin's name at the top is gone (Obsidian shows it already).
- README: *Network, files and accounts* (no network; the output folder may be outside the vault; the report opens in the system's program for `.docx`).

## 1.2.2 — 2026-11-03
- **¹H frequency as a number:** `frequency:: 600 MHz` gave "¹H NMR (600 MHz MHz, …)". The ¹H line now takes the number from the field and rounds it like the other nuclei (`600 MHz`, `600.13` → 600).
- **NMR header pasted into a field:** a field that starts with a header copied from a paper or SI — `1H NMR (500 MHz, C6D6) δ 7.5, …`, `13C{1H} NMR (126 MHz, chloroform-d): δ …`, any of the eight nuclei — is no longer printed twice: the header is taken off (the report writes its own from `frequency::` and `solvent::`) and compared with the note. The notice after the report lists a header of another nucleus than the field, a frequency more than 1 MHz away from `frequency::` (for ¹³C, ¹⁹F, ³¹P … from Ξ × `frequency::`), and another solvent (chloroform-d = CDCl₃, DMSO-d₆ = (CD₃)₂SO and similar names count as the same). An empty `frequency::` or `solvent::` is taken from the header, before the defaults of the settings, and the notice says so.
- **Separators:** two or more empty NMR sections next to each other keep the stronger separator, as 1.1.4 promised ("…(s, 3H). APCI …", was "…(s, 3H); APCI …"); a formula line holding only an empty section (`[[FNMR]].` with no `FNMR::`) gives no paragraph instead of a lone ".".
- The example report (Draft SI.docx) is unchanged.

## 1.2.1 — 2026-10-22
- **A field written twice is shown, not resolved** (PLUGIN_FIXES_REVIEW2 2026-10-22, N9): a field on more than one line of a note becomes the visible placeholder `[yield: field appears twice]` wherever it is used (in `[[mass]] mg` the unit is left out; `[[calcmass]]` shows the placeholder of the duplicated MW, scale or yield), and the notice lists the note and the fields. Fields shown as examples in inline code or inside a code block do not count. The output for notes with one line per field is unchanged (Draft SI.docx of the examples identical).

## 1.2.0 — 2026-10-22
Fixes from the pre-submission review (PLUGIN_FIXES_FROM_REVIEW 2026-10-22): no calculated or default value is shown as if it were recorded.
- **`[[mass]]` is the weighed mass** from the note's `mass::` field (written by CDX Scheme Image 1.8.7 from the reagent table), formatted as before (one decimal below 10 mg, whole mg above). Without `mass::` the report shows **`[mass not recorded]`** (and `[[mass]] mg` drops its unit) and the notice lists the note. Text typed by hand is written as it is.
- **New `[[calcmass]]`**: the former calculation MW × scale × yield / 100; the notice names the notes where it was used, and a missing input gives `[calculated mass: MW, scale or yield missing]` instead of `XX`.
- **No silent defaults:** the built-in defaults (procedure A, scale 0.2 mmol, ionization APCI) are removed. A missing scale, procedure or ionization is written as `[scale]`, `[procedure]`, `[ionization]` and listed in the notice; defaults set deliberately in the settings still apply and the notice lists the notes that used them.

## 1.1.7 — 2026-10-21
- The report's default font is "Arial" (was "Arial (Body CS)", a Word theme name that is not a font: Word and LibreOffice then fell back to another font).

## 1.1.6 — 2026-10-21
- Negative NMR shifts get the minus sign as ACS writes it: a hyphen before a number at the start or after a space, bracket, comma, semicolon or = becomes − (δ −60.60, −61.53). A hyphen between two numbers is still a range (en dash).

## 1.1.5 — 2026-10-21
- NMR solvent as ACS writes it: the d of a deuterated solvent name is italic (DMSO-*d*₆, acetone-*d*₆, methanol-*d*₄; a d after a hyphen and before a digit); the digits stay subscripts. CDCl₃, C₆D₆ and D₂O are unchanged.

## 1.1.4 — 2026-10-21
- An NMR line or HRMS with no value in the note is left out of the paragraph together with its separator: `[[HNMR]]; [[CNMR]]; [[FNMR]]. [[HRMS]].` without ¹⁹F gives "…; ¹³C NMR … 56.2. APCI …", no longer "56.2; . APCI". Where two separators meet, the stronger one stays (. before ; before ,); a separator left at the start of the line is removed. Other placeholders are unchanged.

## 1.1.3 — 2026-10-21
- Isolated mass (`mass`): below 10 mg it is written with one decimal (6.46 mg → 6.5, was 6), as usual in Supporting Information; from 10 mg on in whole mg. A half is rounded up (142.5 → 143, 137.5 → 138; was rounded to even like Python's round, 142.5 → 142).

## 1.1.2 — 2026-10-21
- NMR frequencies are all calculated from the IUPAC frequency ratios Ξ × ν(¹H), rounded to the nearest MHz; the fixed table for 400 and 500 MHz is gone. Only ¹⁹F changes: 376 MHz (was 377) at 400 MHz and 470 MHz (was 471) at 500 MHz; the other nuclei gave the same values.

## 1.1.1 — 2026-10-09
- Internal: the Dataview selection and the inline-field reading now come from `shared/obsidian` (also used by the ORD export of Reaction Structure Search 1.2.0). No user-visible change (report text identical; tests 16/16).

## 1.1.0 — 2026-10-09
- The notes for a report are taken from the Dataview query in the active note through the Dataview API. Dataview Serializer is no longer needed, and no temporary `QueryToSerialized` note is created or deleted.
- `TABLE` (also `TABLE WITHOUT ID`, with the note link in any column) and `LIST` queries are supported; grouped results are flattened. `dataviewjs`, `TASK` and `CALENDAR` queries give a clear message.
- Without a query, a Markdown table of note links in the active note is used (hand-written or frozen with Dataview Serializer).
- Notes are read from the exact files Dataview returns instead of being looked up by name.
- The generation window shows the source (query or table), the number of notes, the query, and linked notes that do not exist. Notes skipped for a missing `num_in_article` are listed after generation.
- Waits for the Dataview index after Obsidian starts (up to 10 s).

## 1.0.2
- Heteronuclear NMR frequencies for any ¹H frequency (IUPAC ratios); 400/500 MHz values unchanged.

## 1.0.1
- `[[mass]]` = MW × scale × yield / 100 (isolated mass).

## 1.0.0
- First release.
