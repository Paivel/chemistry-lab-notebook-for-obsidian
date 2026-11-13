<%*
const file = app.workspace.getActiveFile()
if (!file) {
  new Notice("No active file")
  return
}

const content = await app.vault.read(file)

// find dataview block
const match = content.match(/```dataview([\s\S]*?)```/)

if (!match) {
  new Notice("Dataview block not found")
  return
}

let query = match[1]

// convert to single line
query = query
  .replace(/\s+/g, " ")   // replace all whitespace/newlines with a single space
  .trim()

// add newline after the comment
const serialized = `---
cssclasses:
  - wide-page
---

<!-- QueryToSerialize: ${query} -->
`

const folder = file.parent.path
const baseName = file.basename
const newName = `${baseName} QueryToSerialized-ev`
const newPath = `${folder}/${newName}.md`

const existing = app.vault.getAbstractFileByPath(newPath)

// create or update file
if (existing) {
  await app.vault.modify(existing, serialized)
} else {
  await app.vault.create(newPath, serialized)
}
%>