# Welcome note

1. Download and install the [Obsidian app](https://obsidian.md/download).
2. Download the repository from GitHub (**Code → Download ZIP**) and extract it to a local folder, OneDrive, or another cloud storage service.
3. Rename the folder as desired (for example, **Lab Notebook Obsidian**).
4. Open Obsidian and select the folder as your vault.
5. Trust the author and enable the required plugins.
6. Close the Settings window.
7. Read this welcome note. A description of every script, CSS snippet, and plugin in the vault is given in [[Vault Components]].

> [!danger] IMPORTANT
> Obsidian is free for personal, commercial, educational, and nonprofit use, but it is not open source. All your files remain on your computer and are available offline at any time unless you choose to use a synchronization service.
>
> If a virus or hardware failure damages your files, they may be lost permanently. To prevent data loss, **back up your files to an external drive (SSD or USB flash drive) at least once a month**.
>
> A **backup reminder** is scheduled for the **first Sunday of every month at 9:00 AM**. You can adjust its frequency, date, and time in the [[Reminder]] note in the **Stat** folder.

For free file synchronization, you can use OneDrive or another cloud service.

## How the Notebook Works

Each reaction is one note. Files from your drawing program, the NMR service and your phone go into it, and the plugins made for this notebook (blue) turn what is in the notes into schemes, summary tables, search results and a draft of the Supporting Information. Everything stays in this folder on your computer.

![[plugins-overview.png|560]]

## Obsidian Interface Overview

Obsidian consists of three main sections:

- **Left panel** — Functions as a file explorer. You can create folders and notes; move, rename, delete, and copy them; and use the search function.
- **Central area** — Works like a web browser. You can open links in new tabs, switch between them, close tabs, and arrange them in a split view.
- **Right panel** — Displays information such as the outline (table of contents), tags, backlinks, outgoing links, and reminders. Views provided by some plugins can also be opened here.

Obsidian has three view modes:

1. **Reading Mode** — Displays the rendered note without allowing direct editing.
2. **Source Mode** — Allows you to edit the raw Markdown.
3. **Live Preview** — A hybrid mode that allows editing while displaying most formatting in real time.

To switch between Reading Mode and the current editing mode, press **Ctrl + E**. To switch between Source Mode and Live Preview, press **Ctrl + R**. You can also use the mode selector in the bottom-right corner.

![[Welcome note-5.png]]

## Getting Started
> [!tip]
> You can skip this section for now if you are using Obsidian for the first time. For demonstration purposes, I have already created two buttons in the left panel: one for creating a new reaction note and another for creating a project report. The example project uses the code Exp_. You can use these buttons or follow the steps below to create your own.
> ![[Welcome-note-1.png]]


- Create your ID: click the **Aa** button in the left panel and choose a unique two- or three-letter code. This code will be used to name all reaction notes and files in one project. You can create as many projects as you need, each with a different code and an independent numbering sequence.

![[Welcome note-41.png]]

- Go to **Settings → QuickAdd**, create a new choice, and select **Template**.

![[Welcome note-42.png]]

- You can rename the choice at the top by clicking the edit button (eg PAS_).

![[Welcome note-45.png]]

- Select the template. This is the automatically generated file in the **Templates** folder named PAS_.md, where PAS is the unique code you selected. Also set PAS_temp as the file name format (only a temporary name: the template renames the new note to PAS_1, PAS_2, … right away).

![[Welcome note-43.png]]

- Select **Create in a specific folder**, choose the folder bearing your code inside the **Journal** folder, and click **Add**.

![[Welcome note-46.png]]

- Under the action to take if a file already exists, select **Create another file with an incremented trailing number**. Enable **Open the created file in a new tab**.

![[Welcome note-47.png]]

- Click the lightning-bolt icon.

![[Welcome note-48.png]]

- You can now assign a hotkey to this template under **Settings → Hotkeys** by selecting the QuickAdd: PAS_ command. You can then use this hotkey to create a new note from the template.

![[Welcome note-49.png]]

- Alternatively, add a button to the left panel. Go to **Commander → Ribbon → Add command** and select QuickAdd: PAS_. You can also choose the icon and its color.

![[Welcome note-50.png]]
![[Welcome note-51.png]]

- You can set up report generation in the same way by assigning a hotkey or adding a button. Go to **Settings → Templater → Template hotkeys**.

![[Welcome note-52.png]]

- Select the report PAS_.md file as the template.

![[Welcome note-53.png]]

- You can now assign a hotkey or add a Commander button for the Templater: Insert report PAS_ command.

![[Welcome note-54.png]]
![[Welcome note-55.png]]

- To modify the reaction template, open the template named after your project code in the **Templates** folder—for example, [[Exp_]]—and edit it as needed.

## Tips and Tricks

- Each **reaction** corresponds to a separate note with a unique ID and a code associated with a particular project. All reaction notes are stored in the **Journal** folder.
- Examples of completed reaction notes can be found in the Journal folder: [[IM_1 Cl acenaphthene]] and [[IM_2 CF3 cyclohexene]]. This is how [[IM_1 Cl acenaphthene]] looks: the scheme and reagent table under **Table**, the fields below it, and today's tasks and the calendar on the right.

![[reaction-note.png]]
- Use the QuickAdd hotkey (Exp_) or the QuickAdd button ![[Welcome-note-2.png]] in the left panel to create a new note (see [[#Getting Started]]). The new note is named right away by its code and number (**Exp_5**). You can add a short name after the code in the title heading (`# Exp_5 Suzuki`); the file name follows it automatically. If a note is ever left as **Exp_temp** (for example, when the renaming failed), editing its title fixes the name.
- The template parts of a reaction note (headings, field labels such as `**yield**::`, the note number `**id1**:: 005` with its value, table borders and the first word of a table header such as `TLC`, buttons, the page break at the end of the note) are protected by **Template Guard** (it reads the rules from the project template, no setup is needed): they cannot be deleted or changed by typing, and nothing can be appended to a heading. Values, table cells and the procedure are edited as usual; in the title `# Exp_5 Suzuki` only the code is fixed. To change the structure of one note on purpose, click **🔒 Template** in the status bar (or assign a hotkey to *Template Guard: Lock / unlock the template in this note* in **Settings → Hotkeys**). If a note misses a template part when it is opened, Template Guard lists it and offers **Restore**. See [[Template Guard guide]].
- To add a field to all notes of a project, add it to the project template (`Templates/Exp_.md`) and save: Template Guard offers to add it to the existing notes, including the finished ones. A field deleted from the template is no longer protected or restored; old notes keep it.
- Clicking the standard **New note** button creates an empty note without the template. **Do not use it to create a reaction note**, because the resulting note will be outside the journal system and will not be included when working with reaction notes.

![[Welcome note-56.png]]

- Always add a short description to the note title. This makes notes easier to identify without opening them or performing a search. Keep the description brief because space in the left panel is limited.

![[Welcome-note-3.png|265]]
  ![[Welcome note-57.png|249]]

- **Always begin by adding a description or tags.** After making the first change, wait **three seconds** before pasting an image. This ensures that the pasted image is renamed according to the note name.
- At the **top** of a note, you will see its **properties**, where you can select **tags**. Tags help organize notes and generate product lists (reaction scopes) or optimization tables.

  ![[Welcome note-22.png|394]]

- **Links to the reaction file and the MestReNova file** are created automatically when you create a note from a template. The reaction file is linked as IM_1.cdxml: a reaction drawn with Reactio Draw is saved under this name, and ChemDraw saves CDXML too (*Save As* → CDXML). If you keep a ChemDraw .cdx file instead, the scheme still appears (CDX Scheme Image finds the file by its name); only the link stays empty until you change it to IM_1.cdx. Save the files in the **Files** folder in OneDrive using the correct names (for example, IM_1.cdxml, IM_1.mnova, and IM_1.pdf), and the links will become active. The reaction files of the example notes were drawn in Reactio Draw; their MestReNova and PDF spectrum files are not included, so those links stay empty. These programs and formats are optional: you can manually attach or link spectra and structure files produced by other software, or adapt the templates to use your preferred file extensions.
- You can add the **Files** folder to Quick Access in File Explorer for faster access when saving files.

  ![[Welcome note-6.png|255]]

- All files are stored directly in the **Files** folder without subfolders. Sorting by name therefore allows you to find all files associated with a particular reaction quickly.

  ![[Welcome note-11.png|263]]

- To open your CDX editor (**ChemDraw**, or the **Reactio Draw** app if `.cdx` files open in it) quickly, use the link *Open CDX Editor* at the bottom of the note. You can save the resulting file as IM_1.cdxml (or IM_1.cdx) later. **Reactio Draw, included in the vault, can be used instead of ChemDraw** (see below).

  ![[Welcome note-14.png|403]]

- **With ChemDraw, the reaction scheme and reagent-calculation table are added automatically** by the **CDX Scheme Image** plugin. When you save IM_1.cdx in the **Files** folder, the plugin draws the reaction and its reagent table as set up in ChemDraw (for example, ACS Document 1996 style) and inserts the image under **Table** in note IM_1; each later save of the ChemDraw file updates the image in the note.
- **Without ChemDraw: draw the reaction in Obsidian with Reactio Draw.** A new reaction note has the picture *Click to draw the reaction and the reagent table* under **Table**. Click it: `IM_1.cdxml` is created in the **Files** folder (the name comes from the start of the note name) and opens in a Reactio Draw tab; the side panels are hidden while you draw. Draw the reaction and fill in the reagent table, then press **Ctrl/Cmd+S** or **Ctrl/Cmd+W**: the file is saved and the tab closes. The scheme with its tables replaces the picture under **Table**, and the product's MW, the yield, the weighed product mass (`mass::`) and the conditions (`temperature::`, `time::`, `atmosphere::`, `other::`) are filled in, as with ChemDraw. Click the scheme later to edit it again. The file is ordinary CDXML, so ChemDraw and the Reactio Draw app open it too. If the reaction is drawn in ChemDraw (`IM_1.cdx`), keep using ChemDraw; the picture only reminds you of that. To draw in ChemDraw (or the Reactio Draw app) from the same picture, choose **Settings → Reactio Draw → Open reaction files in → Default program outside Obsidian**: the click then creates a blank `IM_1.cdxml` and opens it in that program, and a click on the scheme opens the file there again.
- **Conditions from the file.** If the scheme has a caption with the lines *Temperature: …*, *Time: …*, *Atmosphere: …*, *Other: …* (Reactio Draw writes it; typed like this in ChemDraw it works too), the values go into the `temperature::`, `time::`, `atmosphere::` and `other::` fields. A value you typed yourself is kept.
- **With other drawing software, reagent-calculation tables should be added as screenshots.** For high-quality images, zoom in on the relevant area before taking the screenshot; this is particularly useful when exporting the note to PDF. To enable quick screenshots in Windows 11, go to **Settings → Accessibility → Keyboard** and enable **Use the Print Screen button to open screen snipping**.
- Alternatively, if the drawing software supports copying a selection as a PNG, paste the exported image directly into Obsidian. The resulting image will generally have better quality than a screen capture.
- You can periodically remove obsolete table images using the **Clear Unused Images Plus** button in the left ribbon. Do not add or edit image links while this process is running, because files may be deleted accidentally. If you have recently pasted an image, switch to another note or click outside the image before clearing unused images.

  ![[Welcome note-15.png|217]]

- You can also add and resize images directly in your notes.
- Once all tasks associated with a reaction (**NMR, mass spectrometry, yield, etc.**) are complete, click the **Finish** button at the bottom of the note. The note will automatically move to the **Finished** folder. If this folder contains many notes, collapse it to save space in the file explorer.

![[Welcome note-58.png|415]]

- To link to another Obsidian note—for example, a note describing the preparation of a starting material—use \[\[Note name\]\]. You can use such links to cite the exact preparation in the description section. Obsidian backlinks then show every later experiment that refers to that preparation, making it easy to trace a specific batch of material and count how many reactions were performed with it.
- To create a **shortened external link**, use \[Link Name\]\(URL\). Reagents listed in a reaction note can be linked to their specific records in a laboratory inventory or reagent database. For example, a **LabSuit** link can open the exact reagent entry or a CAS-number search, providing one-click access to the corresponding inventory information. For more information about formatting, see the [Obsidian Help Guide](https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax).
- Templates include various **fields** such as `date`, `ID`, `description`, `yield`, and `needed`. These fields are used to generate **Dataview tables** that summarize information from multiple notes. Learn more about Dataview [here](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/An+Introduction+to+Dataview).
- The `needed::` field is used to track outstanding tasks for older reactions.

  ![[Welcome note-18.png]]

- The `pic::` field at the bottom of a note is used to add a product image to tables.
- All notes in the **Stat** folder open in Reading Mode by default because they primarily contain summary tables. To make a note open in Edit Mode, change its default view property.
 ![[Welcome-note.png|343]]
- To add **TLC photographs, text, or other information** from your phone quickly, you can use **Telegram**. Telegram is only one suggested way to transfer photos from a phone and is optional. Alternatively, you can use the OneDrive mobile app (or another cloud storage app): upload the photo to a folder that is synchronized with your computer, or directly to the vault's **Files** folder if the vault itself is stored in OneDrive, and then drag or paste the image into the reaction note in Obsidian on the computer. In this case the image is inserted manually; automatic insertion into the TLC table works only through the Telegram workflow. The vault does not include a Telegram bot; to use Telegram, set up your own once:

  1. **Create a bot.** In Telegram, open [@BotFather](https://t.me/BotFather), send `/newbot`, enter a display name for the bot, and then a username that ends in `bot` (for example, `my_lab_journal_bot`). BotFather replies with a **bot token** such as `6123456784:AAX9mXnFE2q9WahQ…`. Keep the token private: anyone who has it can control the bot.
  2. **Connect the bot.** In Obsidian on your computer, open **Settings → TLC Photo Inbox**, paste the token into **Bot token**, click **Apply** and switch on **Enable the bot**. The token is stored only on this computer, not in the vault.
  3. **Pair your Telegram account.** Under **Pair your Telegram account**, click **Show code** and send `/start <code>` to your bot within 10 minutes. The bot answers only paired accounts.
  4. **Optional: set a default project.** With **Default project** set to your project code (for example, `A`), a photo caption `35` means reaction `A_35`. The rest of a caption (`35 Rf 0.3, hexane/EtOAc 3:1`) is written under the photo in the same cell of the TLC table.
  5. **Test it.** In the bot, press **📋 Reactions**, choose a reaction from the list and send a photo. While Obsidian is running on your computer, the photo is saved, removed from the chat and, after you confirm, inserted into the TLC table of that reaction note.
- To send a TLC photo, press **📋 Reactions** in the bot (or **🔄 Update list** under any message of the bot), choose the reaction and send one photo or one album. You can also write the reaction code as the caption (`A_35`, or just `35` with a default project). Any other text of the caption (`A_35 Rf 0.3`) is written under the photo in the same cell of the TLC table. After you choose a reaction, the whole caption is text (`2 SM` stays under the photo of the chosen reaction). Ideally, send images for only one reaction note per message.
- Anything else you send or forward to the bot — text, a link to a paper, a PDF — becomes a note in the **Telegram** folder.

- To share your results, **export the note to PDF** and send it together with any associated structure and spectral files stored in the **Files** folder. These may be ChemDraw and MestReNova files or files produced by other structure-drawing and spectrum-processing applications.

  ![[Welcome note-19.png|394]]

- You can export **all journal notes to PDF** at once. Click the Templater button in the left panel (see [[#Getting Started]]). Each button generates a report for a particular project. If your project does not yet have a button, follow the instructions in [[#Getting Started]].
  The button creates combined notes in the **Report** folder, with up to 150 reaction notes in each. Export each combined note to PDF; if you need a single file, merge the resulting PDFs. The limit of 150 notes per combined note keeps PDF export fast; with much larger notes the export may freeze.
  The reaction-note template ends with `<div style="page-break-after: always;"></div>`. In the PDF export this inserts a page break, so each reaction note starts on a new page, as in a paper laboratory notebook.
- Alternatively, you can back up your journal by exporting the folder as one combined PDF or by exporting every note as a separate PDF. The first method is **much faster** but requires some manual steps.

![[Welcome note-24.png]]

- Use the **Search** button in the upper-left corner to search by note name or content. Enter experimental procedures as text rather than as images whenever possible; this makes reagent names searchable.

![[Welcome note-20.png]]

- You can also search by chemical structure. In the **Reaction Structure Search** plugin settings, select the folder containing your journal notes and the folder containing your ChemDraw `.cdx` or `.cdxml` files. The search runs locally and does not require an internet connection.

  ![[Welcome-note-12.png]]

  Click the pencil button (**Reactio Draw**) in the left panel. Draw a product, reactant, or complete reaction, then click the search button in the upper-right corner of the drawing tab. Select the desired search modes and click **Search**. Click a note name in the results to open it.

![[Welcome note-62.png|387]]

- The **Stat** folder contains **Dataview tables**. You can use the Dataview plugin to create tables that update automatically. Notes can be filtered by tags or folder. For example, you can generate an [[Optimization]] table or a [[Scope]] list by using the appropriate tags. You can also list notes created during the previous seven days or generate a list of samples requiring mass-spectrometry measurements, such as [[Mass needed]]. Dataview is highly flexible and can be used in many different ways. For instructions, see the [Dataview documentation](https://blacksmithgu.github.io/obsidian-dataview/) or examine the example notes in Source Mode.
- The Chronology plugin provides statistics about when notes are created and edited. Open it in the right panel and select the target daily notes in the settings. The days will be displayed in different colors, allowing you to track your daily activity easily.

> [!warning] Modified Kanban and Chronology plugins
> This vault includes modified builds of **Kanban** and **Chronology**. They do not receive normal updates from the Obsidian Community Plugins store. Installing or updating the store versions may overwrite the modified builds and remove project-specific changes.
>
> The original **Kanban** plugin can be used instead with little loss of functionality. Replacing the modified **Chronology** plugin with the original version will preserve only part of the functionality used by this workflow, and its appearance will differ.

![[Welcome note-63.png]]
![[Welcome note-64.png|243]]

- Another way to organize your work is the Kanban planner. Open the [[Plan Kanban]] note and place all new tasks in the **Unsorted** column. At the end of the day, distribute them among the appropriate days.
![[Welcome note-66.png]]
- If you open the Kanban task view in the right panel, you will see today's tasks and can change each task's status from **New** to **In progress** or **Done**.

![[Welcome note-67.png|306]]

Every Saturday by default—or on another day selected in the plugin settings—the planner creates columns for a new week and moves all unfinished tasks to **Unsorted**. A priority tag is added each time a task is carried over to another week.

![[Welcome note-68.png|281]]

- In the Kanban planner, you will find two buttons associated with the [[NMR Journal]] and [[Mass Journal]]. These notes help you track NMR and MS samples. Use the corresponding buttons in a reaction note to add an experiment to either table.

![[Welcome note-69.png|365]]
![[Welcome note-70.png|182]]

- For NMR, add an image of the product to the `pic::` field and answer the series of questions about the experiment. This information will be added to the NMR Journal table.
- For MS, the `Mass_pic::` field needs an image containing the structure, molecular formula, and molecular weight; CDX Scheme Image puts it there automatically when the reaction file has one product. The image will automatically be inserted into the MS Excel form and printed, while the sample information will also be added to the Mass Journal table. The Excel template must be located at `Files/MS_FORM.xlsx`. The included file is an example request form for a specific mass-spectrometry facility; replace it with your facility's form (or adapt it) before using the automatic printing function. Automatic printing works only on Windows with Microsoft Excel installed, because it uses PowerShell and Excel automation.
- In the **bottom-left corner**, you can switch between vaults or open **Settings**.

![[Welcome note-23.png]]

- You can customize every part of the system. To begin, however, you do not need to install any plugins beyond those included in the archive—simply start using the journal. Later, you can add snippets, plugins, and scripts as needed. The **Obsidian community is large and active**, so a suitable existing solution can often be found.
- **Keep your journal simple**: the simpler it is, the faster and more convenient it will be to use.

## How to Use It for the First Time

- Whenever you want to run a new reaction, click the button in the left panel to create a new reaction note. You can use the existing button for the Exp_ example project or the button you created by following the instructions in [[#Getting Started]].
![[Welcome-note-4.png]]
- After the note is created, add tags, a short title description, and any relevant information in the description field, such as a link to the preparation of the starting material.
![[Welcome-note-6.png]]
- Draw the reaction and reagent table: either click the picture *Click to draw the reaction and the reagent table* under **Table** (Reactio Draw opens inside Obsidian; **Ctrl/Cmd+S** saves and closes), or open ChemDraw and save the file in the **Files** folder using the reaction ID as the file name—for example, Exp_1.cdx (Exp_1.cdxml also works; keep only one of the two).
- The image of the reaction and reagent table appears in the note automatically (CDX Scheme Image), together with the MW, the yield, the product mass and the conditions. With other drawing software, paste a screenshot or PNG image of the reaction and reagent table into the note.
- Enter the experimental procedure.
- Add new data to the note as it becomes available, including additional procedural details, TLC photographs, NMR and HRMS files, and other analytical data.
- NMR spectra sent by the NMR service by e-mail are downloaded, sorted into folders and opened in MestReNova or TopSpin by **NMR Downloader** (download icon in the left ribbon). Write the experiment numbers in `NMR_id::` (e.g. `7180, 7220`) and the **Open in TopSpin** button in the NMR section opens them. Setup: [[NMR Downloader guide]].
- When you have completed all the required work for the reaction, click the **Finish** button at the bottom of the note.

## Creating a Draft of the Supporting Information

The **Chemistry Word Report** plugin can combine the descriptions of a series of compounds into a single Word document formatted as a draft of ACS-style Supporting Information.

To use it:

1. Complete the required compound descriptions in the corresponding notes.

   ![[Welcome note-38.png]]

2. Complete the additional fields required for the report. You can also add custom fields to the notes and include them in the final report—for example, to specify General Procedure A, B, or C:

   **procedure**:: A
   **yield**:: 82%
   **mass**:: 71.0 mg
   **MW**:: 432.3
   **scale**:: 0.2
   **state**:: Pale yellow solid
   **num_in_article**:: 4.6
   **workup**:: flash filtration through neutral aluminum oxide
   **eluent**:: EtOAc:Hexane = from 1:10 to 1:6
   **solvent**:: DMSO-d6
   **frequency**:: 500
   **Mass_Ionization**:: APCI

   `yield::`, `mass::` and `MW::` are filled in by CDX Scheme Image from the reagent table. `[[mass]]` in the report is this weighed mass; a note without it shows `[mass not recorded]`. `workup::` (with `eluent::`) describes the purification; the ORD export uses it as well (chromatography or another step, see [[Vault Components#Reaction Structure Search]]).

   The NMR fields (`HNMR::`, `CNMR::`, `FNMR::` …) can hold the data as it was copied from a spectrum report or a paper, header included — `1H NMR (500 MHz, C6D6) δ 7.50 (d, 2H), …`. The report writes its own header from `frequency::` and `solvent::`, and the notice after the report says when the pasted header names another nucleus, frequency or solvent.

3. If you need a custom field, add it to the reaction-note template before creating new notes. For existing notes, add the field manually. Then add the corresponding placeholder and, if needed, its default value in the **Chemistry Word Report** plugin settings.

   ![[Welcome-note-8.png]]

4. Create a **Dataview** table in a separate note containing the compounds you want to include. The first column should be `file.link` (otherwise the first link to a note in each row is used). You can filter the entries using a predefined tag such as `#report`. An example is available in the **Stat** folder: [[zFInal prod table]].

5. In the **Chemistry Word Report** plugin settings, check the folder containing your reaction notes, the output folder, and the folder containing the images.

   ![[Welcome-note-9.png]]

6. Open the note containing the Dataview table. If the note has several Dataview queries, the first one is used. Click the **Chemistry Word Report** button in the left ribbon. The plugin runs the query through Dataview and shows how many notes were found; no extra notes are created. A note with a hand-written table whose first column links to the reaction notes works as well.

   ![[Welcome-note-10.png]]

7. Review or edit the compound-description template in the window that opens, then click **Generate**. The DOCX file is saved in the selected output folder and opened in your system's default application.

   ![[Welcome-note-11.png]]

   The paragraph for [[IM_1 Cl acenaphthene]] in the draft. The procedure sentence and the numbers of the starting materials (1.X, 2.Y) come from the template: check them against the recorded reaction and complete them.

   ![[si-report.png|520]]

If you have several compound series, you can create a separate Dataview table for each series, generate the reports using different description templates, and combine the resulting Word documents manually.

## Unusual Hotkeys

![[hot key.png]]

![[hot key-1.png]]
