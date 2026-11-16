# Changelog

## 1.8.13 — 2026-11-16
- **Labelled atoms (isotopes).** An atom with a mass number (Isotope in the file: ¹⁵N, ¹³C) is drawn with the number as a superscript before the element, as ChemDraw and Reactio Draw show it. Reactio Draw writes the label without the number (`N`) and a labelled carbon without any label: the plugin adds the number, and for such a carbon the label with its hydrogens (H₃¹³C, ¹³CH₂…), written on the side away from the bonds. A ChemDraw label that already holds the number (`13CH3`) keeps it, raised; D and T stay as they are.
- In formulas the mass number in brackets is raised, not lowered: `C16H11N2[15N]` → C₁₆H₁₁N₂[¹⁵N] in the reagent table (ChemDraw and Reactio Draw tables) and `Na[15N]O2` typed next to the arrow → Na[¹⁵N]O₂. Other numbers in brackets in plain text (`[15]`) stay as written.
- **Mass picture of a labelled product.** `Mass_pic::` was not made for a formula such as `C16H11N2[15N]` (the formula was not understood). Now every bracketed atom counts as that isotope: Exact Mass 246.0923 for C₁₆H₁₁N₂[¹⁵N]; radiolabels (³H, ¹¹C, ¹⁴C, ¹⁸F, ³²P, ³⁵S, ¹²⁵I, ¹³¹I and others) from AME2020 masses.
- **`mass::` as the table shows it.** The product mass goes into the note below 1 g in mg and from 1 g on in g (`2.06 g`; before: `2057.0 mg`), with at most two decimals and without trailing zeros: `716.00 mg` in the table → `716 mg` (before: `716.0 mg`), `25.70 mg` → `25.7 mg`, `312.19 mg` → `312.19 mg` (before: `312.2 mg`). A mass the plugin wrote before is replaced the next time the reaction file is saved; the example notes now say `775 mg`, `71 mg`, `79 mg`.
- **A salt saved as cation and counter-ion** (Reactio Draw saves the triazenium cation and `PF6` as two structures, with one product column in the table) counts as one product, as in Reactio Draw: `yield::`, `mass::`, `MW::` and `pic::` are filled again (before, the plugin saw two products and filled nothing). The product picture shows both ions. The mass picture for `Mass_pic::` is made for the **cation**, which is what HRMS sees: the salt's formula from the table minus the counter-ion, with its charge (C₂₂H₁₆N₂[¹⁵N]⁺, 323.1309, instead of the whole salt, 468.0956). A label is a counter-ion when the label table gives it a charge (PF6, BF4, SbF6…, as Reactio Draw reads labels) or it is a common anion (OTf, OTs, NTf2, BArF, ClO4, Cl, Br, I…); with an unknown one the mass picture shows the whole salt. Two structures without a reagent table, or with two product columns, are still two products.
- Pictures of files without labelled atoms are unchanged (snapshot tests byte-identical).

## 1.8.12 — 2026-11-03
- **Mass picture of an ion** (`Mass_pic::`): the formula of a charged product from ChemDraw's reagent table, such as `C7H5O3-` or `C25H20Cl2N3+`, was read with the digits before the sign as the size of the charge (charge −3 and one O), so Exact Mass and m/z were wrong (35.0119 instead of 137.0244; 134.6985 instead of 432.1029). The digits before the sign are now the element's count — as ChemDraw writes ions in its table and as the formula line of the picture always showed them (O₃⁻). A charge of more than 1 is read after the sign (`+2`, `-2`) or set apart by `^`, a space or a bracket (`^2-`, `]2-`).
- The m/z of the most abundant peak is printed from the same mass as Exact Mass (before, it was rounded to 10⁻⁶ first, so benzene showed Exact Mass 78.0470 but m/z 78.0469). The pictures of the example reactions are unchanged.
- README: the yield rule for 0 % next to a weighed mass described again as the plugin does it since 1.8.9.

## 1.8.11 — 2026-11-03
- Atom labels with the H over or under the atom (ChemDraw: Text → Alignment → Above/Below, saved as `LabelAlignment="Above"`/`"Below"`) are drawn as in ChemDraw: the element on the atom, the H (H2, …) on the line above or below, and the bonds stop at the element's letter. Before, such an NH was drawn as "NH" in one line above the atom, with the bonds meeting at an empty point. The CDXML reader now keeps `LabelAlignment`. All other drawings are unchanged (22 sample files of ChemDraw and Reactio Draw give byte-identical pictures).
- Note: Reactio Draw 1.7.1 does not yet write the H position into CDXML (an H shown over N on its sheet is saved as "NH" in one line), so its files still show "NH" until Reactio Draw saves `LabelAlignment` like ChemDraw.

## 1.8.10 — 2026-10-22
- **A number of unknown origin is never cleared** (PLUGIN_FIXES_REVIEW3 2026-10-22, N1). 1.8.9 cleared `yield::`/`mass::` also when nothing was recorded for the note — but that record lives in this computer's app data, so on a new computer, after a reinstall or after clearing the app data a value typed by hand was lost at the first save. Now a number is cleared (value removed from the table, or the 0 %-with-mass contradiction) only when the record shows that the plugin wrote exactly this value. Otherwise it is kept and a notice says *yield:: 63% kept: its origin is unknown (the table gives 0% / no yield). Delete it by hand if it is wrong.* The same for `mass::`.

## 1.8.9 — 2026-10-22
Fixes from the second review (PLUGIN_FIXES_REVIEW2 2026-10-22).
- **Small yields are always written:** from 0.95 % whole percent, from 0.1 % one decimal (`0.4%`), below two decimals (`0.04%`; a value that would read 0.00 keeps one significant digit, `0.003%`). A product mass below 0.1 mg is written the same way (`0.03 mg`), never as `0.0 mg`.
- **Contradiction: 0 % or no yield next to a weighed mass above 0** (often a wrong MW or scale in the reagent table). 1.8.8 left the old `yield::` (e.g. 82%) in the note without a word. Now the number is cleared under the provenance rule — only if the plugin wrote it, or nothing at all is recorded for the note yet; a number typed by hand is kept — and a notice always says so: *Yield in IM_1.cdxml is 0% although the product mass is 71.0 mg. Check MW and scale in the reagent table. yield:: was cleared* (or *was kept (typed by hand)*). The same rule now decides when an emptied cell clears a number.
- **A field written twice is never updated:** if `yield::`, `mass::`, `MW::`, `temperature::`, `time::`, `atmosphere::` or `other::` appears on more than one line of the note, nothing is written into it and a notice says *yield:: appears 2 times in <note>. Delete the extra line* (before, the first line was updated while the exports read the last one).

## 1.8.8 — 2026-10-22
- **Reactio Draw: a product mass of 0 gives `yield:: 0%`.** Reactio Draw writes a mass of 0 like an empty one (a hidden 0.00 g cell), so 1.8.7 cleared `yield::` instead of writing 0%; its record (`actual: 0` or empty) now tells them apart: mass 0 → `yield:: 0%`, `mass:: 0.0 mg`; mass empty → both cleared.
- A yield near 0 next to a weighed mass is written (0.04 % → `0.0%`); only a yield that is practically zero (below 0.0001 %, ChemDraw's not-computed value) next to a mass above 0 leaves the field unchanged.

## 1.8.7 — 2026-10-22
Fixes from the pre-submission review (PLUGIN_FIXES_FROM_REVIEW 2026-10-22).
- **A zero or cleared yield no longer leaves an old yield in the note.** A product mass corrected to 0 writes `yield:: 0%`; a yield gone from the table (mass removed, cell empty or hidden) clears a number the plugin wrote before (also a stale number in notes from older versions; a number typed by hand while the file had none is kept). Yields below 1 % keep one decimal (`0.4%`, was skipped as 0). 0 % next to an entered mass — the ChemDraw table did not compute the yield — leaves the field unchanged. Text typed by hand (`traces`, `n.r.`) is never changed.
- **New: measured product mass into `mass::`** (setting *Product mass in mass::*, on): `71.00mg` in the table → `mass:: 71.0 mg`, updated when the mass changes, cleared when it is removed; text typed by hand (`not isolated`) is kept. The reaction-note templates of the vault have the new `mass::` field next to `yield::`.
- `yield::`/`mass::` treat `71.0 mg`, `1.2 g` and `82%` as numbers the plugin may update.

## 1.8.6 — 2026-10-21
- Internal: reading the reaction conditions of a file (caption, Reactio Draw record) moved to the shared library 1.3.3, so the ORD export of Reaction Structure Search reads them the same way. Pictures, tables and fields unchanged (renders of 269 files identical).

## 1.8.5 — 2026-10-20
- Arrowheads larger than the default (ChemDraw head size 1500, 2250 …) are drawn with the right shape: the notch (ArrowheadCenterSize) is in hundredths of the line width like the head size, not a fraction of the head length, so big heads no longer look like a diamond with the line stopping short. Default-size arrows are unchanged. The area of the picture also includes the head width and slanted or vertical arrows.
- The blank file linked from the templates is now `Open CDX Editor.cdx`; it is excluded by default together with the older name `open chem draw.cdx`.

## 1.8.4 — 2026-10-20
- Renamed from "ChemDraw Scheme Image" to "CDX Scheme Image" (ChemDraw is a trademark of Revvity Signals Software, Inc.; the plugin reads its file formats and is not affiliated with it). Plugin id and folder (`cdx-scheme-image`), settings and behaviour are unchanged.

## 1.8.3 — 2026-10-18
- Built with shared library 1.3.1 (the CDXML converter keeps the hydrogen count of atoms). Pictures, tables and fields are unchanged.

## 1.8.2 — 2026-10-17
- Built with shared library 1.3.0 (Reactio Draw record reader for the ORD export of Reaction Structure Search; the CDXML converter writes object tags). Pictures, tables and fields are unchanged.

## 1.8.1 — 2026-10-17
- Conditions in the note fields are plain text: N₂ → N2, superscripts and the minus sign − as ordinary characters (the drawn tables keep the subscripts).

## 1.8.0 — 2026-10-17
- Reaction conditions into the note: a caption with the lines `Temperature: …`, `Time: …`, `Atmosphere: …`, `Other: …` (Reactio Draw writes it; typed like this in ChemDraw it works too), or else the conditions record of a Reactio Draw document, fills the existing fields `temperature::`, `time::`, `atmosphere::`, `other::`. An empty field is filled, a value written from the file before is updated, a value typed by hand is kept. Schemes with several such captions are left out. Setting *Conditions in temperature::, time::, atmosphere::, other::*. Files without such a caption (older ChemDraw files) are handled exactly as before.
- Conditions table from a Reactio record without a caption: a temperature typed by hand (Tm “custom”) and microwave are shown.

## 1.7.3 — 2026-10-17
- Binary `.cdx` files written by other programs than ChemDraw (e.g. Reactio Draw) were read as empty — no picture, no MW/yield: their header has 16 reserved bytes instead of ChemDraw's 10 (shared library 1.2.1).
- An arrow stored only as a Graphic line (no Arrow object, as Reactio Draw writes `.cdx`) is drawn.
- A `.cdx` saved by Reactio Draw carries its document as an object tag `ReactioDraw`: its tables (Reactants, Products, Conditions) are drawn as for its CDXML. ChemDraw's own files are drawn exactly as before.

## 1.7.2 — 2026-10-13
- Web-editor CDXML: Unicode subscript/superscript digits ("N₂" in the conditions caption) are drawn as subscript/superscript digits instead of an empty box; characters beyond Latin-1 no longer turn into control codes (shared CDXML converter). ChemDraw files unchanged.

## 1.7.1 — 2026-10-13
- Web-editor CDXML with several steps: each reagent table gets its own Conditions table (the nearest "Temperature: …" caption) and its own roles (the step whose formulas match the table); none of the condition captions is drawn as text any more. "hν" written with the Symbol font is read as ν.

## 1.7.0 — 2026-10-13
- CDXML saved by the web reaction editor (with its `<!--rd:…-->` record): reagent table in that editor's layout — Reactants / Products tables with a role header row, values with units, "—" for rows that do not apply to a solvent, a Conditions table from the "Temperature: … / Atmosphere: …" caption (`src/rd-table.js`). yield::, MW:: and Mass_pic:: work with these files too. ChemDraw files: drawings byte-identical to 1.6.0.

## 1.6.0 — 2026-10-11
- **Mass picture for `Mass_pic::`:** with one product, `A_141 mass.png` shows the product with *Chemical Formula*, *Exact Mass* and *m/z* (isotope peaks ≥ 1 %, most intense first) like ChemDraw's Analysis window, and is put into an empty `Mass_pic::` field (or one that already shows it). The formula comes from the reagent table; masses are calculated from IUPAC isotope data (`src/mass.js`). Setting *Mass picture in Mass_pic::* (on). Scheme and product pictures unchanged.

## 1.5.2 — 2026-10-10
- The time the plugin was first enabled ("since", used by *Update on startup*) is kept in local storage of this computer instead of `data.json`, so a shared or published vault does not carry it; a value in `data.json` is moved there and removed.

## 1.5.1 — 2026-10-10
- **MW into `MW::`:** with one product, its molecular weight from the reagent table (as shown, e.g. `432.35`) is written into the note's existing `MW::` field — same rules as `yield::` (empty or number replaced, text kept). Setting *MW in MW::* (on). Drawings unchanged.

## 1.5.0 — 2026-10-10
- **Yield into `yield::`:** if the reaction has exactly one product and the reagent table shows its yield, it is written into the note's existing `yield::` field, rounded to a whole percent (`57%`). An empty field or a number is replaced; text such as `n.r.`, `traces` or `n.d.` is kept; 0 % (no product mass yet) is not written. Setting *Yield in yield::* (on). Drawings are byte-identical to 1.4.0.

## 1.4.0 — 2026-10-09
- Internal: the CDX reader, CDXML converter, reaction-step, reagent-table layout and note-matching code now come from the shared library `shared/cdx` 1.0.0, also used by Reaction Structure Search 1.2.0. No user-visible change: all test drawings (IM_00, IM_1, IM_2, A_420–A_423, `.cdx` and `.cdxml`) render byte-identical to 1.3.0, including the product picture.
- Damaged or partly written ChemDraw files are reported as such instead of being read partly.

## 1.3.0 — 2026-10-08
- Colours, highlighting and ring fills as in ChemDraw.

## 1.2.0 — 2026-10-07
- `.cdxml` files; duplicate `.cdx`/`.cdxml` → newer file, warning.

## 1.1.x
- Product picture for `pic::`; charges; two-row reagent table; centred labels.

## 1.0.x
- First versions: scheme and reagent table as SVG under "Table".
