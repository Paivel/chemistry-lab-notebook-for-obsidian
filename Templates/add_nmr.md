<%*
const solvents = [
  "CDCl3",
  "DMSO-d6",
  "D2O",
  "DCM-d2",
  "acetone-d6",
  "methanol-d4",
  "benzene-d6"
];

// "Other…" asks for a solvent that is not in the list (CD3CN, THF-d8, toluene-d8, mixtures)
const OTHER = "Other…";
let solvent = await tp.system.suggester(  
[...solvents, OTHER],  
[...solvents, OTHER],  
false,  
"Select NMR solvent"  
);
if (!solvent) return;
if (solvent === OTHER) {
  solvent = await tp.system.prompt("Enter NMR solvent (e.g. CD3CN, THF-d8, toluene-d8)");
  solvent = (solvent ?? "").replace(/\s+/g, " ").trim();
  if (!solvent) return;
}

const mass = await tp.system.prompt("Enter compound mass");
if (mass === null) return;



const spectraOptions = [
  "1H",
  "13C",
  "Dept",
  "HSQC",
  "HMBC",
  "HSQC-15N",
  "HMBC-15N",
  "COSY",
  "NOESY",
  "19F",
  "31P"
];

let selectedSpectra = [];

while (true) {
  const remainingSpectra = spectraOptions.filter(s => !selectedSpectra.includes(s));

  const choices = [
    ...remainingSpectra,
    OTHER,
    "Done"
  ];

  const selected = await tp.system.suggester(
    choices,
    choices,
    false,
    selectedSpectra.length
      ? `Select spectra. Selected: ${selectedSpectra.join(", ")}`
      : "Select spectra"
  );

  if (!selected || selected === "Done") break;

  // "Other…" asks for an experiment that is not in the list (TOCSY, ROESY, 11B, 29Si…); it can be chosen again
  if (selected === OTHER) {
    let other = await tp.system.prompt("Enter NMR experiment (e.g. TOCSY, ROESY, 11B, 29Si)");
    other = (other ?? "").replace(/\s+/g, " ").trim();
    if (other && !selectedSpectra.includes(other)) selectedSpectra.push(other);
    continue;
  }

  selectedSpectra.push(selected);
}
const comment = await tp.system.prompt("Enter comment");
if (comment === null) return;

const activeFile = app.workspace.getActiveFile();
const noteTitle = activeFile.basename;
const today = tp.date.now("YYYY-MM-DD");

let noteText = await app.vault.read(activeFile);

// text for a table cell: "|" would start a new column, so it is escaped (also in an image link with a width, such as image.png|300)
const cell = (value) => String(value ?? "").replace(/\r?\n/g, " ").replace(/(?<!\\)\|/g, "\\|");

// pic:: may carry a display width (an image link ending in |300); keep it, with the "|" escaped for the table
const picMatch = noteText.match(/\*\*pic\*\*::\s*!\[\[([^|\]]+)(?:\|([^\]]*))?\]\]/);
const picLink = picMatch ? `![[${picMatch[1]}${picMatch[2] ? "\\|" + picMatch[2] : ""}]]` : "";

const mnovaMatches = [...noteText.matchAll(/!\[\[([^|\]]+\.mnova)(?:\|[^\]]*)?\]\]/gi)];
const mnovaLinks = mnovaMatches.map(m => `![[${m[1]}]]`).join(", ");

const journalPath = "Stat/NMR Journal.md";
const journalFile = app.vault.getAbstractFileByPath(journalPath);

if (!journalFile) {
  new Notice("NMR Journal not found: " + journalPath);
  return;
}

let journalText = await app.vault.read(journalFile);

const nmrNumbers = journalText
  .split("\n")
  .filter(line => line.startsWith("|"))
  .map(line => line.split("|")[2]?.trim())
  .map(Number)
  .filter(n => !isNaN(n));

if (nmrNumbers.length === 0) {
  new Notice("No NMR numbers found in journal table");
  return;
}

const lastNmr = Math.max(...nmrNumbers);
const nextNmr = Math.ceil((lastNmr + 1) / 10) * 10;

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

noteText = appendInlineField(noteText, "NMR_id", nextNmr);
noteText = appendInlineField(noteText, "solvent", solvent);

await app.vault.modify(activeFile, noteText);

const defaultSpectra = [
  "1H",
  "13C",
  "Dept",
  "HSQC",
  "HMBC",
  "HSQC-15N",
  "HMBC-15N"
];

const extraSpectra = [
  "COSY",
  "NOESY",
  "19F",
  "31P"
];

const spectraCell = [
  ...defaultSpectra.map(s => `[${selectedSpectra.includes(s) ? "x" : " "}] ${s}<br>`),
  ...extraSpectra
    .filter(s => selectedSpectra.includes(s))
    .map(s => `[x] ${s}<br>`),
  // experiments typed after "Other…", in the order they were entered
  ...selectedSpectra
    .filter(s => !defaultSpectra.includes(s) && !extraSpectra.includes(s))
    .map(s => `[x] ${cell(s).replace(/[<>]/g, "")}<br>`)
].join("");


const newRow = `| ${today} | ${nextNmr} | ${cell(solvent)} | ${spectraCell} | [[${noteTitle}]] | ${picLink} | ${cell(mass)} | ${mnovaLinks} | ${cell(comment)} | [ ] |`;


const lines = journalText.split("\n");
const separatorIndex = lines.findIndex(line => /^\|\s*-/.test(line));

if (separatorIndex === -1) {
  new Notice("Could not find table separator in NMR Journal");
  return;
}

lines.splice(separatorIndex + 1, 0, newRow);
journalText = lines.join("\n");

await app.vault.modify(journalFile, journalText);

new Notice(`NMR ${nextNmr} added`);
%>