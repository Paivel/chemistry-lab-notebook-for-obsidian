# Changelog

## 0.1.1 — 2026-11-04
- The plugin no longer offers its tags to other plugins: the modified Kanban (Kanban Custom) that read them for its card menu is replaced by the original Kanban in the notebook vault. The planner adds the rollback tags itself, as before, when it moves unfinished tasks to **Unsorted**; the Today panel reads them from the settings.

## 0.1.0 — 2026-11-04
Prepared for the Obsidian community directory; formerly *Kanban Planner Custom*.
- **New plugin id `kanban-day-planner`** (was `kanban-planner-custom`; the id cannot change after publication). In the notebook vault the plugin folder is renamed with its settings (`data.json`), and the Commander buttons use the new id. In a vault updated by hand: copy `data.json` from `.obsidian/plugins/kanban-planner-custom/` into `.obsidian/plugins/kanban-day-planner/`, then delete the old folder.
- Name *Kanban Day Planner*; README.
- Styles of the Today panel's buttons in `styles.css` instead of the code; the old heading "File Open Script Trigger" removed from the settings.
- The Today tab is no longer closed when the plugin is unloaded (Obsidian's guidelines).
- The journal buttons are off by default and their files empty (the notebook vault sets `Stat/NMR Journal.md` and `Stat/Mass Journal.md` in its own settings).

## 0.0.1 — 2026-04
- First version, written for the Chemistry Lab Notebook vault.
