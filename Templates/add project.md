<%*
const letters = await tp.system.prompt("Which letters do you want to use as a code?")
if (!letters) {
  new Notice("No letters entered")
  return
}

const code = `${letters}_`
const journalRoot = "Journal"
const targetFolder = `${journalRoot}/${letters}`
const finishedFolder = `${targetFolder}/Finished`
const scriptsFolder = "Scripts"
const templatesFolder = "Templates"
const templateSourceName = "dont delete - template for project templates"
const reportSourceName = "dont delete -template for report IM_"

// create folders if missing
if (!app.vault.getAbstractFileByPath(targetFolder)) {
  await app.vault.createFolder(targetFolder)
}

if (!app.vault.getAbstractFileByPath(finishedFolder)) {
  await app.vault.createFolder(finishedFolder)
}

// find existing idnext files in Scripts
const scriptFiles = app.vault.getFiles().filter(f =>
  f.path.startsWith(`${scriptsFolder}/`) &&
  /^idnext\d*$/.test(f.basename)
)

// determine next number
let maxNumber = 0
for (const f of scriptFiles) {
  const match = f.basename.match(/^idnext(\d*)$/)
  if (match) {
    const num = match[1] === "" ? 0 : parseInt(match[1], 10)
    if (num > maxNumber) maxNumber = num
  }
}

const nextNumber = maxNumber + 1
const newScriptName = `idnext${nextNumber}.js`
const newScriptPath = `${scriptsFolder}/${newScriptName}`

// source file (supports both idnext and idnext.js)
const sourceScript =
  app.vault.getAbstractFileByPath(`${scriptsFolder}/idnext.js`) ||
  app.vault.getAbstractFileByPath(`${scriptsFolder}/idnext`)

if (!sourceScript) {
  new Notice("Source file not found: Scripts/idnext")
  return
}

let sourceContent = await app.vault.read(sourceScript)

// replace id field and Journal path
sourceContent = sourceContent.replace(
  /TABLE id FROM "Journal" WHERE typeof\(id\) = "number" SORT id desc LIMIT 1/g,
  `TABLE id${nextNumber} FROM "${targetFolder}" WHERE typeof(id${nextNumber}) = "number" SORT id${nextNumber} desc LIMIT 1`
)

// create or update script
const existingScript = app.vault.getAbstractFileByPath(newScriptPath)

if (existingScript) {
  await app.vault.modify(existingScript, sourceContent)
} else {
  await app.vault.create(newScriptPath, sourceContent)
}

// find source template
const templateSource =
  app.vault.getAbstractFileByPath(`${templatesFolder}/${templateSourceName}.md`) ||
  app.vault.getAbstractFileByPath(`${templatesFolder}/${templateSourceName}`)

if (!templateSource) {
  new Notice(`Source template not found: ${templatesFolder}/${templateSourceName}`)
  return
}

let templateContent = await app.vault.read(templateSource)

// replace code, idnext, and id
templateContent = templateContent
  .replace(/IM_/g, code)
  .replace(/\bidnext\b/g, `idnext${nextNumber}`)
  .replace(/\bid\b/g, `id${nextNumber}`)

const newTemplateName = `${code}.md`
const newTemplatePath = `${templatesFolder}/${newTemplateName}`

// create or update template
const existingTemplate = app.vault.getAbstractFileByPath(newTemplatePath)

if (existingTemplate) {
  await app.vault.modify(existingTemplate, templateContent)
} else {
  await app.vault.create(newTemplatePath, templateContent)
}

// ===== DUPLICATE REPORT FILE =====

const reportSource =
  app.vault.getAbstractFileByPath(`${templatesFolder}/${reportSourceName}.md`) ||
  app.vault.getAbstractFileByPath(`${templatesFolder}/${reportSourceName}`)

if (!reportSource) {
  new Notice(`Report template not found: ${templatesFolder}/${reportSourceName}`)
  return
}

let reportContent = await app.vault.read(reportSource)

// replace IM_ with new code
reportContent = reportContent.replace(/IM_/g, code)

const newReportName = `report ${code}.md`
const newReportPath = `${templatesFolder}/${newReportName}`

const existingReport = app.vault.getAbstractFileByPath(newReportPath)

if (existingReport) {
  await app.vault.modify(existingReport, reportContent)
} else {
  await app.vault.create(newReportPath, reportContent)
}
%>