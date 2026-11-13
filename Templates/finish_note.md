<%*
const file = app.workspace.getActiveFile();
const folder = file.parent.path;


if (folder.toLowerCase().endsWith("/finished") ||  
folder.toLowerCase() === "finished") {  
return;  
}

const targetFolder = `${folder}/Finished`;

if (!app.vault.getAbstractFileByPath(targetFolder)) {
    await app.vault.createFolder(targetFolder);
}

await app.fileManager.renameFile(
    file,
    `${targetFolder}/${file.name}`
);
%>