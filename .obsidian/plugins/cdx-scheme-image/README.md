# CDX Scheme Image

*Formerly "ChemDraw Scheme Image". Not affiliated with or endorsed by Revvity Signals Software, Inc., the owner of the ChemDraw trademark; the plugin reads the CDX and CDXML file formats.*

Obsidian plugin (desktop) that draws ChemDraw reaction files (`.cdx` or `.cdxml`) — structures, arrows, captions and ChemDraw's reagent table — with the drawing settings saved in the file (ACS Document 1996 values are used only if the file has none) and inserts the image (SVG by default, or PNG) under the **Table** line of the matching reaction note.

- Watches a folder (default `Files`) for new and changed `.cdx` and `.cdxml` files. If `A_141.cdx` and `A_141.cdxml` both exist, the newer one is used and a warning asks you to keep only one.
- `A_141.cdx` → `A_141 scheme.svg` next to the ChemDraw file, embedded after **Table** in note `A_141` / `A_141 …` (default folder `Journal`). An image already following **Table** is replaced.
- Colors are kept as in ChemDraw: colored atoms, bonds and text, highlighting and ring fills (also in the product picture). ChemDraw's red dashed frames around labels with a valence warning are shown on screen only and are not drawn.
- The table is taken from the values ChemDraw stores in the file; cells hidden in ChemDraw stay hidden. ChemDraw is not needed for drawing.
- If the reaction has exactly one product (over all reaction steps), the product alone is drawn as `A_141 product.png` (always PNG, for Chemistry Word Report) and written into the note's existing `pic::` field as `![[A_141 product.png|300]]` (width set in *Product image width*); notes without `pic::` are not changed. Setting: *Product image in pic::*.
- In the same case the product's yield from the reagent table is written into the note's existing `yield::` field: from 0.95 % rounded to a whole percent (56.70 % → `57%`), from 0.1 % with one decimal (`0.4%`), below that with two (`0.04%`). A product mass corrected to 0 gives `0%`; when the yield disappears from the table (mass removed, cell hidden), or the table shows 0 % or no yield next to a weighed mass above 0 (often a wrong MW or scale in the table), a number the plugin wrote there is cleared and a notice says so (a number of unknown origin is kept, with a notice). Only an empty field or a number is changed; text typed by hand (`n.r.`, `traces`, `n.d.`) is kept. The measured product mass goes the same way into an existing `mass::` field, as the table shows it without trailing zeros: below 1 g in mg (`71 mg`, `25.7 mg`), from 1 g on in g (`2.06 g`); cleared when the mass is removed from the table; text such as `not isolated` is kept). Settings: *Yield in yield::*, *Product mass in mass::*. A yield of 0 % (or none) next to a weighed mass above 0 is a contradiction, and a notice says so. A number is cleared only when the plugin's record (kept in this computer's app data) shows that the plugin wrote exactly this value; a number of unknown origin — typed by hand, or written on another computer — is kept, and a notice asks to delete it by hand if it is wrong. A field written on more than one line of the note is never updated; a notice asks to delete the extra line.
- Likewise the product's molecular weight as the table shows it (`432.35`) goes into the existing `MW::` field (used by Chemistry Word Report for the mass); an empty field or a number is replaced, text is kept. Setting: *MW in MW::*.
- **Conditions:** a caption with the lines `Temperature: …`, `Time: …`, `Atmosphere: …`, `Other: …` (as Reactio Draw writes it, or typed like this in ChemDraw) — or, without such a caption, the conditions stored by Reactio Draw — goes into the note's existing `temperature::`, `time::`, `atmosphere::` and `other::` fields. An empty field is filled; a value written from the file earlier is updated when the file changes; a value you typed yourself is kept. Several such captions (multi-step schemes) are not used. Setting: *Conditions in temperature::, …*.
- **Mass picture for `Mass_pic::`:** with one product, the product is also drawn as `A_141 mass.png` with three lines under it, as in ChemDraw's Analysis window — *Chemical Formula* (from the reagent table), *Exact Mass* (most abundant isotopes) and *m/z* (isotope peaks of at least 1 %, most intense first). It goes into the note's existing `Mass_pic::` field (width 200, as the *add mass* script uses) when the field is empty or already shows this picture; a picture you put there yourself is kept. Setting: *Mass picture in Mass_pic::*.
- **Labelled atoms:** an atom with a mass number (¹⁵N, ¹³C) is drawn with the number raised before the element, also when Reactio Draw writes the label without it (`N`) or a labelled carbon without a label (then H₃¹³C / ¹³CH₃ with its hydrogens). In formulas the bracketed mass number is raised: `C16H11N2[15N]` → C₁₆H₁₁N₂[¹⁵N]; the mass picture counts such an atom as that isotope.
- Command: *Update scheme image in current note*. Files listed in *Excluded files* (default `Open CDX Editor.cdx` and the older name `open chem draw.cdx`) are never drawn; a file with nothing to draw never replaces an image; a `.cdx` linked from several notes is not used to replace their images.
- **CDXML from the web reaction editor** (files that carry its own record, `<!--rd:…-->`): the reagent table is drawn as that editor shows it — separate *Reactants* and *Products* tables with a role header (Reactant, Solvent, Product …), values with their unit (`315.00 mg`), "—" for rows that do not apply to a solvent, and a *Conditions* table (Temperature, Time, Atmosphere, Other) made from its `Temperature: …` caption. ChemDraw's own `.cdx`/`.cdxml` files are drawn exactly as before.

Build (no dependencies): `node build.mjs` → `main.js`.

Source: `src/render.js` (SVG renderer), `src/main.js` (plugin); the ChemDraw reader, CDXML converter, reaction-step, reagent-table and note-matching code are in `../shared/cdx/` and are bundled into `main.js` by `node build.mjs`.

## Network, files and accounts
None needed: the plugin makes no network requests and needs no account. It reads the `.cdx`/`.cdxml` files of the watched folder and writes only inside the vault — the scheme, product and mass pictures next to the reaction file, and the fields and the picture line of the matching note. Which values it wrote itself (so that it never clears a number you typed) is kept in Obsidian's local storage on this computer.

## Tests

The tests are in the plugin's source repository (with the sources and fixtures), not in the vault's plugin folder.

Node 22, no dependencies, run in this folder. Each script prints `PASS`/`FAIL` per check and `N/M passed`, and exits non-zero on a failure. Fixtures: `../fixtures/`.

```
node tests/render.test.js           # drawing: every fixture, blank sheet (EMPTY), H above/below N, snapshots
node tests/cdxml-converter.test.js  # CDXML -> CDX: LabelAlignment (0x705), LabelJustification (0x823)
node tests/yield.test.js            # yield::, mass::, MW:: values, number formats, provenance, fields written twice
node tests/conditions.test.js       # temperature::, time::, atmosphere::, other::
node tests/mass.test.js             # Exact Mass and m/z of the mass picture
node tests/note-match.test.js       # which note belongs to which file
node tests/plugin.test.js           # one save of a file on an in-memory vault (src/main.js)
for t in tests/*.test.js; do node "$t" > /dev/null && echo "ok    $t" || echo "FAIL  $t"; done
```

The pictures are compared byte for byte with `tests/snapshots/`; after an intended change of the drawing run `node tests/render.test.js --update`. `node tests/render.test.js --vault "<vault>"` also compares the schemes with `Files/IM_00 scheme.svg`, `IM_1 …`, `IM_2 …` of the published example vault. Checks named `[BUG] …` pass on the current code and document wrong behaviour (see the comments in the test).

## License
MIT License, © 2026 Pavel Sakharov — see `LICENSE`.
