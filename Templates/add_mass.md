<%*
// ===================== Settings =====================
// Sample code used in the Mass Journal and on the request form (e.g. PAS_170).
// Change it to your own code. The same prefix is also typed in MS_FORM.xlsx
// (cells E3 and B6), so update it there as well.
const MASS_CODE = "PAS";
// Number given to the first sample when the Mass Journal has no entries yet.
const FIRST_MASS_NUMBER = 1;

const MASS_JOURNAL_PATH = "Stat/Mass Journal.md";
const EXCEL_TEMPLATE_PATH = "Files/MS_FORM.xlsx";

// Cells in the Excel request form
const EXCEL_NUMBER_CELL = "F3";        // sample number
const EXCEL_COMMENT_CELL = "B13";      // comment line
const EXCEL_IMAGE_RANGE = "D6:H12";    // area for the structure image
const EXCEL_DEFAULT_COMMENT = "required error no more than 10 ppm";

// Image widths in pixels
const NOTE_IMAGE_WIDTH = 200;          // Mass_pic in the reaction note
const JOURNAL_IMAGE_WIDTH = 300;       // image in the Mass Journal table
// ====================================================

const MASS_PREFIX = `${MASS_CODE}_`;
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const activeFile = app.workspace.getActiveFile();
const noteTitle = activeFile.basename;
const today = tp.date.now("YYYY-MM-DD");

let noteText = await app.vault.read(activeFile);

// ask for the comment written to the Excel form
const commentInput = await tp.system.prompt("Comment for the MS form?");
const massComment = commentInput ? commentInput.trim() : "";

// find Mass_pic
const picMatch = noteText.match(/\*\*Mass_pic\*\*::\s*!\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/);
if (!picMatch) {
  new Notice("Mass_pic not found");
  return;
}

const picName = picMatch[1];
const picFile = app.metadataCache.getFirstLinkpathDest(picName, activeFile.path);

if (!picFile) {
  new Notice("Image file not found: " + picName);
  return;
}

const vaultPath = app.vault.adapter.basePath;
const picPath = `${vaultPath}\\${picFile.path.replace(/\//g, "\\")}`;

// open Mass Journal
const journalPath = MASS_JOURNAL_PATH;
const journalFile = app.vault.getAbstractFileByPath(journalPath);

if (!journalFile) {
  new Notice("Mass Journal not found: " + journalPath);
  return;
}

let journalText = await app.vault.read(journalFile);

// find the last sample number for MASS_CODE
const massNumberRegex = new RegExp(`\\|\\s*${escapeRegExp(MASS_PREFIX)}(\\d+)\\s*\\|`, "g");
const massNumbers = [...journalText.matchAll(massNumberRegex)]
  .map(m => Number(m[1]))
  .filter(n => !isNaN(n));

const nextMassNumber = massNumbers.length === 0 ? FIRST_MASS_NUMBER : Math.max(...massNumbers) + 1;
const nextMassId = `${MASS_PREFIX}${nextMassNumber}`;

// update current note Mass_id
function appendInlineField(text, fieldName, value) {
  const regex = new RegExp(`^(\\*\\*${fieldName}\\*\\*::[ \\t]*)([^\\r\\n]*)`, "m");

  if (!regex.test(text)) {
    return text + `\n**${fieldName}**:: ${value}`;
  }

  return text.replace(regex, (match, prefix, existing) => {
    const clean = existing.trim();

    if (!clean) {
      return `${prefix}${value}`;
    }

    const values = clean.split(",").map(v => v.trim());

    if (values.includes(String(value))) {
      return `${prefix}${clean}`;
    }

    return `${prefix}${clean}, ${value}`;
  });
}

noteText = appendInlineField(noteText, "Mass_id", nextMassNumber);
noteText = noteText.replace(  
/(\*\*Mass_pic\*\*::\s*!\[\[)([^|\]]+)(?:\|[^\]]*)?(\]\])/,  
`$1$2|${NOTE_IMAGE_WIDTH}$3`  
);
await app.vault.modify(activeFile, noteText);

// add row to Mass Journal
// "|" in a table cell starts a new column: the image width is written as \\| and a "|" in the comment is escaped
const newRow = `| ${today} | ${nextMassId} |  | ![[${picName}\\|${JOURNAL_IMAGE_WIDTH}]] | [[${noteTitle}]] | ${massComment.replace(/\r?\n/g, " ").replace(/(?<!\\)\|/g, "\\|")} |`;

const lines = journalText.split("\n");
const separatorIndex = lines.findIndex(line => /^\|\s*-/.test(line));

if (separatorIndex === -1) {
  new Notice("Could not find table separator in Mass Journal");
  return;
}

lines.splice(separatorIndex + 1, 0, newRow);
journalText = lines.join("\n");

await app.vault.modify(journalFile, journalText);

// Excel part
const { execFileSync } = require("child_process");

const excelFile = app.vault.getAbstractFileByPath(EXCEL_TEMPLATE_PATH);

if (!excelFile) {
  new Notice("Excel template not found: " + EXCEL_TEMPLATE_PATH);
  return;
}

const excelTemplate = `${vaultPath}\\${excelFile.path.replace(/\//g, "\\")}`;

function escapePowerShellString(value) {
  return String(value)
    .replace(/`/g, "``")
    .replace(/"/g, '`"')
    .replace(/\$/g, "`$");
}

const psComment = escapePowerShellString(massComment);

const psScript = `
$excelPath = "${excelTemplate}"
$imagePath = "${picPath}"
$massNumber = "${nextMassNumber}"
$comment = "${psComment}"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Open($excelPath)
$ws = $wb.Worksheets.Item(1)

$ws.Range("${EXCEL_NUMBER_CELL}").Value2 = $massNumber

# add_mass
$ws.Range("${EXCEL_COMMENT_CELL}").ClearContents()

$defaultText = "${escapePowerShellString(EXCEL_DEFAULT_COMMENT)}"

if ($comment -ne "") {
    $ws.Range("${EXCEL_COMMENT_CELL}").Value2 = "$comment, $defaultText"
} else {
    $ws.Range("${EXCEL_COMMENT_CELL}").Value2 = $defaultText
}

$target = $ws.Range("${EXCEL_IMAGE_RANGE}")
$left = $target.Left
$top = $target.Top
$width = $target.Width
$height = $target.Height

# Clear merged target area before inserting image
$target.ClearContents()

# Remove existing pictures inside the image area
for ($i = $ws.Shapes.Count; $i -ge 1; $i--) {
    $shape = $ws.Shapes.Item($i)

    if ($shape.Left -ge $left -and
        $shape.Left -le ($left + $width) -and
        $shape.Top -ge $top -and
        $shape.Top -le ($top + $height)) {
        $shape.Delete()
    }
}

# Insert image at original size
$pic = $ws.Shapes.AddPicture($imagePath, $false, $true, $left, $top, -1, -1)
$pic.LockAspectRatio = $true

# Shrink only if needed
$scaleW = $width / $pic.Width
$scaleH = $height / $pic.Height
$scale = [Math]::Min($scaleW, $scaleH)

if ($scale -lt 1) {
    $pic.Width = $pic.Width * $scale* 0.95
}

# Center image in the image area
$pic.Left = $left + (($width - $pic.Width) / 2)
$pic.Top = $top + (($height - $pic.Height) / 2)

$ws.Activate()

$ws.PrintOut(  
1,  
1,  
1,  
$false  
)

# Print first page only
$excel.Visible = $true  
$ws.Activate()  
  
$excel.Dialogs.Item(88).Show()

# Close Excel without saving changes
$wb.Close($false)
$excel.Quit()

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pic) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ws) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($wb) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

[GC]::Collect()
[GC]::WaitForPendingFinalizers()
`;

execFileSync("powershell.exe", [
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  psScript
]);

new Notice(`${nextMassId} added and first page printed`);
%>