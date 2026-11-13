# Changelog

## 1.9.10 — 2026-11-04
Prepared for the Obsidian community directory.
- PubChem export window: the structure pictures are parsed as SVG and added as elements (scripts and foreign content removed) instead of being inserted as HTML.
- The search window shows and hides its controls with Obsidian's helpers instead of inline styles; result tabs are no longer closed when the plugin is unloaded (Obsidian's guidelines).
- **Fix — PubChem ASCII names:** a non-breaking space, thin space or narrow no-break space in a compound name became nothing ("methyl ester" written with a non-breaking space → "methylester") and was listed as a dropped character; it now becomes an ordinary space. (The table meant for these three characters had three plain spaces as keys.)
- README: *Network, files and accounts*.

## 1.9.9 — 2026-11-03
- Rebuilt with the current shared CDXML reader, which keeps `LabelAlignment` (the H drawn over or under an atom, used by CDX Scheme Image 1.8.11). The search does not use it: the 23 functional search queries give the same hits, and the ORD and PubChem exports of the example notes are byte-identical to the published ones.
- The plugin's source is in the repository again, recovered from the 1.9.8 build (the rebuild of 1.9.8 from it is byte-identical); tests: `tests/search.test.js`, `tests/examples.test.js`, `tests/ord.test.js`.

## 1.9.8 — 2026-10-25
- ORD dataset description: the stereochemistry sentence says *of the reaction drawings* instead of *of the ChemDraw drawings* — reaction files come from Reactio Draw or ChemDraw. Nothing else changes in the export.

## 1.9.7 — 2026-10-22
- **A draft leaves out every field written twice** (PLUGIN_FIXES_REVIEW3 2026-10-22, N2). 1.9.6 refused such a record in a normal export but still wrote one of the two values into a draft (two yield lines, 82 % and 20 %, gave YIELD 20 %). Now a duplicated field is not used at all, and nothing is derived from it: duplicated `yield::` → no YIELD (not the table's yield instead) and no AMOUNT; duplicated `mass::` → no AMOUNT; duplicated `Name::` → no product name and no stereo details on its SMILES; duplicated `temperature::`, `time::` or `atmosphere::` → no value (not the reaction file's instead); duplicated `HRMS::` → no HRMS (not `Massd::` instead); the other fields the same. The report keeps the error: *yield:: written twice — not used, also left out of a draft (with what follows from it); delete the extra line*. The example outputs are unchanged.

## 1.9.6 — 2026-10-22
- **A field written twice is an error** (PLUGIN_FIXES_REVIEW2 2026-10-22, N9). Before, the last of two `yield::` lines was used silently (CDX Scheme Image updated the first one). ORD export: a field the record is built from (yield, mass, scale, Name, roles, workup, purification, eluent, temperature, time, atmosphere, Date, state, solvent, frequency, Mass_Ionization, HRMS, Massd, the NMR fields) written on more than one line is an error naming the field; the record is written only as a draft. PubChem export: `Name::` or `num_in_article::` written twice makes the product not exportable. Fields shown as examples in inline code (`` `yield::` ``) or inside a code block (a Dataview query) are not fields of the note and do not count.
- The shared field reader (`shared/obsidian/inline-fields.js`) returns the duplicated names (`readInlineFields`); `parseInlineFields` keeps its interface. The example outputs (ORD, PubChem) are byte for byte the same as with 1.9.5.

## 1.9.5 — 2026-10-22
Fixes from the pre-submission review (PLUGIN_FIXES_FROM_REVIEW 2026-10-22).
- **PubChem: stereo variants are no longer merged.** Duplicates are found by InChIKey **and** the stereo meaning of the drawing (absolute as drawn / racemic `rac-` / relative `rel-` / no stereocentre): the standard InChIKey is the same for all of them, so a drawing named plain, `rac-` and `rel-` in three notes gave one record; now three. The same structure and meaning with another compound number or another name is kept twice and the conflict is listed in the dialog; a compound number used for two stereo meanings of one structure is an error.
- **ORD: `rel-` is no longer called racemic.** The SMILES details say *racemic mixture* (`rac-`, `±`, RS/SR descriptors), *relative configuration; the absolute configuration is unknown (not a racemate)* (`rel-`) or *absolute configuration as drawn*. A name marking rac-/rel- on a drawing without stereocentres is a warning. The dataset description says the same.
- **ORD: nothing is assumed.** Temperature, pressure and atmosphere are written only when the note or the reaction file gives them (no room temperature, air or ambient pressure by default); what is missing is listed as *not recorded* in the report. `addition_order` is no longer written: the notes do not record the order of addition (the drawing order put the quench before MeMgBr).
- **ORD: purification.** `eluent::` becomes FLASH_CHROMATOGRAPHY only when a `workup::` or `purification::` field says chromatography; otherwise a CUSTOM workup step with the text (the examples use a flash filtration through alumina).
- `**roles**::` (bold label, as in IM_1/IM_2) is read like `roles::` (test added); the example notes now carry `roles:: MeMgBr = reactant; C6H8O7 = workup`.

## 1.9.4 — 2026-10-21
ORD export: `workup` role for quenches and other additions after the reaction (ORD_WORKUP_ROLE).
- `roles::` accepts `workup` (ORD `ReactionRole.WORKUP`), e.g. `roles:: MeMgBr = reactant; C6H8O7 = workup` for the citric acid of IM_1 and IM_2.
- A workup component is not written among the reaction inputs but as a workup step `ADDITION` whose `input` holds the component (identifiers, amount and the reagent-table values as for an input), one step per component in the order of the reagent-table columns, before the `FLASH_CHROMATOGRAPHY` step from `eluent::`. The `addition_order` of the remaining inputs is renumbered without gaps.
- The limiting reagent cannot be workup: it stays a REACTANT input, with the warning `roles:: "<x>" = workup ignored: it is the limiting reagent`.
- A workup component without an amount gives a warning (ord-schema has no error for it); reaction inputs without an amount are still errors.
- A `roles::` name that is not a label, formula, SMILES or `reactant N` is looked up in the plugin's list of common reagents and in BChemLookup and matched by canonical SMILES; the report says so. Citric acid is in neither list, so it is named by its formula (`C6H8O7`) or `reactant N`.
- The export report adds a line `C6H8O7: WORKUP — roles:: line in the note (workup step ADDITION)`.
- Notes without `roles::` give the same records as 1.9.3. ord-schema v0.9.5 validation of IM_00, IM_1 and IM_2 with workup: 0 errors, 0 warnings.

## 1.9.3 — 2026-10-21
Reading of reagent labels that stand alone (no bond to the drawing); found by the check on a working notebook (LABEL_FIX_INSTRUCTIONS).
- Adducts and solvates written with a dot (`NiCl2·DME`, `BF3·OEt2`, `CuSO4·5H2O`, `Pd2(dba)3 * CHCl3`) are read from the label text, part by part, instead of ChemDraw's stored structure, which bonds the parts to each other. A leading number repeats a part (5 H2O). A part that cannot be read becomes a dummy atom ("label not interpreted"). A space or a full stop between parts counts too when every part is a known reagent (`CuSO4 H2O`, `CuSO4.5H2O`). A label with a comma (a list of reagents) or with words (`… as electrolyte`) is left as before.
- Quaternary ammonium salts written as one label (`Bu4NOH`, `n-Bu4NOH`, `Bu4N+OH-`, `Et4N·BF4`; Me, Et, Pr, Bu with OH, F, Cl, Br, I, OAc, HSO4, BF4, PF6, ClO4) are read as the cation [N+]R4 and the anion. TBAC, TBAOH, TBAHS and TEBAC were added to the plugin's list of reagents (TBAF, TBAB and TBAI are in BChemLookup).
- A stand-alone label whose stored structure falls apart into uncharged pieces (Bu4NOH stored as two butanes and NH2OH; separate H atoms do not count) is read from its text; if the text is unknown too, it is a dummy atom instead of a wrong structure. A stored structure with charged pieces (an ion pair) is still used.
- A stand-alone label that names a known reagent is read from BChemLookup or the plugin's list instead of ChemDraw's stored structure, so salts are ion pairs: LiAlH4 = [Li+].[AlH4-] (was [AlH3].[LiH]), NaOH, NaHCO3, t-BuOK, CuSO4.
- BChemLookup's DCM (stored as two molecules of CH2Cl2) is read as one molecule. Added to the list: DME, OEt2, SMe2/DMS, H3PO4, BH3, NH3.
- Labels bonded to the drawing are read as before. The search index is rebuilt once.
- Checks: BChemXtract test corpus — 6 files change, all to the better (ion pairs, H3PO4, DMS·Br2, CO2; two wrong structures of Na3P3O9 and H3PO4 are now H3PO4 and "not interpreted"); InChI share of the structures without "*" unchanged at 97.3 % (1144 / 1176, was 1145 / 1177). USPTO-50k benchmark (2000 reactions, 266 queries): identical. CDX Scheme Image renders: identical.

## 1.9.2 — 2026-10-21
Faster inside Obsidian (RSS_OBSIDIAN_SPEEDUP); results unchanged.
- The search index is kept in memory between searches: when no note or reaction file has changed, a search no longer re-reads the index file (112 MB for 10,000 reactions), and an update after a changed file starts from the index in memory. The memory copy is dropped when the index file changes on disk (Rebuild deletes it), after 10 minutes without a search, and when the plugin is turned off.
- The interface gets a turn every 50 ms of work instead of after every 4 files or 200 molecules; Chromium's minimum of 4 ms per zero-delay timer made the index check after one changed file take about 15 s on 10,000 files. Progress and Cancel keep working (Cancel takes effect within about 50 ms).

## 1.9.1 — 2026-10-21
- ORD export: a condition whose note field (`temperature::`, `time::`, `atmosphere::`) is missing or empty is taken from the reaction file — its *Temperature / Time / Atmosphere* caption, else the conditions of the Reactio Draw record, as CDX Scheme Image reads them. A filled note field still wins. The export report says where each value came from (note, file caption, Reactio Draw record). IM_1: −20 °C to rt (custom temperature "-20 to rt") and N₂ instead of ambient and air.
- Relative configuration in queries of several molecules (reaction queries, a salt drawn as cation + anion): the query matches as drawn or with all its molecules mirrored together; a molecule is no longer mirrored on its own ((R)-alcohol → (R)-ester no longer finds (S)-alcohol → (R)-ester). Single molecules as before.
- Shared library 1.3.3.

## 1.9.0 — 2026-10-21
Faster search (RSS_SPEEDUP_REQUIREMENTS, measured with the USPTO-50k benchmark); the results are the same.
- Pictures are drawn only for the results shown: the results view shows 50 cards and a **Show more** button, the number found at once; a hit's picture (`hit.svg`) is drawn when it is first used.
- Exact search compares the canonical / isomeric SMILES stored in the index instead of rebuilding each molecule.
- Substructure search skips every molecule whose RDKit pattern fingerprint (stored in the index) cannot contain the query, and builds the others from their stored SMILES instead of the drawn graph; reaction search does the same per side. Molecules with labels that were not interpreted (`*`) and molecules RDKit could not sanitize are always matched in full.
- The search dialog shows the progress ("Searching… 3200 of 9800 molecules") and a **Cancel** button; closing the dialog cancels too.
- Reading: a neutral P, S, As or Se atom with a stored hydrogen count above what RDKit would add keeps it (an H-phosphinate drawn as PH2=O was read as P=O). Other atoms read as before.
- Search index format 9 (fingerprints): rebuilt once.

## 1.8.3 — 2026-10-20
- Reagents and ions that Reactio Draw keeps as text instead of a structure (`MeMgBr`; the `PF6-` of a salt whose cation is drawn) are read from the Reactio Draw record in the file (its compound map), with the structure attached to the text in Reactio Draw or, without one, from the name. Search: they are components of the reaction (found as a molecule and in reaction queries). ORD: the salt is one compound "cation.PF6-" with the amounts of its table column (1.8.2 exported the cation alone with the mass of the salt), MeMgBr gets a SMILES. Files saved by other programs (without the record) are read as before.
- A list of common reagents written as text that BChemLookup does not have: Grignard and organolithium reagents (MeMgBr, i-PrMgCl, PhLi …), counter-ions (PF6, BF4, SbF6, OTf, NTf2 …) and a few salts (KPF6, AgBF4, CuI …); used for text above/below the arrow too.
- Structure search: a query of several molecules (a salt drawn as cation + anion) finds a step that has each of them as a component.
- Reaction search also uses reagents written as text in the reactant/product list with a known name.
- A table column whose formula differs from the structure drawn for it gives a warning in the ORD export.
- The ORD export skips the template's blank file under its new name `Open CDX Editor.cdx` (as it did `open chem draw.cdx`).
- Shared library 1.3.2. The search index is rebuilt once (format 8).

## 1.8.2 — 2026-10-18
- Fixes after review of 1.8.0–1.8.1. Table columns without a structure reference are matched by their full formula (with hydrogens and charge, e.g. "C10H16N-"), one structure or a salt of two or three; whatever is left is paired left to right as before (1.8.1 compared heavy atoms only and could give an amine's column to its anion). Solvents get no mass from the table unless a density is shown (ChemDraw computes that mass from the moles of the limiting reagent). The hydrogen count of charged atoms is taken from the whole fragment, also when drawn H atoms are removed later (search fallback, skeleton rule); atoms from text labels are left to RDKit. The search index is rebuilt once more (format 7).

## 1.8.1 — 2026-10-18
- ORD export of files saved by Reactio Draw: table columns without a structure reference are matched by formula (heavy atoms) instead of left to right. A salt that Reactio Draw splits into cation + anion is matched to its one column and exported as one compound (`cation.anion`); before, the anion could take the column of another reagent. A reagent kept only in the table whose name has no structure (MeMgBr) is exported by name and molecular formula (CUSTOM identifier) with its table values and a warning, instead of being skipped.
- "Reactant" in Reactio Draw's table is its default (also for every compound of an imported ChemDraw file), so the rules decide for it as for any file (THF given as a volume stays a solvent); *catalyst* and *solvent* from the table are still taken as they are.
- Charged atoms keep the hydrogen count stored in the file (a nitrenium N+ with no H was read as NH2+). The search index is rebuilt once (format 6).
- Shared library 1.3.1: the CDXML converter keeps `NumHydrogens`.

## 1.8.0 — 2026-10-17
- ORD export: roles are taken from the reagent table of files saved by Reactio Draw (`<!--rd:…-->` in CDXML, ObjectTag `ReactioDraw` in CDX): *catalyst* → CATALYST, *solvent* → SOLVENT; *reactant* skips the solvent and catalyst rules, and the limiting-reagent and skeleton rules decide REACTANT or REAGENT. A `roles::` line in the note still wins. ChemDraw files and files without roles keep the rules as before. The report gives the reason ("role in the reagent table of the file").
- ORD export: a reagent written as text in Reactio Draw ("MeCN", "THF") is a column of its table without a drawn structure. It is now exported with all its values from the table; the name comes from the Reactio Draw record, the structure from the solvent list or BChemLookup. The same text above the arrow is not exported twice. A table column without a structure and without a name is reported instead of being dropped silently.
- ORD export: the table values the ORD amount cannot hold go into the compound's `features`: mass, volume and molarity as shown in the table ("23.85 mg", "3.00 M"); a solvent gets no molarity (in Reactio Draw it is the concentration of the reaction). A solution in Reactio Draw ("3.00 M in THF") gets its solvent as a second component of the input with the volume of the solution. Cells showing 0 (nothing entered) are not used as amounts.
- Shared library 1.3.0: `reactio-record.js` (reads the Reactio Draw record and its roles); the CDXML converter writes object tags (name, value).

## 1.7.1 — 2026-10-17
- From main 1.6.4: Shared library 1.2.1: `.cdx` files whose header has 16 reserved bytes (written by programs other than ChemDraw, e.g. Reactio Draw) are read; before they were empty and not searched or exported.


## 1.7.0 — 2026-10-16
- Queries are drawn in **Reactio Draw** (plugin `reactio-draw`) instead of Ketcher: its search button opens the search dialog. New `openSearch({ label, getSmiles })` for any drawing tool; the Ketcher hooks and the command *Search current Ketcher structure* are removed; the ribbon icon opens Reactio Draw.
- Folders named `Drawings` are skipped by the index (own drawings and queries saved there are not reactions of the journal).

## 1.6.3 — 2026-10-13
- CDXML converter (shared with ChemDraw Scheme Image): Unicode subscript/superscript digits become subscript/superscript runs, other characters beyond Latin-1 "?" instead of control codes. ChemDraw files unchanged.

## 1.6.2 — 2026-10-13
- ORD and PubChem export: CDXML files that reuse an object id (the web reaction editor gives a reagent-table column the id of a structure) no longer lose that structure ("no atoms").

## 1.6.1 — 2026-10-10
- **PubChem registry IDs from the paper**, not from the notebook: `<prefix>-<DOI suffix>-<compound number>` (e.g. `LAB-jacs.6c08636-4a`). A product without `num_in_article::`, or a compound number given to two different structures, cannot be exported. Several products of one note: `num_in_article::4a, 4b`. The comment no longer names the reaction.
- The previous format `<prefix>-<reaction>-P<n>` stays available (Settings → PubChem export → Registry IDs); the dialog warns when the format differs from the last export.
- PubChem CSV: new column `PUBCHEM_EXT_DATASOURCE_INCHI`; racemates and `rel-` compounds get a non-standard InChI with `/s3` or `/s2` there and an empty SMILES, other compounds keep the SMILES — one structure per row.
- ORD: notebook codes (ChemDraw file name and note name in `provenance.reaction_metadata`, optional in ORD) are no longer written by default; setting *Include notebook codes*.
- Fix: the PubChem settings (prefix, registry-ID format, remembered DOI per note) were lost when Obsidian restarted.
- ORD: `yield:: n.d.` means *not determined* — no yield and a warning (it was exported as a failed reaction with 0 %); an empty `yield::` filled from the ChemDraw table now says so in the report.
- PubChem report and README: upload the `.sdf` for racemates (the CSV has no stereo group). README: requirements, search commands, note-to-file matching, field names and error rules brought in line with the code.
- Each PubChem or ORD export is written to its own numbered subfolder of the output folder: `Export/PubChem/1/`, `2/` …; an ORD draft goes next to the export it belongs to.

## 1.6.0 — 2026-10-10
- **PubChem export** (PUBCHEM_EXPORT_REQUIREMENTS.md v3): commands **Export products to PubChem from current table** (Dataview table or table of links, like Chemistry Word Report) and **Export products of current note to PubChem**. Products only; one dialog with the paper DOI, PubMed ID, hold-until date, registry-ID prefix and a draft table (structure, registry ID, ASCII name, compound number, InChIKey, status). Writes `.sdf` (PubChem tags, drawn coordinates and wedges, V3000; racemates with an STERAC group), `_pubchem.csv` (PubChem spreadsheet), `_structures.tsv` (BChemXtractWeb columns + compound number, note, DOI) and a report with the next steps to `Export/PubChem/`. No network access: the files are uploaded by the user in PubChem Submissions.
- Stable registry IDs `<prefix>-<reaction>-P<n>`: a later upload replaces the records; duplicates (same InChIKey) are merged.
- ORD export dialog: description text no longer says that structures carry no stereochemistry.

## 1.5.0 — 2026-10-10
- **No wrong carbons:** atom labels that cannot be read, generic labels (R, X, Ar, alternative groups) and leftover attachment points are kept as "*" instead of being read as carbon. Such structures are found by substructure search with a warning ("label not interpreted"), are never exact hits, and are an error in the ORD export.
- **Label grammar** for labels that are not one table entry: `NBpin`, `CH2CH2OH`, `CO2tBu`, `N(iPr)2`, `PO(OEt)2`, `HO`, `O2N`, `EtO2C`, `(CH2)3` …; plus a small supplement of common groups that BChemLookup lacks (Bn, Boc, Ts, Ms, Tf, TBS, TIPS, Cbz, Fmoc, Piv, Cy, MOM, THP …).
- **Abbreviations with several attachment points** (NMe or NEt2 in a ring, bridging groups) are expanded, using ChemDraw's attachment order.
- Captions stored as atoms (`rt`, `3f`) are ignored; a broken expansion stored by ChemDraw is read from its label; "Ar" stored as argon is aryl.
- CDXML: BondOrdering, ConnectionOrder, BeginAttach/EndAttach, CIP labels and enhanced-stereo flags are carried over (`shared/cdx` 1.2.0).
- BChemXtract corpus (225 .cdx): InChI for 97.3 % of the structures without "*"; RDKit failures 114 → 47; see `benchmarks/bchemxtract-corpus/` (`get-corpus.sh`, `run-all.sh`).
- Search dialog: wider, and the choices wrap onto a second line in a narrow window (the stereo choice no longer pushes the Search button out).
- Index rebuilt automatically once (chemistry version `v7`; the first 1.5.0 build had kept the 1.4.0 version, so an index built by 1.4.0 was not rebuilt — fixed the same day).

## 1.4.0 — 2026-10-10
- **Stereochemistry**: wedge/hashed-wedge bonds (also on drawn H atoms) and the drawn geometry of double bonds are read (ChemDraw coordinates → RDKit). On the BChemXtract test corpus the CIP labels agree with those ChemDraw stores in the files for 859 of 885 stereocentres that carry a wedge (97 %) and 123 of 128 E/Z double bonds; Haworth/chair sugar drawings and allenes are not interpreted.
- Search: new choice in exact mode — **any stereo** (default, as before), **relative stereo** (as drawn or mirror image), **absolute stereo** (as drawn). Substructure search ignores stereochemistry. Ketcher queries keep their stereochemistry.
- ORD export: SMILES with stereochemistry; products named as racemates (`rac-`, `(±)`, `rel-`, `(…RS,…SR)`) are marked *racemic* in the identifier details; dataset description says how stereochemistry was taken.
- Search results: text reagents show their name.
- Index rebuilt automatically once (index format 5).

## 1.3.0 — 2026-10-10
- Chemical abbreviations from **BChemLookup** (Beilstein-Institut, CC0 1.0; Bänsch, Rajan, Nietfeld, ChemRxiv 2026, DOI 10.26434/chemrxiv.15010166/v1), bundled as data (`shared/cdx/bchemlookup-data.js`, commit 1cccb31):
  - atom labels that ChemDraw did not interpret (`OTr`, `NPhth`, `B(pin)`, `DiPP` …; before: read as carbon) are expanded; a lone label that names a reagent (`THF`) becomes that reagent; unknown labels are reported;
  - reagents written as text above/below the arrow are indexed by name → SMILES and found by structure search;
  - ORD export: such text reagents become inputs with the amount written next to them (mL, mg, mmol, or equiv / mol % × `scale::`); conditions in the arrow text (`rt`, `0 °C`, `12 h`) are skipped with a note.
- Hydrogens drawn as atoms are removed on the graph: H2 is no longer lost, deuterium/tritium are kept.
- Reaction components drawn as a ChemDraw group (e.g. a salt) are indexed.
- ORD: purity measurement linked to the "isolated" analysis (no validator warning).
- Index rebuilt automatically once (index format 4). Checked on the BChemXtract test corpus: `benchmarks/bchemxtract-corpus/`.

## 1.2.0 — 2026-10-09
- ORD export: commands **Export ORD dataset from current table** and **Export current note to ORD**, export dialog, report window with "Export anyway as draft", settings section *ORD export* (author details stored on this computer only). See README.
- ChemDraw files are read with the shared library `shared/cdx` 1.0.0 (also used by ChemDraw Scheme Image 1.4.0): CDX reader, CDXML converter (now also the reagent-table values), reaction steps, reagent table, note matching. The search index is unchanged (identical index for the example vault; validation set 23/23).
- Search results: checkboxes per note, **all**, and **Add tag** (adds any tag to the front matter of the picked notes).
- ORD export: no `temperature::` value → room temperature, no `atmosphere::` value → air at ambient pressure (shown in the report); products listed with their role in the report.
- ORD export: procedure text is optional (setting *Include procedure text*, off by default).
- Source now in `src/` with a build script; RDKit.js unchanged (2025.03.4).

## 1.1.0 — 2026-10-07
- `.cdxml` files; duplicate `.cdx`/`.cdxml` → newer file, warning.

## 1.0.1 — 2026-10-06
- Exact search ignores drawn hydrogens and stereochemistry.

## 1.0.0
- First version.
