# Updating an existing vault

An update replaces program files only. Your notes, files and plugin settings stay as they are.

## Plugins

- **Plugins from Obsidian's community directory** (Dataview, Templater, Kanban and the others): *Settings → Community plugins → Check for updates*.
- **The notebook's own plugins** (CDX Scheme Image, Reaction Structure Search, Chemistry Word Report, Reactio Draw, TLC Photo Inbox, NMR Downloader, Template Guard, Kanban Day Planner) and **Chronology Custom**: when a plugin is listed in the community directory, the same button updates it. Until then, use the archive `Plugins-update-vX.Y.Z.zip` of the release:
  1. Close Obsidian.
  2. Unpack the archive. Its folder `plugins` holds one folder per plugin, without `data.json` (the plugin's settings).
  3. Copy these folders into `.obsidian/plugins/` of your vault so that the folders are merged and the files in them replaced. The folder `.obsidian` is hidden: in the macOS Finder press Cmd+Shift+. to show it; in Windows Explorer turn on *View → Show → Hidden items*.
     - **Windows:** copy the folders and choose *Replace the files in the destination*. Folders are merged, and the settings in them stay.
     - **macOS:** do not drag the folders in the Finder: its *Replace* deletes the old folder with its settings. Use Terminal instead, with your own paths:

       ```
       ditto ~/Downloads/Plugins-update-vX.Y.Z/plugins "/path/to/your vault/.obsidian/plugins"
       ```
  4. Start Obsidian. A plugin that is new to your vault has to be enabled in *Settings → Community plugins*.

## Templates, scripts and notes

The release notes and [CHANGELOG.md](../CHANGELOG.md) list the templates, scripts and notes that changed. Copy those you have not changed yourself from the vault archive of the release; compare first the ones you have edited.
