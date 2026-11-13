<%*
const sourceFolder = "Journal"
const outputFolder = "Report"
const chunkSize = 150
const code = "Exp_"

const files = app.vault.getMarkdownFiles()
  .filter(f =>
    f.path.startsWith(sourceFolder + "/") &&
    f.basename.startsWith(code)
  )
  .sort((a, b) => {
    const getNumber = name => {
      const match = name.match(new RegExp(`^${code}(\\d+)`))
      return match ? parseInt(match[1], 10) : 0
    }
    return getNumber(a.basename) - getNumber(b.basename)
  })

function chunkArray(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

const chunks = chunkArray(files, chunkSize)

if (!app.vault.getAbstractFileByPath(outputFolder)) {
  await app.vault.createFolder(outputFolder)
}

for (let i = 0; i < chunks.length; i++) {
  const chunk = chunks[i]
  const start = i * chunkSize
  const end = start + chunk.length
  const noteName = `${code}${start}_${end} report.md`
  const notePath = `${outputFolder}/${noteName}`

  const content = chunk
    .map(f => `![[${f.basename}|clean|full no-title]]`)
    .join("\n")

  const existing = app.vault.getAbstractFileByPath(notePath)

  if (existing) {
    await app.vault.modify(existing, content)
  } else {
    await app.vault.create(notePath, content)
  }
}
%>