'use strict';

var obsidian = require('obsidian');
var state = require('@codemirror/state');
var view = require('@codemirror/view');

/**
 * Utility functions for task hiding logic
 * Separated for testability
 */
/**
 * Regex to match completed task lines
 */
const COMPLETED_TASK_REGEX = /^(\s*[-*+])\s+\[(x|X)\]/;
/**
 * Get indentation level from line text (count leading spaces/tabs)
 */
function getIndentLevelFromText(text) {
    const match = text.match(/^(\s*)/);
    if (!match)
        return 0;
    const whitespace = match[1];
    // Count tabs as 4 spaces
    return whitespace.replace(/\t/g, "    ").length;
}
/**
 * CSS class applied to editor lines that this plugin hides.
 *
 * Hidden lines are marked explicitly instead of being inferred from the DOM,
 * so styling can never collapse a line the plugin did not choose to hide.
 */
const HIDDEN_LINE_CLASS = "ctd-hidden-line";
/**
 * Determine which lines of a document should be hidden.
 *
 * @param lines Document lines, in order, without line separators
 * @param hideSubBullets Whether indented content beneath a completed task is hidden too
 * @returns Zero-based indices of the lines to hide
 */
function computeHiddenLines(lines, hideSubBullets) {
    const hidden = new Set();
    for (let i = 0; i < lines.length; i++) {
        if (!COMPLETED_TASK_REGEX.test(lines[i])) {
            continue;
        }
        hidden.add(i);
        if (!hideSubBullets) {
            continue;
        }
        const taskIndent = getIndentLevelFromText(lines[i]);
        // Walk forward while lines stay nested beneath the completed task
        for (let j = i + 1; j < lines.length; j++) {
            const subLineText = lines[j];
            // Empty line breaks the nesting - content after is independent
            if (subLineText.trim() === "") {
                break;
            }
            // Equal or lower indentation ends the nested block
            if (getIndentLevelFromText(subLineText) <= taskIndent) {
                break;
            }
            hidden.add(j);
        }
    }
    return hidden;
}

const DEFAULT_SETTINGS = {
    hiddenState: true,
    showStatusBar: true,
    hideSubBullets: false,
};
// Facet for providing settings to the CodeMirror extension
const taskHiderSettingsFacet = state.Facet.define({
    combine: (values) => values[0] || DEFAULT_SETTINGS,
});
/**
 * StateField that tracks which lines should be hidden
 * This uses replace decorations to properly remove content from the editor layout
 */
const hideTasksField = state.StateField.define({
    create(state) {
        return buildLineDecorations(state);
    },
    update(oldDecorations, tr) {
        // Rebuild decorations if document changed or facet reconfigured
        if (tr.docChanged || tr.reconfigured) {
            return buildLineDecorations(tr.state);
        }
        // Otherwise, map the existing decorations to account for changes
        return oldDecorations.map(tr.changes);
    },
    provide: (field) => view.EditorView.decorations.from(field),
});
// Marks a line as hidden so styles.css can collapse exactly these lines
const hiddenLineDecoration = view.Decoration.line({ class: HIDDEN_LINE_CLASS });
const hiddenTextDecoration = view.Decoration.replace({});
/**
 * Build the decorations that hide completed tasks.
 *
 * Every hidden line gets two decorations:
 * - a line decoration carrying `HIDDEN_LINE_CLASS`, so styles.css can collapse
 *   exactly the lines this plugin selected (and nothing else)
 * - a replace decoration over the line's text, so the content is removed from
 *   the editor layout and keeps the gutter aligned
 */
function buildLineDecorations(state$1) {
    const settings = state$1.facet(taskHiderSettingsFacet);
    if (!settings.hiddenState) {
        return view.Decoration.none;
    }
    const doc = state$1.doc;
    const lines = [];
    for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
        lines.push(doc.line(lineNum).text);
    }
    const hiddenLines = computeHiddenLines(lines, settings.hideSubBullets);
    const builder = new state.RangeSetBuilder();
    for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
        if (!hiddenLines.has(lineNum - 1)) {
            continue;
        }
        const line = doc.line(lineNum);
        // Line decoration first: at an identical position it sorts before the
        // replace decoration, which RangeSetBuilder requires.
        builder.add(line.from, line.from, hiddenLineDecoration);
        // A zero-length line has nothing to replace
        if (line.to > line.from) {
            builder.add(line.from, line.to, hiddenTextDecoration);
        }
    }
    return builder.finish();
}

class TaskHiderPlugin extends obsidian.Plugin {
    constructor(app, manifest) {
        super(app, manifest);
        this.statusBar = null;
        this.settingsCompartment = new state.Compartment();
        // Status bar will be created in onload to ensure proper initialization on mobile
    }
    async toggleCompletedTaskView() {
        this.settings.hiddenState = !this.settings.hiddenState;
        // Toggle body class for preview mode CSS
        document.body.toggleClass("hide-completed-tasks", this.settings.hiddenState);
        if (this.statusBar && this.settings.showStatusBar) {
            this.statusBar.setText(this.settings.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks");
        }
        // Update all editor instances with new settings
        this.updateEditorExtensions();
        await this.saveSettings();
    }
    /**
     * Update body classes to reflect current settings
     */
    updateBodyClasses() {
        document.body.toggleClass("hide-completed-tasks", this.settings.hiddenState);
        document.body.toggleClass("hide-sub-bullets", this.settings.hideSubBullets);
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    /**
     * Create the CodeMirror extension with current settings
     */
    createEditorExtension() {
        return [
            this.settingsCompartment.of(taskHiderSettingsFacet.of(this.settings)),
            hideTasksField,
        ];
    }
    /**
     * Update all editor instances to use the new settings
     */
    updateEditorExtensions() {
        // Get all markdown views and dispatch compartment reconfigure
        this.app.workspace.iterateAllLeaves((leaf) => {
            if (leaf.view.getViewType() === "markdown") {
                const view = leaf.view.editor;
                if (view && view.cm) {
                    const cm = view.cm;
                    // Use compartment reconfiguration to update settings
                    // This properly updates the facet value without removing Obsidian's extensions
                    cm.dispatch({
                        effects: this.settingsCompartment.reconfigure(taskHiderSettingsFacet.of(this.settings)),
                    });
                }
            }
        });
    }
    async onload() {
        try {
            // Load settings first
            await this.loadSettings();
            // Create status bar item if enabled
            if (this.settings.showStatusBar) {
                this.statusBar = this.addStatusBarItem();
            }
            // Register command (available immediately)
            this.addCommand({
                id: "toggle-completed-task-view",
                name: "Toggle Completed Task View",
                callback: () => {
                    this.toggleCompletedTaskView();
                },
            });
            // Add settings tab
            this.addSettingTab(new TaskHiderSettingTab(this.app, this));
            // Register CodeMirror extension for hiding tasks
            this.registerEditorExtension(this.createEditorExtension());
            // Wait for workspace to be ready before manipulating DOM and UI
            // This is especially important on mobile platforms like iOS
            this.app.workspace.onLayoutReady(() => {
                try {
                    // Set initial body classes for preview mode
                    this.updateBodyClasses();
                    // Update status bar if enabled
                    if (this.statusBar && this.settings.showStatusBar) {
                        this.statusBar.setText(this.settings.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks");
                    }
                    // Register icon and ribbon button
                    obsidian.addIcon("tasks", taskShowIcon);
                    this.addRibbonIcon("tasks", "Task Hider", () => {
                        this.toggleCompletedTaskView();
                    });
                }
                catch (error) {
                    console.error("Failed to initialize Completed Task Display UI:", error);
                }
            });
        }
        catch (error) {
            console.error("Failed to load Completed Task Display plugin:", error);
            // Ensure default settings even if loading fails
            this.settings = DEFAULT_SETTINGS;
        }
    }
    onunload() {
        // CodeMirror extensions are automatically cleaned up by Obsidian
    }
}
class TaskHiderSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Completed Task Display Settings" });
        new obsidian.Setting(containerEl)
            .setName("Show status bar message")
            .setDesc("Display 'Hiding/Showing Completed Tasks' in the status bar")
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.showStatusBar)
            .onChange(async (value) => {
            this.plugin.settings.showStatusBar = value;
            await this.plugin.saveSettings();
            // Update status bar visibility
            if (value && !this.plugin.statusBar) {
                this.plugin.statusBar = this.plugin.addStatusBarItem();
                this.plugin.statusBar.setText(this.plugin.settings.hiddenState
                    ? "Hiding Completed Tasks"
                    : "Showing Completed Tasks");
            }
            else if (!value && this.plugin.statusBar) {
                this.plugin.statusBar.remove();
                this.plugin.statusBar = null;
            }
        }));
        new obsidian.Setting(containerEl)
            .setName("Hide sub-bullets")
            .setDesc("In Edit/Live Preview mode: hide sub-bullets (indented items) beneath completed tasks. Note: In Reading view, sub-bullets are automatically hidden with their parent task.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.hideSubBullets).onChange(async (value) => {
            this.plugin.settings.hideSubBullets = value;
            await this.plugin.saveSettings();
            // Update body classes for CSS
            this.plugin.updateBodyClasses();
            // Update all editor extensions with new settings
            this.plugin.updateEditorExtensions();
        }));
    }
}
const taskShowIcon = `<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="tasks" class="svg-inline--fa fa-tasks fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M145.35 207a8 8 0 0 0-11.35 0l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 250.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM62.93 384c-17.67 0-32.4 14.33-32.4 32s14.73 32 32.4 32a32 32 0 0 0 0-64zm82.42-337A8 8 0 0 0 134 47l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 90.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM503 400H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8zm0-320H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8V88a8 8 0 0 0-8-8zm0 160H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8z"></path></svg>`;

module.exports = TaskHiderPlugin;


/* nosourcemap */