# TLC Photo Inbox

*Formerly "Telegram TLC Image". Uses the Telegram Bot API with your own bot; not affiliated with or endorsed by Telegram.*

Puts photos of TLC plates from your phone into the TLC table of the matching reaction note (`Journal/`) through a Telegram bot of your own, and turns other messages sent to the bot into notes. No other Telegram plugin is needed.

1. **TLC photos** (desktop app only): press **📋 Reactions**, choose one of the 10 latest created or edited notes of the journal folder and send **one photo or one album**: it is saved as `Files/telegram/A_122x<n>.jpg` (the code the note name starts with) and deleted from the chat; the plugin asks whether to add it (setting *Ask before inserting*), puts it into the note's TLC table and moves it to `Files/`. The chosen reaction is then forgotten. Instead of choosing, write the code as the caption: `A_122`, or just `122` when a *Default project* such as `PAS` is set (it becomes `PAS_122`; a caption that starts with a number, such as `122 after column`, counts too — the whole album goes there). The rest of the caption is written under the photo in the same cell of the TLC table, on a new line: `A_122 Rf 0.3, hexane/EtOAc 3:1` puts the photo and *Rf 0.3, hexane/EtOAc 3:1* under it. With a chosen reaction the caption is not read as a code: the photo goes to the chosen reaction and the whole caption under it (`2 SM` stays text, it does not mean reaction `PAS_2`); the same for a photo sent as a reply to the bot's message *Send the photo … for A_122.*, also after the choice was used. In an album only the photo that carries the caption gets the text. If the code is unknown or incomplete, the bot keeps the photo and asks which reaction it is for; a reply with the code or a press on a list button files it. A photo you skip in the dialog stays in `Files/telegram/`; the command **Add photos from the Telegram inbox** asks again. Messages sent while Obsidian is closed are handled in order when it opens (Telegram keeps them for 24 hours). Exclude `Files/telegram` in Clear Unused Images Plus, or waiting photos would be removed as unused.
2. **Notes from the bot.** Everything else — a photo sent without choosing a reaction, text, a link to a paper, a PDF or another file, a forwarded post — becomes a note `Telegram/YYYY-MM-DD-n.md` (the day of the message and the next free number of that day, e.g. `2026-10-16-3`) with the text (hidden links kept as Markdown links, "Forwarded from …" for forwarded posts) and `![[…]]` links to the attachments, saved in `Files/` (a photo or unnamed file gets the note's name, e.g. `2026-10-16-3.jpg`). Several files sent as one album go into one note. Programs and scripts (`.exe`, `.bat`, `.js`, `.html`, …) are refused. **📁 No reaction** at the top of the list cancels a chosen reaction. The message is deleted from the chat once it is saved.

Every message of the bot ends with a **🔄 Update list** button (the list is always made fresh: the 10 latest notes at that moment). A photo without a usable reaction (no choice yet, a number without a default project, an unknown code) is kept: the bot asks which reaction it is for, and a reply with the code (`A_122` or `122`) or a press on a list button files all waiting photos. Each photo is saved as `Files/telegram/A_122x<n>.jpg` (the code the note name starts with) and deleted from the chat; the plugin asks whether to add it (setting *Ask before inserting*), puts it into the note's TLC table and moves it to `Files/`. A photo you skip stays in `Files/telegram/`; the command **Add photos from the Telegram inbox** asks again. Photos sent while Obsidian is closed are handled when it opens (Telegram keeps them for 24 hours). Exclude `Files/telegram` in Clear Unused Images Plus, or waiting photos would be removed as unused.

## Requirements

Desktop only: the Telegram bot and the file handling use Node.js (https, fs), which Obsidian mobile does not provide.

## Setting up the bot
1. In Telegram, open @BotFather → `/newbot` → copy the token. Use a **new bot only for this plugin**: a bot can be read by one program at a time, so run it in one Obsidian (one computer) only.
2. Settings → TLC Photo Inbox → *Telegram bot*: paste the token, *Apply*, switch on *Enable the bot*.
3. *Pair your Telegram account* → *Show code* → send `/start <code>` to your bot within 10 minutes. Your account is added to *Allowed Telegram users* (several people: pair each, or enter numeric user IDs).
4. In the bot, press **📋 Reactions**.

The TLC table is the first table in the note whose first row contains "TLC"; the photo goes into the first empty cell (a column or row is added when the table is full), with the text of its caption under it (`![[A_122x5.jpg\|150]]<br>Rf 0.3`; several lines of the caption are joined with `<br>`). If the note has no such table, the photo stays in `Files/telegram/` and a notice says so.

## Security
- The bot token and the allowed users are stored **only on this computer** (local storage of Obsidian, per vault), never in `data.json`, so they are not in git or in a copy of the vault. The token is encrypted by the operating system where available (Windows: DPAPI, macOS: Keychain, Linux: libsecret / kwallet); if a saved token cannot be decrypted (another user, a copied profile), the plugin asks for it again.
- Only private chats with allowed users are answered; messages from anyone else get no answer at all. Pairing needs the one-time code from the settings (valid 10 minutes, single use); five wrong codes end the pairing.
- TLC photos: only images (JPEG, PNG, WebP; checked by content, up to 20 MB); file names are made by the plugin from the note's code; the only change to a reaction note is the TLC-table insert (the photo and the text of its caption). The caption text is written inert like the text of bot notes, and also with `|` escaped (it cannot add columns or break the table), `::` escaped (no Dataview field), `#` escaped (no tag) and `%%` escaped (no comment that would hide the rest of the note). The text of a photo that waits in `Files/telegram/` is kept in local storage of this computer until the photo is in the table.
- Other messages become notes in the Telegram folder. Files are saved under cleaned names in the image folder and never overwritten; programs and scripts (.exe, .bat, .ps1, .js, .html, .svg …) are refused, and notes or canvases (.md, .canvas) are saved with `.txt` added. The text is written inert: it reads the same, but backticks and tilde fences, Templater tags (`<%`), HTML tags, embeds (`![`), frontmatter and links to local or script schemes (obsidian:, file:, javascript: …) are escaped, so a forwarded message cannot become a DataviewJS block, an inline JS query (`$= …`), a Templater command, a Meta Bind button, an iframe or remote image, or a link that starts a program or a plugin action. File names are cleaned (no folders, no Windows device names, no trailing dots). No commands are run.
- The plugin talks only to `api.telegram.org` over HTTPS and opens no port on the computer. The chosen reaction is kept on this computer, so photos sent after a restart still go to it; a photo is deleted from the chat only after it is saved.
- Telegram is not end-to-end encrypted for bots: the photos pass through Telegram's servers. The bot sends note names (the list) but no structures or note contents.

## Network, files and accounts
- **Account:** a Telegram account and a bot of your own, made with @BotFather (free). There is no service of the plugin's author in between.
- **Network:** only while the bot is switched on (off by default, desktop only), the plugin talks to the Telegram Bot API at `api.telegram.org` over HTTPS: it waits for new messages, downloads the photos and files sent to the bot, sends the list of reactions (note names) and deletes a photo from the chat once it is saved. No port is opened on the computer.
- **Files:** written only inside the vault (photos into the image folder, other messages as notes into the Telegram folder, the TLC table of the chosen note). The token and the allowed users are kept in Obsidian's local storage on this computer, never in the vault (see Security).

## Building
`node build.mjs` bundles `src/` into `main.js` (needs `../tools/bundle.mjs`; no npm dependencies). Tests: `node tests/bot.test.js` (bot against a fake Telegram API), `node tests/plugin.test.js "<vault>"` (inbox, TLC-table insert and move with a mocked Obsidian).

The design follows common practice for Telegram bots (allowed users, token kept out of the vault); no code from other Telegram plugins is used.

## Tests
The tests are in the plugin's source repository (with the sources and fixtures; it will be published on GitHub soon), not in the vault's plugin folder.

Node.js 18 or later, no `npm install`, no network: the bot talks to a fake Telegram Bot API on 127.0.0.1, Obsidian is mocked and the vault is a Map in memory.
```
cd telegram-tlc-image
node tests/bot.test.js               # the bot, run by the plugin, against the fake Telegram API
node tests/plugin.test.js            # TLC-table insert, move to Files/, inbox command, token and users in local storage
node tests/plugin.test.js "<vault>"  # also one photo into each TLC table of <vault>/Journal (in memory; nothing written)
node tests/bot.test.js main.js       # any of them on the bundled main.js instead of src/
```
Each prints `PASS` / `FAIL` per check and `N/M passed`, and exits non-zero on a failure. Checks marked `[suspected bug, current behaviour]` pin down behaviour that is probably wrong; the comment above each says why.

## License
MIT — see `LICENSE`.
