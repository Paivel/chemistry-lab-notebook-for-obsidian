# Changelog

## 1.3.1 — 2026-11-10
- A chosen reaction wins over the caption: a photo sent after choosing a reaction goes to that reaction whatever its caption says, and the whole caption goes under the photo. Before, a caption starting with a number (`2 SM`) was read as reaction `PAS_2` with a default project, and a caption with another code went to that reaction.
- A photo sent as a reply to the bot's message *Send the photo … for A_122.* goes to A_122, also after the choice was used for an earlier photo.
- With no reaction chosen the caption rules are unchanged (`A_122 …`, or `122 …` with a default project).

## 1.3.0 — 2026-11-04
- The text of a TLC photo's caption is no longer discarded: what follows the reaction code (`A_122 Rf 0.3` or, with a default project, `122 Rf 0.3`) is written under the photo in the same cell of the TLC table, after `<br>`. With a reaction chosen from the list, a caption without a code goes under the photo as a whole. In an album only the photo that carries the caption gets the text. Several lines become `<br>`-separated lines of the cell.
- The text waits with the photo: a photo kept until its reaction is named keeps it; a photo skipped in the dialog keeps it on this computer (local storage), and **Add photos from the Telegram inbox** adds the photo with its text later. Texts of photos removed from the inbox by hand are forgotten by that command.
- *Add TLC image?* shows the text that will go under the photo.
- The text is inert (as in bot notes) and also cannot break the table or add Dataview fields, tags or comments: `|` → `\|`, `::` → `:\:`, `#tag` → `\#tag`, `%%` → `%\%`.

## 1.2.4 — 2026-10-21
Security review of everything a Telegram message can put into the vault.
- Text of Telegram notes is now inert against every code-running or loading form in this vault, not only DataviewJS: `<%` becomes `<\%` (no Templater command, even if Templater were set to run on new files); `<` before a tag name is escaped (no HTML: iframes, remote images); `![` is escaped (no embedded remote image or transcluded note); links with the schemes obsidian:, file:, javascript:, data:, shell:, search-ms:, ms-… and similar get an invisible zero-width space before the colon, so they are not links (a file:/// link opens a program, an obsidian:// link can run a plugin action such as a QuickAdd macro); `---` at the very start is escaped (no frontmatter); CR line ends are normalised. The text reads the same in reading view.
- Hidden links (text_link): only web URLs without spaces, quotes, angle brackets or control characters; `(` `)` in the URL are encoded and `[` `]` in the linked text escaped, so a URL cannot close the link and start another one; overlapping entities are ignored.
- File names: trailing dots and spaces are dropped (Windows would turn `run.exe.` into `run.exe`), Windows device names (CON, NUL, COM1 …) get `_` in front, `%`, backtick and `$` are replaced. More refused extensions: .url, .scf, .inf, .pif, .cpl, .msc, .chm, .iso, .img, .vhd(x), .appref-ms, .library-ms, .settingcontent-ms, .xll, macro Office files (.docm, .xlsm, .pptm …), .py, .rb, .pl, .php, .desktop, .webloc, .xml, .mht and others.
- The album bookkeeping is kept to the last 500 albums (it grew while Obsidian stayed open).

## 1.2.3 — 2026-10-21
Security review (with NMR Downloader 1.8.1).
- The bot token in local storage is encrypted by the operating system where available (Electron safeStorage: DPAPI, Keychain, libsecret / kwallet; `enc1:`), otherwise stored as `plain1:` with a one-time warning. A token saved by 1.2.2 is encrypted on the first start. A token that cannot be decrypted on this computer counts as missing ("paste it again"); the bot does not start.
- Pairing ends after five wrong codes (`/start <6 digits>` from users who are not allowed), so the code cannot be guessed.
- Text of messages written into Telegram notes is inert: every backtick is escaped (with the backslashes before it) and tilde fences at a line start are escaped, so text sent or forwarded to the bot cannot become a DataviewJS block or an inline JS query that would run when the note is opened (DataviewJS is on in this vault).
- Files named `.md`, `.markdown`, `.canvas` or `.base` are saved with `.txt` added, so they are not opened as notes of the vault.
- Shared helper `shared/secrets/secret-store.js` (the same class as in NMR Downloader).

## 1.2.2 — 2026-10-21
- Marked as desktop only (`isDesktopOnly: true`). Desktop only: the Telegram bot and the file handling use Node.js (https, fs), which Obsidian mobile does not provide; without the flag Obsidian mobile tried to load the plugin and it failed.

## 1.2.1 — 2026-10-20
- Renamed from "Telegram TLC Image" to "TLC Photo Inbox" (Telegram is a trademark of its owner; the plugin uses the Telegram Bot API and is not affiliated with Telegram). The plugin id and folder (`telegram-tlc-image`) stay, so settings, the bot token and the paired accounts are kept.

## 1.2.0 — 2026-10-16
- The Telegram Sync mode is removed (watching the Telegram folder for `A_35x….jpg` images, the command *Scan Telegram folder for TLC images*, the settings *Prefixes* and *Delete Telegram note*): the plugin's own bot does the same without Telegram Sync.

## 1.1.0 — 2026-10-16
- Own Telegram bot (desktop): **📋 Reactions** lists the 10 latest created/edited notes of the journal folder as buttons (or the reaction code as photo caption; a number alone uses the *Default project*, e.g. 122 → PAS_122); photos are saved as `Files/telegram/<code>x<message id>.jpg`, deleted from the chat, then (after the usual question) added to the note's TLC table and moved to `Files/`. Photos without a usable reaction wait until a reply with the code or a list button names it. Updates received while Obsidian was closed are processed when it opens; the chosen reaction survives a restart. Command **Add photos from the Telegram inbox**.
- Bot notes: any other message sent or forwarded (text, links, PDF and other files, forwarded posts) becomes `Telegram/YYYY-MM-DD-n.md` with `![[…]]` links to the attachments saved in `Files/` (an album = one note; programs and scripts refused). A chosen reaction takes one photo or one album and is then forgotten; photos without a reaction become Telegram notes; **📁 No reaction** in the list cancels a choice; a photo caption starting with a number uses the default project (the whole album follows); a text message counts as a code only when it is the number alone. Token and allowed users in local storage, pairing by one-time code, private chats of allowed users only, images only.
- `insertImageIntoTlcTable` can run without the "TLC table not found" dialog (used by the bot).

## 1.0.0
- Photos from Telegram Sync notes (`A_35x….jpg`) added to the TLC table of the matching note.
