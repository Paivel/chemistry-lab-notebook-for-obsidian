# Kanban Day Planner

Turns one board of the [Kanban](https://github.com/obsidian-community/obsidian-kanban) plugin into a day planner. Formerly *Kanban Planner Custom*, written for the *Chemistry Lab Notebook for Obsidian* vault; it works with any board of the Kanban plugin.

- **Weekly rebuild.** Once per weekly cycle — the first time the board note (the *trigger file*) is opened on or after the *Update weekday* (default Saturday), or at once with *Run Kanban maintenance now* — the plugin rebuilds the lists between **Unsorted** and **done**: a list for today and for each of the next days (*Days ahead*, default 14), titled like `Monday 2026-11-02`. The lists of past days are removed: their finished tasks go to **done**, the unfinished ones to **Unsorted** with a tag — the first time the first rollback tag (default `#yellow`), after that the repeated one (`#red`) — and Unsorted is sorted with the tasks moved most often first. Finished tasks of the other day lists go to done as well.
- **Tags.** Changing a rollback tag in the settings gives the new tag its colour (yellow, red) in the board's Kanban settings.
- **Today panel.** *Open Today's Kanban Tasks* shows today's list in the right sidebar: click a task's box to cycle its status (`[ ]` → `[/]` → `[x]`), links open as in a note, and a button opens the board. Two optional buttons open journal notes of your choice (*Show journal buttons*).
- **Sidebars.** The side panels can be hidden while the board is open (*Hide left / right sidebar*), and two commands hide or show both.
- **Styles.** `styles.css` draws the in-progress box `[/]` as an orange circle, in notes and on Kanban boards.

The board stays an ordinary Kanban Markdown note (front matter `kanban-plugin: board`): the plugin adds a comment with the current cycle (`%% kanban-auto-cycle: … %%`) and leaves the lists before Unsorted and after done, the Kanban settings block and the archive as they are.

## Commands
- *Run Kanban maintenance now* — update the board now, without waiting for it to be opened.
- *Open Today's Kanban Tasks* — the Today panel.
- *Hide both sidebars*, *Show both sidebars*.

## Settings
Trigger file (the board), Days ahead, Update weekday, Hide left / right sidebar, First and repeated rollback tag, Show journal buttons and their two files.

## Network, files and accounts
None: the plugin makes no network requests, reads and writes only the board note (and opens the notes you choose), and needs no account. It works on desktop and mobile.

## License
MIT License, © 2026 Pavel Sakharov.
