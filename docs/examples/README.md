# Example outputs

Made from the example notes of this vault (IM_00, IM_1, IM_2) with these plugin versions: Reaction Structure Search 1.9.8, CDX Scheme Image 1.8.7 (1.8.8 for the PDF), Chemistry Word Report 1.2.0. Chemistry Word Report 1.2.1 gives the same file byte for byte (apart from the export time).

| File | What it is |
|---|---|
| `reaction note example.pdf` | note IM_1 exported to PDF |
| `Draft SI.docx` | Supporting Information draft from IM_1 and IM_2 (Chemistry Word Report, text formula of this vault) |
| `ORD example dataset.json`, `.pbtxt` | Open Reaction Database dataset of IM_00, IM_1, IM_2 (protobuf JSON and text format) |
| `ORD example report.txt` | the export report: roles and their reasons, values taken from the reaction file, values not recorded |
| `ORD validation.log` | `ord-schema` validation of the dataset |
| `PubChem example.sdf`, `_pubchem.csv`, `_report.txt` | PubChem deposition files of the three products and the export report |

The author of the ORD record (`Example Author`, `author@example.org`), the DOI (`10.0000/example`) and the registry prefix (`LAB`) are placeholders; an export from Obsidian uses the values entered in the plugin settings and the export dialog.

`ORD validation.log`: the official validation of the dataset with ord-schema 0.9.6 and RDKit 2026.09.1: 3 reactions, 0 errors, 0 warnings for the .json and the .pbtxt file (run on the files made with Reaction Structure Search 1.9.5; 1.9.8 changes only the wording of the description). To repeat it: `pip install ord-schema rdkit`, then the commands in `.obsidian/plugins/reaction-structure-search/ORD.md`.

The example notes link MestReNova (`.mnova`) and HRMS (`.pdf`) files to show where such files go. These spectra are not distributed with the vault; the characterization data of the two products are published in J. Am. Chem. Soc. 2026, 148, 39647 (doi:10.1021/jacs.6c08636).
