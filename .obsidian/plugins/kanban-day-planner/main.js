const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  FuzzySuggestModal,
  ItemView,
  MarkdownRenderer,
  moment
} = require("obsidian");

const DEFAULT_SETTINGS = {
  enabled: true,
  triggerFile: "",
  daysAhead: 14,
  cycleStartDay: 6,
  hideLeftSidebar: false,
  hideRightSidebar: false,
  firstRollbackTag: "#yellow",
  repeatedRollbackTag: "#red",

  showJournalButtons: false, // buttons that open two journal notes (in the lab notebook vault: Stat/NMR Journal.md, Stat/Mass Journal.md)
  nmrJournalPath: "",
  massJournalPath: ""
};

const TODAY_VIEW_TYPE = "kanban-today-view";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
];

class VaultFileSuggestModal extends FuzzySuggestModal {
  constructor(app, files, onChoose) {
    super(app);
    this.files = files;
    this.onChoose = onChoose;
    this.setPlaceholder("Select a file...");
  }

  getItems() {
    return this.files;
  }

  getItemText(file) {
    return file.path;
  }

  onChooseItem(file) {
    this.onChoose(file);
  }
}

function splitBodyIntoBlocks(body) {
  if (!body || !body.trim()) return [];

  const lines = body.split("\n");
  const blocks = [];
  let current = [];

  for (const line of lines) {
    if (/^-\s\[[ xX\/-]\]/.test(line)) {
      if (current.length) {
        blocks.push(current.join("\n").trim());
        current = [];
      }
    }
    current.push(line);
  }

  if (current.length) {
    blocks.push(current.join("\n").trim());
  }

  return blocks.filter(Boolean);
}

function splitSectionsForView(text) {
  const regex = /^##\s+(.+)$/gm;
  const matches = [...text.matchAll(regex)];

  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const full = text.slice(start, end).trimEnd();
    const title = matches[i][1].trim();

    const firstNewline = full.indexOf("\n");
    const body = firstNewline === -1 ? "" : full.slice(firstNewline + 1).trim();

    sections.push({
      title,
      full,
      body,
      start,
      end
    });
  }

  const preamble = matches.length ? text.slice(0, matches[0].index).trimEnd() : text.trimEnd();
  return { preamble, sections };
}

function rebuildFromSections(preamble, sections) {
  return [
    preamble,
    ...sections.map(s => {
      const body = s.body && s.body.trim() ? `\n\n${s.body.trim()}` : "";
      return `## ${s.title}${body}`;
    })
  ]
    .filter(Boolean)
    .join("\n\n\n") + "\n";
}

function getTodayTitle() {
  return moment().format("dddd YYYY-MM-DD");
}

function getFirstTaskStatus(block) {
  const firstLine = block.split("\n")[0];
  const m = firstLine.match(/^(\s*-\s\[)([ xX\/-])(\]\s.*)$/);
  return m ? m[2] : null;
}

function cycleStatusChar(ch) {
  if (ch === " " || ch === "") return "/";
  if (ch === "/") return "x";
  if (ch === "x" || ch === "X") return " ";
  if (ch === "-") return " ";
  return " ";
}

function cycleFirstTaskStatusInBlock(block) {
  const lines = block.split("\n");
  if (!lines.length) return block;

  const m = lines[0].match(/^(\s*-\s\[)([ xX\/-])(\]\s.*)$/);
  if (!m) return block;

  const next = cycleStatusChar(m[2]);
  lines[0] = `${m[1]}${next}${m[3]}`;
  return lines.join("\n");
}

function cycleTaskStatusInLine(line) {
  const m = line.match(/^(\s*-\s\[)([ xX\/-])(\]\s.*)$/);
  if (!m) return line;

  const next = cycleStatusChar(m[2]);
  return `${m[1]}${next}${m[3]}`;
}

function cycleTaskStatusInBlockByLineIndex(block, lineIndex) {
  const lines = block.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return block;

  lines[lineIndex] = cycleTaskStatusInLine(lines[lineIndex]);
  return lines.join("\n");
}

function parseTaskBlock(block) {
  const lines = block.split("\n");
  const firstLine = lines[0] || "";
  const m = firstLine.match(/^\s*-\s\[[ xX\/-]\]\s*(.*)$/);

  const subtasks = [];
  const extraLines = [];
  const tags = [];

  function extractTags(text) {
    let cleaned = text.replace(/(^|\s)(#[^\s#]+)/g, (match, prefix, tag) => {
      tags.push(tag);
      return prefix;
    });

    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
    return cleaned;
  }

  const title = extractTags(m ? m[1] : firstLine);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLeft = line.replace(/^\s+/, "");

    const taskMatch = trimmedLeft.match(/^-\s\[([ xX\/-])\]\s*(.*)$/);
    if (taskMatch) {
      subtasks.push({
        lineIndex: i,
        status: taskMatch[1],
        text: taskMatch[2]
      });
    } else if (trimmedLeft.trim().length > 0) {
      const cleaned = extractTags(trimmedLeft);
      if (cleaned) {
        extraLines.push(cleaned);
      }
    }
  }

  return {
    title,
    tags,
    extra: extraLines.join("\n").trim(),
    subtasks
  };
}



function normalizeTag(tagValue, fallback) {
  const raw = String(tagValue || "").trim() || fallback;
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTag(block, tag) {
  const regex = new RegExp(`(^|\\s)${escapeRegExp(tag)}(?=\\s|$)`);
  return regex.test(block);
}

function replaceTag(block, fromTag, toTag) {
  const regex = new RegExp(`(^|\\s)${escapeRegExp(fromTag)}(?=\\s|$)`, "g");
  return block.replace(regex, (match, prefix) => `${prefix}${toTag}`);
}

function addTagToFirstTaskLine(block, tag) {
  const lines = block.split("\n");
  if (!lines.length) return `${tag}`;

  let childIndent = "\t";

  for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(/^(\s+)/);
    if (m) {
      childIndent = m[1];
      break;
    }
  }

  while (lines.length && !lines[lines.length - 1].trim()) {
    lines.pop();
  }

  lines.push(`${childIndent}${tag}`);
  return lines.join("\n");
}

function updateRollbackTag(block, firstTagValue, repeatedTagValue) {
  const firstTag = normalizeTag(firstTagValue, "#yellow");
  const repeatedTag = normalizeTag(repeatedTagValue, "#red");

  function removeTagEverywhere(text, tag) {
    const regex = new RegExp(`(^|\\s)${escapeRegExp(tag)}(?=\\s|$)`, "g");

    return text
      .split("\n")
      .map(line => line.replace(regex, "$1").replace(/\s{2,}/g, " ").replace(/\s+$/, ""))
      .filter((line, index, arr) => {
        if (line.trim()) return true;
        return index !== arr.length - 1;
      })
      .join("\n");
  }

  const hasRepeated = hasTag(block, repeatedTag);
  const hasFirst = hasTag(block, firstTag);

  let cleaned = removeTagEverywhere(block, firstTag);
  cleaned = removeTagEverywhere(cleaned, repeatedTag);

  if (hasRepeated) {
    return addTagToFirstTaskLine(cleaned, repeatedTag);
  }

  if (hasFirst) {
    return addTagToFirstTaskLine(cleaned, repeatedTag);
  }

  return addTagToFirstTaskLine(cleaned, firstTag);
}

function sortUnsortedBlocks(blocks, firstTagValue, repeatedTagValue) {
  const firstTag = normalizeTag(firstTagValue, "#yellow");
  const repeatedTag = normalizeTag(repeatedTagValue, "#red");

  function rank(block) {
    if (hasTag(block, repeatedTag)) return 0;
    if (hasTag(block, firstTag)) return 1;
    return 2;
  }

  return [...blocks].sort((a, b) => rank(a) - rank(b));
}

function createTagBadge(tag, variant) {
  const span = document.createElement("span");
  span.className = `kanban-inline-tag kanban-inline-tag-${variant}`;
  span.setAttribute("data-tag-badge", "true");
  span.setAttribute("data-tag-variant", variant);
  span.textContent = tag;
  return span;
}

function decorateTagBadges(rootEl, firstTag, repeatedTag) {
  if (!firstTag && !repeatedTag) return;

  const tags = [
    { tag: firstTag, variant: "yellow" },
    { tag: repeatedTag, variant: "red" }
  ].filter(x => !!x.tag);

  if (!tags.length) return;

  const variantByTag = new Map(tags.map(x => [x.tag, x.variant]));
  const tagsPattern = tags.map(x => escapeRegExp(x.tag)).join("|");
  const detectRegex = new RegExp(`(^|\\s)(?:${tagsPattern})(?=\\s|$)`);
  const replaceRegex = new RegExp(`(^|\\s)(${tagsPattern})(?=\\s|$)`, "g");

  const renderedTagLinks = rootEl.querySelectorAll("a.tag, a[href], .tag");
  for (const el of renderedTagLinks) {
    const text = (el.textContent || "").trim();
    const variant = variantByTag.get(text);
    if (!variant) continue;
    if (el.closest(".kanban-inline-tag")) continue;

    const badge = createTagBadge(text, variant);
    el.replaceWith(badge);
  }

  const walker = document.createTreeWalker(
    rootEl,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !detectRegex.test(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }

        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const blocked = parent.closest(
          ".kanban-inline-tag, code, pre, .cm-hashtag"
        );

        return blocked ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let current;
  while ((current = walker.nextNode())) {
    textNodes.push(current);
  }

  for (const textNode of textNodes) {
    const text = textNode.nodeValue;
    const frag = document.createDocumentFragment();

    let lastIndex = 0;
    let match;
    replaceRegex.lastIndex = 0;

    while ((match = replaceRegex.exec(text)) !== null) {
      const matchStart = match.index;
      const prefix = match[1];
      const tag = match[2];
      const prefixLength = prefix.length;
      const tagStart = matchStart + prefixLength;

      if (matchStart > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, matchStart)));
      }

      if (prefix) {
        frag.appendChild(document.createTextNode(prefix));
      }

      const variant = variantByTag.get(tag) || "yellow";
      frag.appendChild(createTagBadge(tag, variant));

      lastIndex = tagStart + tag.length;
    }

    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode.replaceChild(frag, textNode);
  }
}

function wireRenderedLinks(app, rootEl, sourcePath) {
  const internalLinks = rootEl.querySelectorAll(".internal-link");
  for (const link of internalLinks) {
    link.addEventListener("click", evt => {
      evt.preventDefault();
      evt.stopPropagation();

      const target =
        link.getAttribute("data-href") ||
        link.getAttribute("href") ||
        link.textContent ||
        "";

      if (target) {
        app.workspace.openLinkText(target, sourcePath, false);
      }
    });
  }

  const externalLinks = rootEl.querySelectorAll("a.external-link, a[href^='http']");
  for (const link of externalLinks) {
    link.addEventListener("click", evt => {
      evt.preventDefault();
      evt.stopPropagation();

      const href = link.getAttribute("href");
      if (href) {
        window.open(href, "_blank");
      }
    });
  }
}

class KanbanTodayView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.renderVersion = 0;
    this.renderTimer = null;
  }

  getViewType() {
    return TODAY_VIEW_TYPE;
  }

  getDisplayText() {
    return "Today's Kanban Tasks";
  }

  getIcon() {
    return "calendar-check";
  }

  scheduleRender(delay = 50) {
    if (this.renderTimer) {
      window.clearTimeout(this.renderTimer);
    }
    this.renderTimer = window.setTimeout(() => {
      this.renderView();
    }, delay);
  }

  async onOpen() {
    this.registerEvent(
      this.app.workspace.on("file-open", async () => {
        this.scheduleRender(30);
      })
    );

    this.registerEvent(
      this.app.vault.on("modify", async file => {
        const triggerPath = (this.plugin.settings.triggerFile || "").trim();
        if (file && file.path === triggerPath) {
          this.scheduleRender(30);
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("layout-change", async () => {
        this.scheduleRender(80);
      })
    );

    await this.renderView();
  }

  async onClose() {
    if (this.renderTimer) {
      window.clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  }

  async openKanbanFile() {
    const triggerPath = (this.plugin.settings.triggerFile || "").trim();
    if (!triggerPath) return;

    const file = this.app.vault.getAbstractFileByPath(triggerPath);
    if (!file) return;

    let leaf = this.app.workspace.getMostRecentLeaf();
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(false);
      if (!leaf) return;
    }

    await leaf.openFile(file, { active: true });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });

    this.plugin.handleActiveFileChange(file);
  }

async openVaultFileByPath(path) {
  const file = this.app.vault.getAbstractFileByPath(path);
  if (!file) {
    new Notice("File not found: " + path);
    return;
  }

  let leaf = this.app.workspace.getMostRecentLeaf();
  if (!leaf) {
    leaf = this.app.workspace.getLeaf(false);
    if (!leaf) return;
  }

  await leaf.openFile(file, { active: true });
  this.app.workspace.setActiveLeaf(leaf, { focus: true });
}

 async renderMarkdownInto(el, markdown, sourcePath) {
  await MarkdownRenderer.render(
    this.app,
    markdown || "",
    el,
    sourcePath,
    this
  );

  const tags = this.plugin.rollbackTags();
  decorateTagBadges(el, tags.first, tags.repeated);
  wireRenderedLinks(this.app, el, sourcePath);
}

  

  

  async renderView() {
    const version = ++this.renderVersion;
    const container = this.contentEl;
    container.empty();
    container.addClass("kanban-today-view");

    const triggerPath = (this.plugin.settings.triggerFile || "").trim();
    if (!triggerPath) {
      container.createEl("div", { text: "Trigger file is not set." });
      return;
    }

    const file = this.app.vault.getAbstractFileByPath(triggerPath);
    if (!file) {
      container.createEl("div", { text: "Kanban file not found." });
      return;
    }

    const text = await this.app.vault.read(file);
    if (version !== this.renderVersion) return;

    const todayTitle = getTodayTitle();
    container.createEl("h3", { text: todayTitle });

    const parsed = splitSectionsForView(text);
    const section = parsed.sections.find(s => s.title === todayTitle);

    if (!section) {
      container.createEl("div", { text: "No section for today." });
      this.renderFooter(container);
      return;
    }

    const blocks = splitBodyIntoBlocks(section.body);

    if (!blocks.length) {
      container.createEl("div", { text: "No tasks for today." });
      this.renderFooter(container);
      return;
    }

    for (let index = 0; index < blocks.length; index++) {
      if (version !== this.renderVersion) return;

      const block = blocks[index];
      const status = getFirstTaskStatus(block) || " ";
      const parsedBlock = parseTaskBlock(block);

      const item = container.createDiv({ cls: "kanban-today-item" });

      const statusBtn = item.createEl("button", {
        cls: "kanban-today-status-button"
      });
      statusBtn.dataset.status = status;
      statusBtn.setAttr("aria-label", `Task status ${status}`);

      statusBtn.onclick = async () => {
        await this.toggleBlockStatus(index);
      };

      const textWrap = item.createDiv({ cls: "kanban-today-text-wrap" });

      const titleEl = textWrap.createDiv({
        cls: "kanban-today-title markdown-rendered"
      });

      await this.renderMarkdownInto(
        titleEl,
        parsedBlock.title || "(empty task)",
        file.path
      );
if (parsedBlock.tags && parsedBlock.tags.length) {
  const tagsEl = textWrap.createDiv({
    cls: "kanban-today-tags markdown-rendered"
  });

  await this.renderMarkdownInto(
    tagsEl,
    parsedBlock.tags.join(" "),
    file.path
  );
}

     if (parsedBlock.extra || parsedBlock.subtasks.length) {
  const extraWrap = textWrap.createDiv({
    cls: "kanban-today-extra"
  });

  if (parsedBlock.extra) {
    const extraEl = extraWrap.createDiv({
      cls: "kanban-today-extra-text markdown-rendered"
    });

    await this.renderMarkdownInto(
      extraEl,
      parsedBlock.extra,
      file.path
    );
  }

  if (parsedBlock.subtasks.length) {
    const subtasksEl = extraWrap.createDiv({
      cls: "kanban-today-subtasks"
    });

    for (const subtask of parsedBlock.subtasks) {
      const subtaskEl = subtasksEl.createDiv({
        cls: "kanban-today-subtask"
      });

      const subBtn = subtaskEl.createEl("button", {
        cls: "kanban-today-status-button kanban-today-subtask-status-button"
      });
      subBtn.dataset.status = subtask.status;
      subBtn.setAttr("aria-label", `Subtask status ${subtask.status}`);

      subBtn.onclick = async () => {
        await this.toggleBlockTaskLineStatus(index, subtask.lineIndex);
      };

      const subText = subtaskEl.createDiv({
        cls: "kanban-today-subtask-text markdown-rendered"
      });

      await this.renderMarkdownInto(
        subText,
        subtask.text || "(empty subtask)",
        file.path
      );
    }
  }
}
    }

    this.renderFooter(container);
  }

renderFooter(container) {
  const footer = container.createDiv({ cls: "kanban-today-footer" });

  const openBtn = footer.createEl("button", {
    cls: "kanban-today-open-button",
    text: "Open Kanban Plan"
  });

  openBtn.onclick = async () => {
    await this.openKanbanFile();
  };

  if (!this.plugin.settings.showJournalButtons) {
    return;
  }

  const nmrPath = String(this.plugin.settings.nmrJournalPath || "").trim();
  const massPath = String(this.plugin.settings.massJournalPath || "").trim();

  if (nmrPath) {
    const openNmrBtn = footer.createEl("button", {
      cls: "kanban-today-open-button",
      text: "Open NMR Journal"
    });

      openNmrBtn.onclick = async () => {
      await this.openVaultFileByPath(nmrPath);
    };
  }

  if (massPath) {
    const openMassBtn = footer.createEl("button", {
      cls: "kanban-today-open-button",
      text: "Open Mass Journal"
    });

      openMassBtn.onclick = async () => {
      await this.openVaultFileByPath(massPath);
    };
  }
}
  async toggleBlockStatus(blockIndex) {
    const triggerPath = (this.plugin.settings.triggerFile || "").trim();
    if (!triggerPath) return;

    const file = this.app.vault.getAbstractFileByPath(triggerPath);
    if (!file) return;

    const text = await this.app.vault.read(file);
    const todayTitle = getTodayTitle();

    const parsed = splitSectionsForView(text);
    const sectionIndex = parsed.sections.findIndex(s => s.title === todayTitle);
    if (sectionIndex === -1) return;

    const blocks = splitBodyIntoBlocks(parsed.sections[sectionIndex].body);
    if (blockIndex < 0 || blockIndex >= blocks.length) return;

    blocks[blockIndex] = cycleFirstTaskStatusInBlock(blocks[blockIndex]);
    parsed.sections[sectionIndex].body = blocks.join("\n\n");

    const rebuilt = rebuildFromSections(parsed.preamble, parsed.sections);
    await this.app.vault.modify(file, rebuilt);

    await this.renderView();
  }
async toggleBlockTaskLineStatus(blockIndex, lineIndex) {
  const triggerPath = (this.plugin.settings.triggerFile || "").trim();
  if (!triggerPath) return;

  const file = this.app.vault.getAbstractFileByPath(triggerPath);
  if (!file) return;

  const text = await this.app.vault.read(file);
  const todayTitle = getTodayTitle();

  const parsed = splitSectionsForView(text);
  const sectionIndex = parsed.sections.findIndex(s => s.title === todayTitle);
  if (sectionIndex === -1) return;

  const blocks = splitBodyIntoBlocks(parsed.sections[sectionIndex].body);
  if (blockIndex < 0 || blockIndex >= blocks.length) return;

  blocks[blockIndex] = cycleTaskStatusInBlockByLineIndex(blocks[blockIndex], lineIndex);
  parsed.sections[sectionIndex].body = blocks.join("\n\n");

  const rebuilt = rebuildFromSections(parsed.preamble, parsed.sections);
  await this.app.vault.modify(file, rebuilt);

  await this.renderView();
}
}

module.exports = class KanbanPlannerPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.isRunning = false;

    this.sidebarState = {
      active: false,
      leftWasOpen: false,
      rightWasOpen: false,
      didAutoHideLeft: false,
      didAutoHideRight: false
    };

    this.registerView(
      TODAY_VIEW_TYPE,
      leaf => new KanbanTodayView(leaf, this)
    );

    this.addSettingTab(new FileOpenScriptTriggerSettingTab(this.app, this));

    this.addCommand({
      id: "run-kanban-maintenance-now",
      name: "Run Kanban maintenance now",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice("Open a Kanban file first.");
          return;
        }
        if (this.isRunning) return;

        try {
          this.isRunning = true;
          const changed = await this.processKanbanFile(file, true);
          new Notice(changed ? "Kanban updated." : "Kanban already up to date.");
        } catch (err) {
          console.error("Kanban maintenance error:", err);
          new Notice(`Kanban maintenance error: ${err.message || err}`);
        } finally {
          this.isRunning = false;
        }
      }
    });

    this.addCommand({
      id: "open-kanban-today-view",
      name: "Open Today's Kanban Tasks",
      callback: async () => {
        await this.activateTodayView();
      }
    });

    this.registerEvent(
      this.app.workspace.on("file-open", file => {
        this.handleActiveFileChange(file);
      })
    );
this.addCommand({
  id: "hide-both-sidebars",
  name: "Hide both sidebars",
  callback: () => {
    this.hideBothSidebars();
  }
});

this.addCommand({
  id: "show-both-sidebars",
  name: "Show both sidebars",
  callback: () => {
    this.showBothSidebars();
  }
});

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", leaf => {
        const file = leaf?.view?.file ?? null;
        this.handleActiveFileChange(file);
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", async file => {
        if (!this.settings.enabled || !file || this.isRunning) return;

        const triggerPath = (this.settings.triggerFile || "").trim();
        if (!triggerPath) return;
        if (file.path !== triggerPath) return;

        try {
          this.isRunning = true;
          const changed = await this.processKanbanFile(file, false);
          await this.refreshTodayViews();
          if (changed) {
            new Notice("Kanban updated.");
          }
        } catch (err) {
          console.error("Kanban maintenance error:", err);
          new Notice(`Kanban maintenance error: ${err.message || err}`);
        } finally {
          this.isRunning = false;
        }
      })
    );
  }

  async onunload() {
    this.restoreSidebarsAfterTriggerFile();
    // the Today tab stays where the user put it (Obsidian's guidelines: no detaching of leaves on unload)
  }

  // the two rollback tags from the settings (used by the Today panel; not offered to other plugins)
  rollbackTags() {
    return {
      first: normalizeTag(this.settings?.firstRollbackTag, "#yellow"),
      repeated: normalizeTag(this.settings?.repeatedRollbackTag, "#red")
    };
  }

  async updateKanbanSettingsTagsInTriggerFile(oldFirstTag, oldRepeatedTag) {
    const triggerPath = (this.settings.triggerFile || "").trim();
    if (!triggerPath) {
      new Notice("Trigger file is not set.");
      return false;
    }

    const file = this.app.vault.getAbstractFileByPath(triggerPath);
    if (!file) {
      new Notice("Kanban file not found.");
      return false;
    }

    const text = await this.app.vault.read(file);
    const updated = this.updateKanbanSettingsTagsInText(text, oldFirstTag, oldRepeatedTag);

    if (updated === text) {
      return false;
    }

    await this.app.vault.modify(file, updated);
    await this.refreshTodayViews();
    return true;
  }

  updateKanbanSettingsTagsInText(text, oldFirstTag, oldRepeatedTag) {
    const newFirstTag = normalizeTag(this.settings.firstRollbackTag, "#yellow");
    const newRepeatedTag = normalizeTag(this.settings.repeatedRollbackTag, "#red");
    const prevFirstTag = normalizeTag(oldFirstTag || newFirstTag, "#yellow");
    const prevRepeatedTag = normalizeTag(oldRepeatedTag || newRepeatedTag, "#red");

    const settingsRegex = /%%\s*kanban:settings\s*\n```(?:json)?\s*\n([\s\S]*?)\n```\s*\n%%/m;
    if (!settingsRegex.test(text)) {
      return text;
    }

    return text.replace(settingsRegex, (full, jsonText) => {
      let obj = {};
      try {
        obj = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse kanban settings JSON:", e);
        return full;
      }

      const yellowColor = {
        color: "rgba(0, 0, 0, 1)",
        backgroundColor: "rgba(255, 226, 7, 1)"
      };

      const redColor = {
        color: "rgba(255, 255, 255, 1)",
        backgroundColor: "rgba(255, 0, 0, 1)"
      };

      let tagColors = Array.isArray(obj["tag-colors"]) ? [...obj["tag-colors"]] : [];

      let foundFirst = false;
      let foundRepeated = false;

      tagColors = tagColors.map(item => {
        if (!item || typeof item !== "object") return item;

        const next = { ...item };

        if (next.tagKey === prevFirstTag) {
          next.tagKey = newFirstTag;
          if (typeof next.color !== "string") next.color = yellowColor.color;
          if (typeof next.backgroundColor !== "string") next.backgroundColor = yellowColor.backgroundColor;
          foundFirst = true;
          return next;
        }

        if (next.tagKey === prevRepeatedTag) {
          next.tagKey = newRepeatedTag;
          if (typeof next.color !== "string") next.color = redColor.color;
          if (typeof next.backgroundColor !== "string") next.backgroundColor = redColor.backgroundColor;
          foundRepeated = true;
          return next;
        }

        return next;
      });

      if (!foundFirst) {
        const existingIndex = tagColors.findIndex(item => item && item.tagKey === newFirstTag);
        if (existingIndex >= 0) {
          tagColors[existingIndex] = {
            ...tagColors[existingIndex],
            tagKey: newFirstTag,
            color: yellowColor.color,
            backgroundColor: yellowColor.backgroundColor
          };
        } else {
          tagColors.push({
            tagKey: newFirstTag,
            color: yellowColor.color,
            backgroundColor: yellowColor.backgroundColor
          });
        }
      }

      if (!foundRepeated) {
        const existingIndex = tagColors.findIndex(item => item && item.tagKey === newRepeatedTag);
        if (existingIndex >= 0) {
          tagColors[existingIndex] = {
            ...tagColors[existingIndex],
            tagKey: newRepeatedTag,
            color: redColor.color,
            backgroundColor: redColor.backgroundColor
          };
        } else {
          tagColors.push({
            tagKey: newRepeatedTag,
            color: redColor.color,
            backgroundColor: redColor.backgroundColor
          });
        }
      }

      obj["tag-colors"] = tagColors;

      return `%% kanban:settings
\`\`\`
${JSON.stringify(obj)}
\`\`\`
%%`;
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    if (!Number.isInteger(this.settings.cycleStartDay)) {
      this.settings.cycleStartDay = 6;
    }

    this.settings.firstRollbackTag = normalizeTag(
      this.settings.firstRollbackTag,
      "#yellow"
    );

    this.settings.repeatedRollbackTag = normalizeTag(
      this.settings.repeatedRollbackTag,
      "#red"
    );
  }

  async saveSettings() {
    this.settings.firstRollbackTag = normalizeTag(
      this.settings.firstRollbackTag,
      "#yellow"
    );

    this.settings.repeatedRollbackTag = normalizeTag(
      this.settings.repeatedRollbackTag,
      "#red"
    );

    await this.saveData(this.settings);
  }

  getMarkdownFiles() {
    return this.app.vault.getMarkdownFiles().sort((a, b) => a.path.localeCompare(b.path));
  }

  getCurrentFile() {
    return this.app.workspace.getActiveFile();
  }

  isTriggerFile(file) {
    const triggerPath = (this.settings.triggerFile || "").trim();
    return !!file && !!triggerPath && file.path === triggerPath;
  }

  hideSidebarsForTriggerFile() {
    const ws = this.app.workspace;

    if (this.sidebarState.active) return;

    const leftOpen = ws.leftSplit?.collapsed === false;
    const rightOpen = ws.rightSplit?.collapsed === false;

    this.sidebarState.leftWasOpen = leftOpen;
    this.sidebarState.rightWasOpen = rightOpen;
    this.sidebarState.didAutoHideLeft = false;
    this.sidebarState.didAutoHideRight = false;

    if (this.settings.hideLeftSidebar && leftOpen) {
      ws.leftSplit.collapse();
      this.sidebarState.didAutoHideLeft = true;
    }

    if (this.settings.hideRightSidebar && rightOpen) {
      ws.rightSplit.collapse();
      this.sidebarState.didAutoHideRight = true;
    }

    this.sidebarState.active = true;
  }

  restoreSidebarsAfterTriggerFile() {
    const ws = this.app.workspace;

    if (!this.sidebarState.active) return;

    if (
      this.sidebarState.didAutoHideLeft &&
      this.sidebarState.leftWasOpen &&
      ws.leftSplit?.collapsed === true
    ) {
      ws.leftSplit.expand();
    }

    if (
      this.sidebarState.didAutoHideRight &&
      this.sidebarState.rightWasOpen &&
      ws.rightSplit?.collapsed === true
    ) {
      ws.rightSplit.expand();
    }

    this.sidebarState.active = false;
    this.sidebarState.leftWasOpen = false;
    this.sidebarState.rightWasOpen = false;
    this.sidebarState.didAutoHideLeft = false;
    this.sidebarState.didAutoHideRight = false;
  }
  hideBothSidebars() {
  const ws = this.app.workspace;

  if (ws.leftSplit?.collapsed === false) {
    ws.leftSplit.collapse();
  }

  if (ws.rightSplit?.collapsed === false) {
    ws.rightSplit.collapse();
  }
}

showBothSidebars() {
  const ws = this.app.workspace;

  if (ws.leftSplit?.collapsed === true) {
    ws.leftSplit.expand();
  }

  if (ws.rightSplit?.collapsed === true) {
    ws.rightSplit.expand();
  }
}

  handleActiveFileChange(file) {
    if (this.isTriggerFile(file)) {
      this.hideSidebarsForTriggerFile();
    } else {
      this.restoreSidebarsAfterTriggerFile();
    }
  }

  async activateTodayView() {
    let leaf = this.app.workspace.getLeavesOfType(TODAY_VIEW_TYPE)[0];

    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) return;

      await leaf.setViewState({
        type: TODAY_VIEW_TYPE,
        active: true
      });
    }

    this.app.workspace.revealLeaf(leaf);
  }

  async refreshTodayViews() {
    const leaves = this.app.workspace.getLeavesOfType(TODAY_VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view && typeof view.renderView === "function") {
        await view.renderView();
      }
    }
  }

  getCurrentCycleStart(now) {
    const today = now.clone().startOf("day");
    const weekday = today.day();
    const cycleStartDay = Number.isInteger(this.settings.cycleStartDay)
      ? this.settings.cycleStartDay
      : 6;

    const daysSinceCycleStart = (weekday - cycleStartDay + 7) % 7;
    return today.clone().subtract(daysSinceCycleStart, "days").startOf("day");
  }

  extractCycle(text) {
    const settingsMatch = text.match(/%%\s*kanban:settings\s*\n```(?:json)?\s*\n([\s\S]*?)\n```\s*\n%%/m);
    if (settingsMatch) {
      try {
        const obj = JSON.parse(settingsMatch[1]);
        if (typeof obj["kanban-auto-cycle"] === "string") {
          return obj["kanban-auto-cycle"];
        }
      } catch (e) {
        console.error("Failed to parse kanban settings JSON:", e);
      }
    }

    const m = text.match(/%%\s*kanban-auto-cycle:\s*(\d{4}-\d{2}-\d{2})\s*%%/);
    if (m) return m[1];

    const old = text.match(/%%\s*kanban-auto-last-run:\s*(\d{4}-\d{2}-\d{2})\s*%%/);
    if (old) return old[1];

    return "";
  }

  setCycle(text, cycleDateStr) {
    const settingsRegex = /%%\s*kanban:settings\s*\n```(?:json)?\s*\n([\s\S]*?)\n```\s*\n%%/m;

    if (settingsRegex.test(text)) {
      return text.replace(settingsRegex, (full, jsonText) => {
        let obj = {};
        try {
          obj = JSON.parse(jsonText);
        } catch (e) {
          console.error("Failed to parse kanban settings JSON:", e);
        }

        obj["kanban-auto-cycle"] = cycleDateStr;

        return `%% kanban:settings
\`\`\`
${JSON.stringify(obj)}
\`\`\`
%%`;
      });
    }

    const settingsBlock = `%% kanban:settings
\`\`\`
${JSON.stringify({
  "kanban-plugin": "board",
  "kanban-auto-cycle": cycleDateStr
})}
\`\`\`
%%`;

    return text.trimEnd() + "\n\n" + settingsBlock + "\n";
  }

  async processKanbanFile(file, forceRun = false) {
    const text = await this.app.vault.read(file);

    const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
    const isKanban =
      frontmatterMatch &&
      /(^|\n)kanban-plugin:\s*board\s*($|\n)/.test(frontmatterMatch[1]);

    if (!isKanban) {
      if (forceRun) new Notice("This file is not a Kanban board.");
      return false;
    }

    const now = moment();
    const currentCycle = this.getCurrentCycleStart(now).format("YYYY-MM-DD");
    const storedCycle = this.extractCycle(text) || "none";

    if (!forceRun && storedCycle === currentCycle) {
      return false;
    }

    const updated = this.rebuildKanban(
      text,
      now.clone().startOf("day"),
      Number(this.settings.daysAhead) || 14
    );

    const finalText = this.setCycle(updated, currentCycle);

    if (finalText !== text) {
      await this.app.vault.modify(file, finalText);
      return true;
    }

    return false;
  }

  rebuildKanban(text, today, daysAhead) {
    let workingText = text;

    let archiveTail = "";
    const archiveTailMatch = workingText.match(/\n\*\*\*\s*\n\s*\n## Archive[\s\S]*$/);
    if (archiveTailMatch) {
      archiveTail = archiveTailMatch[0].trimStart();
      workingText = workingText.slice(0, archiveTailMatch.index).trimEnd();
    }

    let settingsBlock = "";
    if (!archiveTail) {
      const settingsMatch = workingText.match(/%%\s*kanban:settings[\s\S]*?%%\s*$/m);
      if (settingsMatch) {
        settingsBlock = settingsMatch[0].trim();
        workingText = workingText.replace(settingsMatch[0], "").trimEnd();
      }
    }

    workingText = workingText
      .replace(/%%\s*kanban-auto-cycle:\s*\d{4}-\d{2}-\d{2}\s*%%\s*/g, "")
      .replace(/%%\s*kanban-auto-last-run:\s*\d{4}-\d{2}-\d{2}\s*%%\s*/g, "")
      .trimEnd();

    function formatHeader(date) {
      return `${date.format("dddd YYYY-MM-DD")}`;
    }

    function parseDateFromTitle(title) {
      const m = title.match(/(\d{4}-\d{2}-\d{2})$/);
      if (!m) return null;
      const d = moment(m[1], "YYYY-MM-DD", true);
      return d.isValid() ? d.startOf("day") : null;
    }

    function splitSections(raw) {
      const regex = /^##\s+(.+)$/gm;
      const matches = [...raw.matchAll(regex)];

      const sections = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
        const full = raw.slice(start, end).trimEnd();
        const title = matches[i][1].trim();
        sections.push({ title, full });
      }

      const preamble = matches.length ? raw.slice(0, matches[0].index).trimEnd() : raw.trimEnd();
      return { preamble, sections };
    }

    function bodyOfSection(sectionText) {
      const firstNewline = sectionText.indexOf("\n");
      if (firstNewline === -1) return "";
      return sectionText.slice(firstNewline + 1).trim();
    }

    function normalizeSection(title, body) {
      return body && body.trim()
        ? `## ${title}\n\n${body.trim()}`
        : `## ${title}`;
    }

    function splitInnerBlocks(body) {
      if (!body || !body.trim()) return [];
      const lines = body.split("\n");
      const blocks = [];
      let current = [];

      for (const line of lines) {
        if (/^-\s\[[ xX\/-]\]/.test(line)) {
          if (current.length) {
            blocks.push(current.join("\n").trim());
            current = [];
          }
        }
        current.push(line);
      }

      if (current.length) {
        blocks.push(current.join("\n").trim());
      }

      return blocks.filter(Boolean);
    }

    function isCompletedTaskLine(line) {
      return /^-\s\[x\]\s/i.test(line);
    }

    function distributeBlockLines(block) {
      const lines = block.split("\n");
      const doneLines = [];
      const otherLines = [];

      for (const line of lines) {
        if (isCompletedTaskLine(line)) {
          doneLines.push(line);
        } else {
          otherLines.push(line);
        }
      }

      return {
        doneBlock: doneLines.join("\n").trim(),
        otherBlock: otherLines.join("\n").trim()
      };
    }

    const { preamble, sections } = splitSections(workingText);

const unsortedIndex = sections.findIndex(s => s.title === "Unsorted");
const doneIndex = sections.findIndex(s => s.title === "done");

const managedStart = unsortedIndex >= 0 ? unsortedIndex : 0;
const managedEnd = doneIndex >= managedStart ? doneIndex : sections.length - 1;

const beforeUnsorted = sections.slice(0, managedStart);
const managedSections = sections.slice(managedStart, managedEnd + 1);
const afterDone = sections.slice(managedEnd + 1);

const doneSection = managedSections.find(s => s.title === "done");
const unsortedSectionOriginal = managedSections.find(s => s.title === "Unsorted");

const otherSections = managedSections.filter(
  s => s.title !== "done" && s.title !== "Unsorted" && s.title !== "Archive"
);

let completedBlocks = [];
let unsortedBlocksToAdd = [];
let kept = [];

for (const section of otherSections) {
  const d = parseDateFromTitle(section.title);
  const body = bodyOfSection(section.full);
  const blocks = splitInnerBlocks(body);

  if (d && d.isBefore(today)) {
    for (const block of blocks) {
      const parts = distributeBlockLines(block);
      if (parts.doneBlock) completedBlocks.push(parts.doneBlock);
      if (parts.otherBlock) {
        unsortedBlocksToAdd.push(
          updateRollbackTag(
            parts.otherBlock,
            this.settings.firstRollbackTag,
            this.settings.repeatedRollbackTag
          )
        );
      }
    }
    continue;
  }

  const keptBlocks = [];
  for (const block of blocks) {
    const parts = distributeBlockLines(block);
    if (parts.doneBlock) completedBlocks.push(parts.doneBlock);
    if (parts.otherBlock) keptBlocks.push(parts.otherBlock);
  }

  kept.push({
    title: section.title,
    full: normalizeSection(section.title, keptBlocks.join("\n\n"))
  });
}

let unsortedBody = unsortedSectionOriginal ? bodyOfSection(unsortedSectionOriginal.full) : "";
const unsortedBlocks = splitInnerBlocks(unsortedBody);
let remainingUnsortedBlocks = [];

for (const block of unsortedBlocks) {
  const parts = distributeBlockLines(block);
  if (parts.doneBlock) completedBlocks.push(parts.doneBlock);
  if (parts.otherBlock) remainingUnsortedBlocks.push(parts.otherBlock);
}

remainingUnsortedBlocks = [
  ...unsortedBlocksToAdd,
  ...remainingUnsortedBlocks
];

remainingUnsortedBlocks = sortUnsortedBlocks(
  remainingUnsortedBlocks,
  this.settings.firstRollbackTag,
  this.settings.repeatedRollbackTag
);

unsortedBody = remainingUnsortedBlocks.join("\n\n");

let doneBody = doneSection ? bodyOfSection(doneSection.full) : "";
if (completedBlocks.length) {
  doneBody = [doneBody, ...completedBlocks].filter(Boolean).join("\n\n");
}

const existingTitles = new Set(["Unsorted", "done", ...kept.map(s => s.title)]);
for (let i = 0; i < daysAhead; i++) {
  const d = today.clone().add(i, "days");
  const title = formatHeader(d);
  if (!existingTitles.has(title)) {
    kept.push({ title, full: `## ${title}` });
    existingTitles.add(title);
  }
}

const dated = [];
const nondated = [];

for (const s of kept) {
  const d = parseDateFromTitle(s.title);
  if (d) dated.push(s);
  else nondated.push(s);
}

dated.sort((a, b) => parseDateFromTitle(a.title).diff(parseDateFromTitle(b.title)));

    const managedRebuiltSections = [
  normalizeSection("Unsorted", unsortedBody),
  ...dated.map(s => s.full.trim()),
  normalizeSection("done", doneBody),
  ...nondated.map(s => s.full.trim())
];

const rebuiltSections = [
  ...beforeUnsorted.map(s => s.full.trim()),
  ...managedRebuiltSections,
  ...afterDone.map(s => s.full.trim())
];

let rebuilt = [
  preamble,
  rebuiltSections.join("\n\n\n")
].filter(Boolean).join("\n\n\n");

    if (archiveTail) {
      rebuilt += "\n\n" + archiveTail;
    } else if (settingsBlock) {
      rebuilt += "\n\n" + settingsBlock;
    }

    rebuilt += "\n";
    return rebuilt;
  }
};

class FileOpenScriptTriggerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display() {
    const { containerEl } = this;
    containerEl.empty();

    const hasTriggerFile = !!String(this.plugin.settings.triggerFile || "").trim();

    new Setting(containerEl)
      .setName("Enable plugin")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enabled)
          .onChange(async value => {
            this.plugin.settings.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Days ahead")
      .setDesc("How many daily columns should exist starting from today.")
      .addText(text =>
        text
          .setPlaceholder("14")
          .setValue(String(this.plugin.settings.daysAhead))
          .onChange(async value => {
            const num = parseInt(value || "14", 10);
            this.plugin.settings.daysAhead = Number.isFinite(num) ? num : 14;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Update weekday")
      .setDesc("First day of the weekly cycle used for kanban auto-update.")
      .addDropdown(dropdown => {
        for (const option of WEEKDAY_OPTIONS) {
          dropdown.addOption(String(option.value), option.label);
        }

        dropdown
          .setValue(String(this.plugin.settings.cycleStartDay))
          .onChange(async value => {
            this.plugin.settings.cycleStartDay = parseInt(value, 10);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Hide left sidebar")
      .setDesc("Hide left sidebar when opening trigger file.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.hideLeftSidebar)
          .onChange(async value => {
            this.plugin.settings.hideLeftSidebar = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Hide right sidebar")
      .setDesc("Hide right sidebar when opening trigger file.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.hideRightSidebar)
          .onChange(async value => {
            this.plugin.settings.hideRightSidebar = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("First rollback tag")
      .setDesc(
        hasTriggerFile
          ? "Tag added when a task is moved back for the first time."
          : "Select Trigger file first."
      )
      .addText(text => {
        text
          .setPlaceholder("#yellow")
          .setValue(String(this.plugin.settings.firstRollbackTag || "#yellow"));

        text.inputEl.disabled = !hasTriggerFile;

        text.onChange(async value => {
          if (!String(this.plugin.settings.triggerFile || "").trim()) return;

          const oldFirstTag = this.plugin.settings.firstRollbackTag;
          const oldRepeatedTag = this.plugin.settings.repeatedRollbackTag;

          this.plugin.settings.firstRollbackTag = normalizeTag(value, "#yellow");
          await this.plugin.saveSettings();

          try {
            await this.plugin.updateKanbanSettingsTagsInTriggerFile(
              oldFirstTag,
              oldRepeatedTag
            );
          } catch (e) {
            console.error("Failed to update kanban settings tags:", e);
          }
        });
      });

    new Setting(containerEl)
      .setName("Repeated rollback tag")
      .setDesc(
        hasTriggerFile
          ? "Tag used when a task is moved back again."
          : "Select Trigger file first."
      )
      .addText(text => {
        text
          .setPlaceholder("#red")
          .setValue(String(this.plugin.settings.repeatedRollbackTag || "#red"));

        text.inputEl.disabled = !hasTriggerFile;

        text.onChange(async value => {
          if (!String(this.plugin.settings.triggerFile || "").trim()) return;

          const oldFirstTag = this.plugin.settings.firstRollbackTag;
          const oldRepeatedTag = this.plugin.settings.repeatedRollbackTag;

          this.plugin.settings.repeatedRollbackTag = normalizeTag(value, "#red");
          await this.plugin.saveSettings();

          try {
            await this.plugin.updateKanbanSettingsTagsInTriggerFile(
              oldFirstTag,
              oldRepeatedTag
            );
          } catch (e) {
            console.error("Failed to update kanban settings tags:", e);
          }
        });
      });

        new Setting(containerEl)
      .setName("Show journal buttons")
      .setDesc("Show Open NMR Journal and Open Mass Journal buttons in Today's Kanban view.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.showJournalButtons)
          .onChange(async value => {
            this.plugin.settings.showJournalButtons = value;
            await this.plugin.saveSettings();
            await this.plugin.refreshTodayViews();
            await this.display();
          })
      );

    new Setting(containerEl)
      .setName("NMR Journal file")
      .setDesc("File opened by the Open NMR Journal button.")
      .addText(text =>
        text
          .setPlaceholder("Stat/NMR Journal.md")
          .setValue(this.plugin.settings.nmrJournalPath || "")
          .onChange(async value => {
            this.plugin.settings.nmrJournalPath = value.trim();
            await this.plugin.saveSettings();
            await this.plugin.refreshTodayViews();
          })
      )
      .addButton(button =>
        button
          .setButtonText("Browse")
          .onClick(() => {
            new VaultFileSuggestModal(
              this.app,
              this.plugin.getMarkdownFiles(),
              async file => {
                this.plugin.settings.nmrJournalPath = file.path;
                await this.plugin.saveSettings();
                await this.plugin.refreshTodayViews();
                await this.display();
              }
            ).open();
          })
      );

    new Setting(containerEl)
      .setName("Mass Journal file")
      .setDesc("File opened by the Open Mass Journal button.")
      .addText(text =>
        text
          .setPlaceholder("Stat/Mass Journal.md")
          .setValue(this.plugin.settings.massJournalPath || "")
          .onChange(async value => {
            this.plugin.settings.massJournalPath = value.trim();
            await this.plugin.saveSettings();
            await this.plugin.refreshTodayViews();
          })
      )
      .addButton(button =>
        button
          .setButtonText("Browse")
          .onClick(() => {
            new VaultFileSuggestModal(
              this.app,
              this.plugin.getMarkdownFiles(),
              async file => {
                this.plugin.settings.massJournalPath = file.path;
                await this.plugin.saveSettings();
                await this.plugin.refreshTodayViews();
                await this.display();
              }
            ).open();
          })
      );

    const triggerSetting = new Setting(containerEl)
      .setName("Trigger file")
      .setDesc("Run on first open after the selected weekday, and also allow manual command.");

    let triggerText;
    triggerSetting
      .addText(text =>
        triggerText = text
          .setPlaceholder("Stat/Untitled Kanban.md")
          .setValue(this.plugin.settings.triggerFile)
          .onChange(async value => {
            this.plugin.settings.triggerFile = value.trim();
            await this.plugin.saveSettings();
            await this.display();
          })
      )
      .addButton(button =>
        button
          .setButtonText("Browse")
          .onClick(() => {
            new VaultFileSuggestModal(
              this.app,
              this.plugin.getMarkdownFiles(),
              async file => {
                this.plugin.settings.triggerFile = file.path;
                await this.plugin.saveSettings();
                triggerText.setValue(file.path);
                await this.display();
              }
            ).open();
          })
      )
      .addButton(button =>
        button
          .setButtonText("Use current")
          .onClick(async () => {
            const file = this.plugin.getCurrentFile();
            if (!file) {
              new Notice("No active file.");
              return;
            }
            this.plugin.settings.triggerFile = file.path;
            await this.plugin.saveSettings();
            triggerText.setValue(file.path);
            await this.display();
          })
      );
  }
}