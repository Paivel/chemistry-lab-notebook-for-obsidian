# Checking an exported dataset with the official ORD tools

The plugin checks itself the error-level rules of `ord_schema/validations.py` that its records can break. Before submitting, validate the file with the official package:

```
pip install ord-schema
python - <<'PY'
from google.protobuf import json_format
from ord_schema.proto import dataset_pb2
from ord_schema import validations
ds = dataset_pb2.Dataset()
json_format.Parse(open("Export/ORD/<n>/<name>.json").read(), ds)
out = validations.validate_message(ds, raise_on_error=False)
print(len(ds.reactions), "reactions;", len(out.errors), "errors;", len(out.warnings), "warnings")
print("\n".join(out.errors))
PY
```

For a `.pbtxt` file use `text_format.Parse` from `google.protobuf` instead of `json_format.Parse`.

Results during development (2026-10-09): `tests/ord.test.js` output (IM_00, IM_00 with `yield:: 0`, IM_00 with `rt` / `16 h` / `N2`) and a file written through the plugin command — 0 errors, 0 warnings; the JSON and `.pbtxt` files parse to the same `Dataset`. Validator: `ord-schema` main branch of 2026-10-03 (commit 849f839); `pip` was not available in the development environment, so RDKit calls of the validator were served by RDKit.js 2025.03.4 (the release bundled in the plugin) and protobuf 6+ `FieldDescriptor.label` was replaced by `is_repeated`. Repeat the check above with the real package before a submission.

2026-10-10 (1.4.0): records with stereocentres (IM_1 product `[C@@H]…[C@@H]`, marked racemic) — 0 errors, JSON and `.pbtxt`.

2026-10-10 (1.3.0): a record with reagents written as text above the arrow (`Et3N (2 equiv), MeOH (1 mL), rt` added to a copy of the IM_1 drawing, `scale:: 0.2`) — 0 errors; Et3N as 0.4 mmol and MeOH as 1 mL solvent, SMILES identifiers with `details` naming BChemLookup. The test dataset of `tests/ord.test.js` again 0 errors, 0 warnings (JSON and `.pbtxt`).

2026-10-21 (1.9.4): IM_1 and IM_2 with `roles:: MeMgBr = reactant; C6H8O7 = workup` (citric acid as a workup step ADDITION, role WORKUP, before the FLASH_CHROMATOGRAPHY step) and IM_00 — 0 errors, 0 warnings; the same notes without `roles::` — 0 errors, 0 warnings. Validator: ord-schema tag v0.9.5 from GitHub; `pip` could not reach PyPI, so the validator's RDKit calls were stubbed (SMILES identifiers not parsed) and protobuf `FieldDescriptor.label` was replaced by `is_repeated`. Removing the `input` of the ADDITION step gives the validator's warning "Workup step missing recommended inputs definition", as expected.

2026-10-22 (1.9.5): IM_00, IM_1 and IM_2 of the release (roles:: from the notes; conditions only where recorded; no addition_order; purification as a CUSTOM workup) — see `docs/examples/ORD validation.log` of the vault repository for the validator output.
