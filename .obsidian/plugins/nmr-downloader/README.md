# NMR Downloader

Desktop only.

Downloads NMR spectra archives (`MG_Smith400-2026_12.zip`) that arrive by e-mail, unpacks them
(by spectrometer frequency, into one folder, or both) and opens the spectrum in MestReNova or Bruker TopSpin.
No Python is needed. Mail is read through the **Gmail API with Google sign-in** (the same method
the old Python script used: `credentials.json` + a saved token).

Step-by-step guide for users (setup, every setting, the TopSpin button, problems): `NMR Downloader guide.md` in the vault root.

## Network, account, files and programs
- **Account:** a Google account with Gmail, and your own Google Cloud project with an OAuth client (`credentials.json`, step A below; free). There is no service of the plugin's author in between, and nothing is paid.
- **Network:** only Google is contacted, and only when you sign in, press **Test** or run a download: `accounts.google.com` (sign-in, in your browser), `oauth2.googleapis.com` (the sign-in token) and `gmail.googleapis.com` (the Gmail API: list and read the mails of the sender, download the archives, mark mails as read). The permission asked for is `gmail.modify` (read mails and change their read status); the plugin sends no mail and deletes nothing. Sign-in uses a temporary page on 127.0.0.1 for 3 minutes at most. **Sign out** revokes the access at Google.
- **Files outside the vault:** the plugin reads `credentials.json` from the path you set, saves and unpacks the archives in the folders you set (usually outside the vault), and for **MestReNova documents: By tens** writes a small MestReNova script to the system's temp folder. The sign-in token is kept in Obsidian's local storage on this computer (encrypted by the operating system where available), never in the vault.
- **Other programs:** it opens the spectra in MestReNova or Bruker TopSpin (the paths you set or their usual install folders); TopSpin is reached through its own command port on 127.0.0.1.
- **Payments, ads, telemetry:** none.

## Install
Copy the folder `nmr-downloader` (main.js, manifest.json, styles.css) to `<vault>/.obsidian/plugins/`,
restart Obsidian and enable **NMR Downloader** in *Settings > Community plugins*.

## First-time setup

### A. Google Cloud: make `credentials.json` (once per person; keep the file — the plugin reads it on every run)
You can skip this part if you already have `credentials.json` from the old Python script.
Sign in at https://console.cloud.google.com with the Gmail account that receives the spectra.

1. **Project.** Click the project picker at the top of the page > **New project** > enter a name
   (e.g. `NMR Downloader`) > **Create**. Make sure the new project is selected in the picker.
2. **Gmail API.** Menu > **APIs & Services > Library** > search for **Gmail API** > open it > **Enable**.
3. **Sign-in screen.** Menu > **Google Auth Platform > Branding** > **Get started**:
   - *App information*: app name (e.g. `NMR Downloader`) and your e-mail as *User support email* > **Next**;
   - *Audience*: **External** > **Next** (a personal Gmail account cannot choose *Internal*);
   - *Contact information*: your e-mail > **Next**;
   - *Finish*: tick the agreement to the Google API Services User Data Policy > **Continue** > **Create**.
   The other Branding fields (logo, home page, privacy policy, authorized domains) can stay empty: they are
   needed only for Google's app verification, which a personal app does not need. Do not upload a logo -
   it makes Google ask for verification. The *Google hasn't verified this app* page will be shown anyway,
   because the plugin needs access to Gmail (step B.2).
4. **Audience.** Google Auth Platform > **Audience**:
   - under *Publishing status* click **Publish app** and confirm, so the status becomes **In production**.
     In *Testing* status Google ends the sign-in after 7 days and you would have to press Authorize every week;
   - if you prefer to stay in *Testing*, add your Gmail address under *Test users* (**Add users** > **Save**)
     instead, otherwise Google blocks the sign-in.
5. **Client.** Google Auth Platform > **Clients** > **Create client** > *Application type* **Desktop app**
   > any name > **Create**. In the window that opens click **Download JSON** (later: the download icon next
   to the client in the list). Save the file as `credentials.json` somewhere outside the vault, for example
   in your Documents folder.

Nothing has to be added under *Data access* (scopes): the plugin asks for Gmail access itself when you sign in.

### B. Plugin settings
1. **Credentials file** - the full path to `credentials.json`.
2. Press **Authorize**. The browser opens: choose the Gmail account that receives the spectra.
   Google shows *Google hasn't verified this app* - this is your own app: click **Advanced** >
   **Go to NMR Downloader (unsafe)**. On the next page allow access to Gmail (tick the box if there is one)
   > **Continue**. The browser then says *Signed in*; go back to Obsidian.
   The sign-in token, your Google account address and the path to `credentials.json` are kept on this computer
   only, outside the vault (Obsidian's local storage), and the token is encrypted by the operating system where
   available (Windows, macOS; on Linux with a keyring). They are never written to `data.json`, so syncing, sharing
   or committing the vault does not carry them; each computer signs in once. The MestReNova and TopSpin paths
   are kept on the computer in the same way. **Sign out** revokes the access at
   Google and removes the sign-in from this computer. The plugin asks for the Gmail permission
   *read messages and change their read status* (`gmail.modify`); sign-in uses a temporary local page on
   127.0.0.1 and times out after 3 minutes. Only Google servers are contacted, and only when you run the plugin.
3. Fill in **Sender e-mail** (the exact address of the NMR service; several addresses: separated by commas;
   `@university.edu` accepts that exact domain, not its subdomains), **Archive prefixes** (e.g. `MG,GM`),
   **User name** (e.g. `Smith`), the folders and the MestReNova path — required while *Open the spectrum in
   MestReNova* is on; **Check MestReNova** can find `MestReNova.exe` on Windows; on macOS enter the path to
   `MestReNova.app`. Press **Test** to check the login. Settings of the old Python script can be read with
   *Import from nmr_settings.env*.

## Use
Ribbon icon (download arrow) or command **Download NMR spectra**. The plugin takes unread messages with
attachments from the sender and saves every `.zip` whose name contains the user name to the Download folder.
Only archives named `PREFIX_NAME<MHz>-<year>_<number>` (MHz: 3 digits, year: 4 digits) are unpacked to the
right folder and opened (`1r` / `2rr` / `acqu`) in MestReNova; others stay in the Download folder.
With **Folders by tens** (on by default) the experiments of one sample go into one folder: archives
`…_10` to `…_19` of a spectrometer are unpacked into `MG_Smith400-2026_10-19`, `…_20` to `…_29` into
`MG_Smith400-2026_20-29`, and so on (4-digit numbers likewise: `_7170-7179`). Inside it each experiment is its own folder:
`<frequency folder>\MG_Smith400-2026_10-19\12\pdata\1\1r` (the archive's top folder `MG_Smith400-2026` is left out). Switched off, every archive is
unpacked straight into the frequency folder, as before.
After unpacking the `.zip` is deleted (setting **Keep the .zip after unpacking**, off by default).
A mail from the sender is marked as read only after every archive it brought was saved **and unpacked**; a mail
with an archive for another user name, or whose archive could not be unpacked (also one whose name does
not match the pattern), stays unread and is listed in the summary. With **Mark other mails from the sender as read**
(on by default) the sender's unread mails that bring no archive at all — *Sample Measured*, and the PDF printout
(*ICON-NMR Print of …*) — are marked as read; a mail with any `.zip`, or one whose sender Gmail did not confirm, never is. Encrypted and ZIP64 archives are not supported. Archives are unpacked only inside the spectra folder (no
`..`, absolute paths or links), streamed and checked by CRC; an archive with more than 20 000 files, more than
16 GB unpacked or more than the free disk space is refused.

**Check the sender** (on by default): the From address of a mail can be forged, so archives are downloaded only
from mails whose sender Gmail confirmed — DMARC, DKIM or SPF pass for exactly the domain of the sender address, as written
by Gmail in the topmost `Authentication-Results` header (only Gmail's own results are read: the comments in brackets
and the quoted parts of addresses, which the sender can choose, are not). A mail that fails is skipped, left unread and reported.
**Test** shows the result for the latest mails of the sender; switch the check off only if genuine mails of your
NMR service fail it (some internal mail servers do not sign their mail).

Only the archives downloaded in this run are unpacked. The setting **MestReNova documents** decides how the
spectra are opened: **By tens** (default) puts experiments 10–19 of one spectrometer into one new MestReNova
document, 20–29 into the next, and so on (through a small MestReNova script written to the temp folder);
**Each experiment separately** opens every experiment on its own; **Archive number only** opens one spectrum
per archive, as the old Python script did.

### Bruker TopSpin
Set **Open downloaded spectra in** to *TopSpin* and press **Check TopSpin** (it looks for `topspin.cmd` in
`C:\Bruker`, e.g. `C:\Bruker\TopSpinProcessing5.0.0`; on Linux/macOS `topspin` in `/opt`). Each downloaded
experiment then opens in its own TopSpin window, the last experiment first (7222, 7221, 7220) (`sendgui rew <expno>\pdata\1`); with **Folders by tens**
the whole folder of the sample opens, also experiments of it downloaded earlier; when TopSpin is not running,
it is started with the first one (`topspin.cmd -j TOP_DATA=<path>`) and the others follow once it answers.
Processing done in TopSpin is saved in the spectrum folder (`pdata`), so it is there the next time.

The command **Open a Bruker spectrum folder in TopSpin** opens any spectrum: paste an experiment folder
(`…\7170`), a folder with several experiments (each opens in its own window), a `pdata\1` folder or a `1r`
file. Buttons and scripts can call the same function:
`app.plugins.plugins['nmr-downloader'].openTopSpin('C:\\NMR\\400\\MG_Smith400-2026_12')`.
The **Open in TopSpin** button in the NMR section of a reaction note (command **Open the NMR spectra of this
note in TopSpin**) reads the note's `NMR_id` field, e.g. `**NMR_id**:: 7180, 7190`. Each number is the first
experiment of a sample: the sample folder `…_7180-7189` is looked for in the spectra folders set above (or, for
spectra unpacked without **Folders by tens**, the experiment folders 7180–7189 one level below them), and all
found folders open together. If the note has `**frequency**:: 400`, only the 400 MHz folder is searched.
Numbers without spectra are listed in a notice.

Spectrum folders named after the notebook page (setting **Spectrum folders named after the notebook page**, off
by default): the button opens every folder whose name starts with the notebook number of the note's project code
(table **Notebooks**, e.g. `Exp` → `01`) followed by the note number with the set number of digits: for `Exp_15`
and 4 digits, `010015…` (`0100150101`, `01001502` …). Folders are looked for in **Folders with these spectra**
(one per line; empty = the spectra folders) and one level below them.

Tested with TopSpin Processing 5.0.0 on Windows 11.

Switching between the opened spectra (TopSpin Processing 5.0.0): the left panel of TopSpin has a **windows**
tab (the third one, with the number of open windows) that lists every open spectrum with a small preview and
stays open; a click switches to that spectrum, the arrows at its top go to the previous / next one. The same
list opens from the **Window Switcher** button at the top right. The **Data** tab next to it is TopSpin's
browser with the data folders. **F6** cycles through the windows,
**Ctrl+W** closes the active one, the command `closeall` closes all. To see several spectra at once, use
**Show Layout Options** (grid, stack, side by side); to superimpose them in one window, multiple display (`md`).

## Troubleshooting
- *Skipped a mail from … Gmail did not confirm the sender* - the mail is not authenticated for the sender's domain. If it is a genuine mail of your NMR service, ask its administrators to set up SPF / DKIM, or switch off **Check the sender**.
- *Google sign-in has expired or was revoked* - press **Authorize** again. (Keep the OAuth app "In production".)
- *Gmail API has not been used in project* - enable the Gmail API in Google Cloud (step A.2).
- *Access blocked: … has not completed the Google verification process* - the app is still in *Testing* and your address is not a test user: publish the app or add yourself as a test user (step A.4).
- *Google hasn't verified this app* - expected for your own app: **Advanced** > **Go to … (unsafe)** (step B.2).

## Tests
The tests are in the plugin's source repository (with the sources and fixtures), not in the vault's plugin folder.

Node.js 18 or later, no `npm install`, no network: Google sign-in and the Gmail API are a fake server on 127.0.0.1 (set through `testHooks.endpoints`), Obsidian is mocked and the ZIP files are built by the tests.
```
cd nmr-downloader
node tests/zip.test.js      # unpacking: path traversal, links, limits, size and CRC, Windows % ! names, safeFileName
node tests/mail.test.js     # exact sender, Authentication-Results, a whole run (mail marked read only after unpacking)
node tests/signin.test.js   # sign-in in local storage (enc1:/plain1:), migration from data.json, Authorize, Sign out
node tests/fields.test.js   # NMR_id:: / frequency:: parsing without slow backtracking
```
Each prints `PASS` / `FAIL` per check and `N/M passed`, and exits non-zero on a failure.

## License
MIT License, © 2026 Pavel Sakharov — see `LICENSE`.
