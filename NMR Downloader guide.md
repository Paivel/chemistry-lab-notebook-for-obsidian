# NMR Downloader guide

NMR Downloader collects the NMR spectra that the NMR service sends by e-mail. With one click it reads the new mail in Gmail, saves the spectrum archives, unpacks them into your spectra folders and opens the spectra in **MestReNova** or **Bruker TopSpin**. A button in each reaction note opens that reaction's spectra in TopSpin.

The plugin works only in the desktop app (Windows, macOS, Linux; TopSpin tested on Windows 11 with TopSpin Processing 5.0.0). It connects to Google only when you run it. No Python is needed.

If your spectra do not arrive by e-mail, you can still use the TopSpin part (section 7) and leave the mail settings empty, or switch the plugin off in **Settings → Community plugins**.

## Contents

1. What you need
2. Installing or updating the plugin
3. Google Cloud: making `credentials.json` (once)
4. Plugin settings, section by section
5. Downloading spectra
6. MestReNova
7. TopSpin
8. Problems and solutions

---

## 1. What you need

- The **Gmail account** that receives the NMR mails (the plugin reads mail only through Gmail).
- The **exact sender address** of the NMR service, e.g. `nmrlab@university.edu`.
- The **archive names** the service uses. They look like `MG_Smith400-2026_12.zip`:
  - `MG` is the *prefix* (a group can have several, e.g. `MG,GM`);
  - `Smith` is *your user name* at the NMR service;
  - `400` is the spectrometer frequency in MHz (3 digits);
  - `2026` is the year;
  - `12` is the experiment number.
- One folder per spectrometer for the spectra, e.g. `C:\NMR\300`, `C:\NMR\400` (it may be in OneDrive), and a download folder for the `.zip` files, e.g. `C:\Users\<you>\Downloads\NMR archive`.
- **MestReNova** and/or **TopSpin** installed, if the spectra should open automatically.

## 2. Installing or updating the plugin

NMR Downloader is already included in this vault and enabled. To install or update it:

1. Close Obsidian.
2. Copy the folder **nmr-downloader** (with `main.js`, `manifest.json`, `README.md`) into the plugins folder of the vault: `<vault>\.obsidian\plugins\`. The `.obsidian` folder is hidden: on Windows turn on *View → Show → Hidden items* in Explorer, on macOS press Cmd+Shift+. in Finder.
   - The result must be `<vault>\.obsidian\plugins\nmr-downloader\main.js`. Make sure Windows did not unpack an archive into an extra folder (`…\plugins\changes_v80\…` or `…\nmr-downloader\nmr-downloader\…`).
   - When updating, replace only these files. Your settings are in `data.json` in the same folder and are kept.
3. Start Obsidian, open **Settings → Community plugins** and switch on **NMR Downloader**.
4. Check the version number under the plugin name in that list. If it did not change after an update, Obsidian still runs the old files: see section 8.

> [!info] Where the sign-in is kept
> The Google sign-in token, your Google address, the path to `credentials.json` and the MestReNova and TopSpin paths are kept on this computer only, outside the vault, and the token is encrypted by the operating system where available. Each computer signs in once and sets its program paths once; a copied or synced vault carries no sign-in and cannot change which program is started. `.obsidian\plugins\nmr-downloader\data.json` holds only your folder paths and options; the repository of this vault excludes it anyway.

## 3. Google Cloud: making `credentials.json` (once)

The plugin reads Gmail through your own small "app" in Google Cloud. You make it once; it is free. If you already have `credentials.json` from the old Python script, skip to section 4.

Sign in at https://console.cloud.google.com with the Gmail account that receives the spectra.

1. **Project.** Click the project picker at the top → **New project** → name it, e.g. `NMR Downloader` → **Create**. Check that the new project is selected in the picker.
2. **Gmail API.** Menu → **APIs & Services → Library** → search **Gmail API** → open it → **Enable**.
3. **Sign-in screen.** Menu → **Google Auth Platform → Branding** → **Get started**:
   - *App information*: an app name (e.g. `NMR Downloader`) and your e-mail as *User support email* → **Next**;
   - *Audience*: **External** → **Next** (a personal Gmail account cannot choose *Internal*);
   - *Contact information*: your e-mail → **Next**;
   - *Finish*: tick the agreement → **Continue** → **Create**.

   Leave the other Branding fields empty and do **not** upload a logo (a logo makes Google ask for verification).
4. **Publish the app.** **Google Auth Platform → Audience** → under *Publishing status* click **Publish app** and confirm. The status becomes **In production**.
   - Why: in *Testing* status Google ends the sign-in after 7 days and you would have to sign in again every week.
   - If you prefer to stay in *Testing*, add your Gmail address under *Test users* instead, otherwise Google blocks the sign-in.
5. **Client.** **Google Auth Platform → Clients** → **Create client** → *Application type* **Desktop app** → any name → **Create** → **Download JSON**.
6. Save the downloaded file as `credentials.json` **outside the vault**, e.g. in Documents. Keep it there: the plugin reads it on every run.

Nothing has to be added under *Data access* (scopes); the plugin asks for Gmail access when you sign in.

## 4. Plugin settings, section by section

Open **Settings → NMR Downloader** (in the left list, under *Community plugins*). The sections appear in this order.

> [!tip] Paths
> Paths can be pasted with Explorer's **Copy as path** (Shift + right-click on the file or folder). The quotes it adds are ignored.

### Google mail account

| Setting | What to enter |
|---|---|
| **Credentials file (credentials.json)** | Full path to the file from section 3, e.g. `C:\Users\<you>\Documents\credentials.json`. |
| **Google sign-in** → **Authorize** | Opens the browser. Choose the Gmail account that receives the spectra. Google shows *Google hasn't verified this app*: it is your own app, so click **Advanced → Go to NMR Downloader (unsafe)**. Allow access to Gmail (tick the box if there is one) → **Continue**. The page says *Signed in*; go back to Obsidian. The setting now shows *Signed in as …*. Sign-in times out after 3 minutes. |
| **Sender e-mail** | The exact address of the NMR service. Several addresses: separate with commas. `@university.edu` accepts every address of exactly that domain. |
| **Test mail login** → **Test** | Checks the sign-in, counts unread mails with attachments from the sender and checks whether Gmail confirms the sender of its latest mails (see **Check the sender**). Nothing is downloaded or marked as read. |

The plugin asks Google only for permission to *read messages and change their read status* (`gmail.modify`). **Sign out** revokes the access at Google and removes the sign-in from this computer (if Google cannot be reached, revoke it at myaccount.google.com/permissions).

### Archives

| Setting | What to enter |
|---|---|
| **Archive prefixes** | The part before `_`, e.g. `MG`; several: `MG,GM`. |
| **User name in archive names** | Your name in the archive names, e.g. `Smith` (case does not matter). Archives of other users are ignored. |

### Where to put the spectra

| Setting | What to enter |
|---|---|
| **Storage mode** | **Sort by frequency** (a folder per spectrometer), **All in one folder**, or **Both** (sorted, plus a copy of everything in one folder). |
| **Download folder** | Where the `.zip` files are saved before unpacking. |
| **Folders by frequency** | Press **Add frequency** for each spectrometer: the frequency in MHz (`300`, `400`, `500`) and its folder. The frequency is read from the archive name (`…400-2026_12.zip` → the 400 folder). The trash button removes a row. |
| **Single folder** | Shown for *All in one folder* and *Both*. |
| **Folders by tens** | On (recommended): the experiments of one sample are kept together. Archives `_7220` … `_7229` go into one folder `MG_Smith300-2026_7220-7229`, inside it one folder per experiment (`…\7220\pdata\1\1r`, `…\7221\…`). Off: every archive is unpacked straight into the frequency folder, as in older versions. |

Resulting layout with *Folders by tens* on:

```
C:\NMR\300\
    MG_Smith300-2026_7220-7229\
        7220\  (acqu, fid, pdata\1\1r …)
        7221\
        7222\
```

### Open spectra

**Open downloaded spectra in**: **MestReNova**, **TopSpin** or **Don't open**. This decides only what happens after a download. The **Open in TopSpin** button and the TopSpin commands always use TopSpin.

### MestReNova

| Setting | What to enter |
|---|---|
| **MestReNova program** | Full path to `MestReNova.exe` (on macOS to `MestReNova.app`). Required when *Open downloaded spectra in* is MestReNova. |
| **MestReNova documents** | **By tens**: experiments 10–19 open together in one new document, 20–29 in the next. **Each experiment separately**. **Archive number only**: one spectrum per archive, as the old Python script did. |
| **Check MestReNova** → **Check** | Looks for the program at the path above and in the usual install folders, and fixes the path if it finds it. |

### TopSpin

| Setting | What to enter |
|---|---|
| **TopSpin folder** | The folder that contains `topspin.cmd`, e.g. `C:\Bruker\TopSpinProcessing5.0.0`. Empty: the plugin looks in `C:\Bruker` and `D:\Bruker` (on Linux/macOS in `/opt`). |
| **Check TopSpin** → **Check** | Looks for `topspin.cmd` and `prog\bin\sendgui.cmd` and fills in the folder. The message *TopSpin found: …* means everything needed is there. |
| **Spectrum folders named after the notebook page** | Off by default. Turn it on if your spectrum folders are named after the notebook page (e.g. `0100150101`), see section 7. Then three more settings appear: |
| **Notebooks** → **Add notebook** | For each project: its **code** as in the note names (`Exp` for `Exp_15`) and its **notebook number**, the first digits of the folder names (`01`). |
| **Digits of the note number** | How many digits the page (note) number has in the folder names: **3** (`001`–`999`) or **4** (`0001`–`9999`); 2 and 5 are also possible. |
| **Folders with these spectra** | One folder per line. The spectrum folders may lie in them or one level below. Empty: the frequency folders and the single folder above are searched. |

### Mail and archives

| Setting | Meaning |
|---|---|
| **Mark other mails from the sender as read** | On: the sender's mails that bring no archive (*Sample Measured*, the PDF printout *ICON-NMR Print of …*) are also marked as read. A mail with a `.zip` is never marked by this setting. |
| **Check the sender** | On (default): archives are downloaded only from mails whose sender Gmail confirmed (DMARC, DKIM or SPF pass for the sender's domain), because a From address can be forged. A mail that fails is skipped, left unread and reported. Switch off only if **Test** shows that genuine mails of your NMR service fail. |
| **Keep the .zip after unpacking** | Off: the `.zip` is deleted after it is unpacked. |

### Run and Import

- **Download NMR spectra now** → **Run**: the same as the ribbon icon (section 5).
- **Import from nmr_settings.env**: reads the settings file of the old Python script and fills in the fields.

### Checklist

After setup you should have: *Signed in as …*, a successful **Test**, at least one frequency folder, *Open downloaded spectra in* chosen, and **Check MestReNova** and/or **Check TopSpin** reporting *found*.

## 5. Downloading spectra

Click the **download arrow** in the left ribbon, or run the command **Download NMR spectra** (Ctrl/Cmd+P).

1. A notice *NMR: … please wait* appears and shows each step (checking mail, downloaded, unpacked, opening). Do not click again while it is shown.
2. The plugin takes the **unread** mails from the sender and saves each `.zip` whose name contains your user name.
3. Archives named `PREFIX_NAME<MHz>-<year>_<number>.zip` are unpacked into the right frequency folder. Other archives stay in the download folder.
4. A mail is marked as read only when its archive was unpacked; a mail with an archive for another user, or whose archive could not be unpacked, stays unread (listed in the summary). Mails without any archive (*Sample Measured*, the PDF printout) are marked as read when **Mark other mails from the sender as read** is on.
5. The spectra of this download open in the chosen program.
6. At the end a summary lists what was downloaded, unpacked and opened.

Only archives downloaded in this run are unpacked. A mail already marked as read in Gmail is not processed again; to download it once more, mark it as unread in Gmail. Encrypted and ZIP64 archives are not supported.

## 6. MestReNova

With *Open downloaded spectra in* = **MestReNova**, the `1r` (or `2rr`, `acqu`) files of the new spectra open in MestReNova in increasing order (7220, 7221, 7222), grouped as set in **MestReNova documents**.

The spectra are not linked to the notes automatically. Save the processed MestReNova document in the **Files** folder of the vault named after the reaction, e.g. `Exp_1.mnova`; the reaction note shows it in its NMR section.

## 7. TopSpin

### After a download

With *Open downloaded spectra in* = **TopSpin**:

- each experiment opens in its own TopSpin window, **the last experiment first** (7222, 7221, 7220);
- with *Folders by tens* the whole sample folder opens, including experiments of that sample downloaded earlier;
- if TopSpin is closed, the plugin starts it with the first spectrum, waits until it is ready (up to 3 minutes) and then sends the others. The notice *Starting TopSpin … please wait* stays until TopSpin answers.

Processing done in TopSpin (phase, baseline, integrals) is saved by TopSpin in the spectrum folder (`pdata`), so it is there the next time.

### The Open in TopSpin button in a reaction note

The NMR section of a reaction note has two buttons: **Add NMR** and **Open in TopSpin**.

```
#### NMR
**NMR_id**:: 7180, 7220
**solvent**:: CDCl3
**frequency**:: 400
```

1. Write the experiment numbers in `NMR_id`, separated by commas. Each number is the **first experiment of a sample**: `7220` means the sample folder `…_7220-7229` (experiments 7220–7229).
2. Optionally fill in `frequency`: then only that spectrometer's folder is searched. Empty: all frequency folders (and the single folder) are searched.
3. Press **Open in TopSpin**. All found spectra open, last first. Numbers for which nothing was found are listed in a notice, together with the folders that were searched.

Spectra unpacked without *Folders by tens* are found too: for `7220` the experiment folders `7220` … `7229` one level below a frequency folder.

The same function is available as the command **Open the NMR spectra of this note in TopSpin**; a hotkey can be assigned to it in **Settings → Hotkeys**.

Notes created before the button was added to the template get it from **Template Guard** (it offers to add the missing button when the note is opened), or paste it under the **Add NMR** button yourself:

````
```meta-bind-button
label: Open in TopSpin
style: default
action:
  type: command
  command: nmr-downloader:open-note-in-topspin
```
````

### Spectrum folders named after the notebook page

Some groups name each spectrum folder after the paper notebook page instead of the NMR service number, for example `0111501 01`:

| Part | Example | Meaning |
|---|---|---|
| notebook number | `01` | the notebook (project) |
| page number | `115` (3 digits) or `0115` (4 digits) | the reaction note: `Exp_115` |
| experiment on the page | `01` | 1st, 2nd … spectrum of that reaction |
| experiment type | `01` | e.g. ¹H NMR |

To open such spectra with the **Open in TopSpin** button:

1. In the TopSpin section of the settings turn on **Spectrum folders named after the notebook page**.
2. Under **Notebooks** press **Add notebook** and enter the project code and its notebook number, e.g. `Exp` → `01`. Add a row for every project (`PAS` → `02` …).
3. Choose **Digits of the note number** (3 or 4), as the page number is written in your folder names.
4. Enter the folders where these spectra are kept under **Folders with these spectra** (or leave it empty to use the spectra folders of the downloads).

Pressing **Open in TopSpin** in the note `Exp_15` then opens every folder whose name **starts** with `010015` (notebook `01` + note `0015` with 4 digits): `0100150101`, `0100150201`, `01001503` … The rest of the name and its length do not matter. The note number is taken from the note name (`Exp_15`), or from its `id1::`/`id2::` field. If `NMR_id` is filled as well, those spectra open too.

If the notice says *no notebook number for the code …*, add that project code under **Notebooks**; *no folders starting with 010015* lists the folders that were searched.

### Simplifying the template

Two parts of the NMR section are then not needed and can be deleted. Do it **in the template**, not in each note:

- `Templates/Exp_.md` (and the template of every other project, `Templates/<code>_.md`) for that project's new notes;
- `Templates/dont delete - template for project templates.md` for projects created later with **add project**.

**1. `NMR_id` and the Add NMR button** — if your spectrum folders are named after the notebook page. The **Open in TopSpin** button then finds the spectra from the note number alone. Delete the line `**NMR_id**::` and the whole block of the **Add NMR** button (from ` ```meta-bind-button ` with `label: Add NMR` to the closing ` ``` `). Keep in mind:

- Add NMR is also what puts a sample into the [[NMR Journal]] (with the solvent and the next NMR number); without it, keep track of the samples yourself, or keep the button;
- the `NMR_id` column of the tables in `Stat/Scope.md` and `Stat/zFInal prod table.md` stays empty; delete `NMR_id,` from their queries if you do not want it;
- keep `**solvent**::` and `**frequency**::` if you fill them in by hand (Chemistry Word Report and the tables use them).

**2. The link to the MestReNova file** — if you process the spectra in TopSpin. The line `![[Exp_<% id1 %>.mnova]]` (`![[IM_<% id %>.mnova]]` in the project-template master) only shows a MestReNova document saved in **Files**. TopSpin keeps its processing in the spectrum folder, so the link can be deleted.

Template Guard follows the template: the deleted parts are no longer protected or restored, new notes are created without them, and notes created earlier keep them as ordinary text, which you can delete by hand if you like (see [[Template Guard guide]]).

### Opening any folder

The command **Open a Bruker spectrum folder in TopSpin** asks for a path. Paste an experiment folder (`…\7170`), a folder with several experiments (each opens in its own window), a `pdata\1` folder or a `1r` file.

### Working with several spectra in TopSpin

- The left panel of TopSpin has a **windows** tab (the third one, with the number of open windows). It lists every open spectrum with a small preview and stays open; a click switches to that spectrum. The same list opens from the **Window Switcher** button at the top right.
- **F6** cycles through the windows, **Ctrl+W** closes the active one, the command `closeall` closes all.
- To see several spectra at once use **Show Layout Options** (grid, stack, side by side); to superimpose them in one window use multiple display (`md`).

## 8. Problems and solutions

| Problem | Solution |
|---|---|
| *Skipped a mail from … Gmail did not confirm the sender* | The mail is not authenticated for the sender's domain (or its From address is forged). If it is a genuine mail of your NMR service, ask its administrators to set up SPF / DKIM for their mail server, or switch off **Check the sender**. |
| After an update nothing changed | Obsidian still runs the old files. Check the version in **Settings → Community plugins**. Make sure the new `main.js` is in `<vault>\.obsidian\plugins\nmr-downloader\` (not in an extra subfolder), then restart Obsidian or switch the plugin off and on. |
| TopSpin settings are not shown | The plugin is older than 1.5.0: update it (section 2). |
| *NMR Downloader: please finish the settings* | The notice lists the empty fields; fill them in (section 4). |
| *Google sign-in has expired or was revoked* | Press **Authorize again**. To keep it from expiring, publish the Google app (section 3, step 4). |
| *Access blocked: … has not completed the Google verification process* | The app is in *Testing* and your address is not a test user: publish the app or add yourself as a test user (section 3, step 4). |
| *Gmail API has not been used in project* | Enable the Gmail API (section 3, step 2). |
| *Google hasn't verified this app* | Expected for your own app: **Advanced → Go to … (unsafe)**. |
| **Test** finds 0 mails | The mails were already read, or the sender address differs: open one NMR mail in Gmail and copy the exact sender address. |
| An archive was downloaded but not unpacked | Its name does not match `PREFIX_NAME<MHz>-<year>_<number>.zip`, or the prefix or user name differs from the settings. It stays in the download folder. |
| *TopSpin: no spectra found for NMR_id …* | The notice shows the searched folders. Check that the spectra of that number are there (`…_7220-7229` or `7220`), and that `frequency` in the note matches a frequency in the settings. |
| *TopSpin not found* | Set **TopSpin folder** to the folder with `topspin.cmd` and press **Check**. |
| *TopSpin did not answer on port 5650* | TopSpin took longer than 3 minutes to start, or it was closed. Start TopSpin and press the button again. |
| *MestReNova not found* | Set the full path to `MestReNova.exe` and press **Check**. |

More technical details (the commands the plugin sends to TopSpin, the scripting function for buttons) are in `.obsidian/plugins/nmr-downloader/README.md`.
