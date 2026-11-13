# Third-party sources and licenses

The version column records the version included in this vault. Repository links identify the upstream project from which the redistributed component originates. The upstream license text with its copyright notice is stored in `licenses/<id>/` unless stated otherwise; standard license texts are in this directory (`MIT.txt`, `Apache-2.0.txt`, `GPL-3.0.txt`, `AGPL-3.0.txt`). The vault does not bundle any third-party themes; it uses the built-in Obsidian theme.

## Community plugins

| Plugin ID | Version | License | Upstream source | Attribution / notes |
| --- | --- | --- | --- | --- |
| auto-view-mode | 1.1.9 | MIT | https://github.com/saltyfireball/obsidian-auto-view-mode | Copyright (c) 2026 saltyfireball |
| better-export-pdf | 2.0.3 | MIT | https://github.com/l1xnan/obsidian-better-export-pdf | Copyright (c) 2023 l1xnan |
| chronology-custom | 1.1.14-pavel.1 | MIT | https://github.com/Canna71/obsidian-chronology/releases/tag/1.1.14 | Copyright (c) 2022 Gabriele Cannata. Modified by Pavel Sakharov; see the plugin's `CHANGES.md`, `LICENSE`, and `plugin-notices/chronology-custom/main.js.diff`. Upstream source: `obsidian-chronology-1.1.14.zip` |
| clear-unused-images-plus | 1.11.0 | MIT | https://github.com/Puhhh/clear-unused-images-obsidian | Copyright (c) 2026 Aleksei Blinov; maintained fork of the original plugin by Ozan Tellioglu |
| cmdr (Commander) | 0.5.12 | MIT | https://github.com/phibr0/obsidian-commander | Copyright (c) 2022 Phillip Bronzel; Commander contributors |
| completed-task-display | 1.0.12 | MIT | https://github.com/heliostatic/completed-task-display | Copyright (c) 2025 Ben Lee-Cohen |
| dataview | 0.5.68 | MIT | https://github.com/blacksmithgu/obsidian-dataview | Copyright (c) 2021 Michael Brenan |
| dataview-serializer | 3.1.4 | MIT | https://github.com/dsebastien/obsidian-dataview-serializer | Copyright (c) Sebastien Dubois |
| obsidian-filename-heading-sync | 1.11.1 | MIT | https://github.com/dvcrn/obsidian-filename-heading-sync | Copyright (c) 2021 David Mohl. The upstream LICENSE file (MIT) was added by the author in October 2026, after the README had declared MIT since 2021; see `licenses/obsidian-filename-heading-sync/LICENSE` |
| obsidian-kanban | 2.0.51 | GPL-3.0 | https://github.com/obsidian-community/obsidian-kanban/releases/tag/2.0.51 | Obsidian Kanban contributors (created by Matthew Meyers; maintained by the Obsidian Community Archive). Unmodified: `main.js`, `manifest.json` and `styles.css` are the assets of the official 2.0.51 release. Source: `obsidian-kanban-2.0.51.zip` |
| obsidian-meta-bind-plugin | 1.5.1 | GPL-3.0 | https://github.com/mProjectsCode/obsidian-meta-bind-plugin/releases/tag/1.5.1 | Moritz Jung / Meta Bind contributors. Source: `obsidian-meta-bind-plugin-1.5.1.zip` |
| obsidian-paste-image-rename | 1.6.1 | MIT | https://github.com/reorx/obsidian-paste-image-rename | Copyright (c) 2022 Reorx |
| obsidian-reminder-plugin | 1.4.3 | MIT | https://github.com/uphy/obsidian-reminder | Copyright (c) 2021 uphy |
| obsidian-tasks-plugin | 8.4.0 | MIT | https://github.com/obsidian-tasks-group/obsidian-tasks | Copyright (c) 2021 Clare Macrae, Ilyas Landikov and Martin Schenck |
| quickadd | 2.29.0 | MIT | https://github.com/chhoumann/quickadd | Copyright (c) 2021 Christian Bager Bach Houmann |
| table-checkbox-renderer | 1.0.2 | MIT | https://github.com/dannns/obsidian-table-checkbox-renderer | Copyright (c) 2025 Daniel Aguerrevere |
| templater-obsidian | 2.25.1 | AGPL-3.0 | https://github.com/SilentVoid13/Templater/releases/tag/2.25.1 | SilentVoid / Templater contributors. Source: `Templater-2.25.1.zip` |
| webpage-html-export | 1.9.2 | MIT | https://github.com/KosmosisDire/obsidian-webpage-export | Copyright (c) 2023 Nathan George |

## Libraries bundled inside plugins authored for this vault

| Component | Used in | License | Upstream source | Notes |
| --- | --- | --- | --- | --- |
| docx 9.6.1 (UMD build) | chemistry-word-report (bundled in `main.js`) | MIT | https://github.com/dolanmiu/docx | Copyright (c) 2016 Dolan. The build bundles JSZip (MIT, used under the MIT option of MIT OR GPL-3.0), pako (MIT AND Zlib), xml-js, xml, nanoid, hash.js, buffer, base64-js, events, readable-stream, string_decoder, util-deprecate, process, lie, immediate, setimmediate, safe-buffer (MIT), sax, inherits, minimalistic-assert (ISC / BlueOak-1.0.0), and ieee754 (BSD-3-Clause). All license texts are in the plugin's `THIRD_PARTY_LICENSES.md` |
| RDKit.js (`@rdkit/rdkit`, RDKit_minimal, release 2025.03.4) | reaction-structure-search (embedded in `main.js`) | BSD-3-Clause | https://github.com/rdkit/rdkit | Compiled together with CoordGen 3.0.2 (BSD-3-Clause), maeparser 1.3.3 (MIT), InChI 1.07.3 (MIT), FreeType (FTL), the Telex font (OFL-1.1), and Boost headers (BSL-1.0). All license texts are in the plugin's `THIRD_PARTY_LICENSES.md`; the RDKit license is also in `licenses/rdkit/` |
| BChemLookup chemical abbreviation tables (`abbreviations.smi`, `reagents.smi`, commit 1cccb31) | reaction-structure-search (data converted to atom/bond lists in `main.js`) | CC0-1.0 | https://github.com/Beilstein-Institut/BChemLookup | Community-curated by the Beilstein-Institut zur Förderung der Chemischen Wissenschaften; public domain dedication, no license text required. Cite: Bänsch, F.; Rajan, K.; Nietfeld, M. ChemRxiv 2026, DOI 10.26434/chemrxiv.15010166/v1 |

## Programs embedded in plugins authored for this vault

| Component | Used in | License | Upstream source | Notes |
| --- | --- | --- | --- | --- |
| Reactio Draw 1.15.2 (web version, built unchanged into `main.js` and written by the plugin to `reactio/reactio.html` on first use; = `index.html` of the release, identical to `Reactio Draw.html` of `ReactioDraw-Web.zip`) | reactio-draw (loaded unchanged in an iframe; the wrapper only sends it commands; since plugin 0.9.0 the page is also built into `main.js`, unchanged) | MPL-2.0 (up to 1.14.1: AGPL-3.0-or-later) | https://github.com/Paivel/reactio-draw (tag `v1.15.2`, commit 5eeaf67; archived on Zenodo, DOI 10.5281/zenodo.23547490, which resolves to the latest version) | © 2026 the Reactio Draw authors. The MPL-2.0 covers Reactio Draw's own files, so the wrapper in the same `main.js` stays MIT. Its own third-party components (OpenChemLib, InChI, OPSIN, Octet Draw, ReShiki data, nmrshiftdb2 tables, ChEBI and Wikidata data and others) are listed in `.obsidian/plugins/reactio-draw/reactio/THIRD-PARTY-NOTICES.md`, with the license texts in `reactio/LICENSES/` |

## CSS snippets

| Snippet | License | Upstream source | Attribution / notes |
| --- | --- | --- | --- |
| MCL Multi Column.css (v0.10.0), MCL Wide Views.css (v0.9.6) | GPL-3.0 | https://github.com/efemkay/obsidian-modular-css-layout (commits `1db5920` and `90c838e`) | Faiz Khuzaimah (efemkay). Unmodified; CSS is the source form, identical to the files at those commits |
| embed-adjustments.css | GPL-2.0 | https://github.com/SlRvb/Obsidian--ITS-Theme (commit `539a4a3`, `Snippets/S - Embed Adjustments.css`) | SlRvb. Unmodified apart from whitespace and comments. The corresponding SCSS source and CSS at that commit are included in `ITS-Theme-embed-adjustments-539a4a3.zip` |
| fixed-images-200.css, header color.css | MIT (project license) | — | Authored for this vault |

## Plugins authored for this vault

The following plugins are authored by Pavel Sakharov and are distributed under the MIT License included in each plugin directory and in the root `LICENSE`:

- `chemistry-word-report`
- `reaction-structure-search`
- `kanban-day-planner` (Kanban Day Planner; until 2026-11-04 `kanban-planner-custom`)
- `telegram-tlc-image`
- `cdx-scheme-image`
- `nmr-downloader`
- `template-guard`
- `reactio-draw` (the wrapper, `LICENSE` in its folder; Reactio Draw inside it is MPL-2.0, see above)

## Verification against upstream releases

Every redistributed `main.js` was compared with the `main.js` asset of the corresponding official GitHub release. All third-party plugins except the modified one (`chronology-custom`) are byte-identical to the upstream release, apart from changes made by Obsidian itself during installation (removal of the inline source map and the appended `/* nosourcemap */` marker). The modified plugin differs only as recorded in `plugin-notices/chronology-custom/` (`main.js.diff`, `styles.css.diff`). Kanban Custom, a modified Kanban used until 2026-11-04, was replaced by the unmodified Kanban.

## Copyleft source status

The complete corresponding upstream source of each copyleft component is included in this directory as a ZIP archive, except Reactio Draw, whose source is published in its own repository and linked below:

- `obsidian-kanban` (GPL-3.0): `obsidian-kanban-2.0.51.zip` (the source of the unmodified 2.0.51 release that is distributed).
- `obsidian-meta-bind-plugin` (GPL-3.0): `obsidian-meta-bind-plugin-1.5.1.zip`.
- `templater-obsidian` (AGPL-3.0): `Templater-2.25.1.zip`.
- Reactio Draw (MPL-2.0, file-level copyleft): https://github.com/Paivel/reactio-draw, tag `v1.15.2` (the complete source, "Source code" archive of the release); the page itself is its source form.
- `chronology-custom` (MIT, source included for convenience): `obsidian-chronology-1.1.14.zip`.
- `MCL Multi Column.css` and `MCL Wide Views.css` snippets (GPL-3.0): the distributed CSS files are themselves the source form; the upstream commits are recorded in the CSS snippets table above.
- `embed-adjustments.css` snippet (GPL-2.0): `ITS-Theme-embed-adjustments-539a4a3.zip` (SCSS source and compiled CSS from upstream commit `539a4a34815444825f7afaa9e6669937ee5f8953`).

These components are distributed alongside the MIT-licensed project files as separate programs (mere aggregation); the copyleft licenses do not extend to the rest of the vault.
