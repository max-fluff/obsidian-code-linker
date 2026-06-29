"use strict";
// Code Linker — autocomplete references to source-code files and types.
//
// Type the trigger (default "@@") followed by a class/file name; pick a match
// to insert a markdown link whose URL opens the file at its line in your editor.
//
// The plugin scans the configured folders itself (Node fs, desktop only) and
// keeps the index in memory — no external build step or index file.

const { Plugin, EditorSuggest, PluginSettingTab, Setting, Notice } = require("obsidian");
const fs = require("fs");
const fsp = fs.promises;
const nodePath = require("path");

const PRESETS = {
  vscode: "vscode://file/{abs}:{line}",
  rider: "jetbrains://rider/navigate/reference?project={project}&path={path}:{line}",
  file: "file:///{abs}",
};

const DEFAULTS = {
  trigger: "@@",
  uriTemplate: PRESETS.vscode,
  codeRoot: "", // empty => parent folder of the vault
  scanRoots: "", // one path per line, relative to codeRoot
  extensions: ".cs",
  skipDirs: "obj, bin, .git, Library, Temp, node_modules",
  minChars: 1,
  maxResults: 12,
};

// public sealed partial class Foo / [Attr] internal struct Bar / enum E ...
const TYPE_RE =
  /^\s*(?:\[[^\]]*\]\s*)*(?:(?:public|internal|private|protected|static|sealed|abstract|partial|readonly|unsafe|new|ref)\s+)*(class|struct|interface|enum|record)\s+([A-Za-z_][A-Za-z0-9_]*)/;

const splitLines = (s) =>
  (s || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const splitList = (s) =>
  (s || "")
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

class CodeIndexSuggest extends EditorSuggest {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onTrigger(cursor, editor) {
    const s = this.plugin.settings;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const i = before.lastIndexOf(s.trigger);
    if (i === -1) return null;
    const query = before.slice(i + s.trigger.length);
    // Stop once the typed text is no longer an identifier (space, etc.).
    if (!/^[\w.]*$/.test(query)) return null;
    if (query.length < Math.max(0, s.minChars)) return null;
    return { start: { line: cursor.line, ch: i }, end: cursor, query };
  }

  getSuggestions(ctx) {
    const idx = this.plugin.index;
    if (!idx || !idx.length) return [];
    const q = ctx.query.toLowerCase();
    const max = this.plugin.settings.maxResults;
    const starts = [];
    const contains = [];
    for (const e of idx) {
      const n = e.name.toLowerCase();
      if (n.startsWith(q)) {
        starts.push(e);
        if (starts.length >= max) break;
      } else if (q && n.includes(q) && contains.length < max) {
        contains.push(e);
      }
    }
    return starts.concat(contains).slice(0, max);
  }

  renderSuggestion(e, el) {
    el.addClass("code-linker-suggestion");
    el.createSpan({ cls: "code-linker-name", text: e.name });
    el.createSpan({ cls: "code-linker-kind", text: e.kind });
    el.createSpan({ cls: "code-linker-path", text: e.path });
  }

  selectSuggestion(e) {
    const ctx = this.context;
    if (!ctx) return;
    const link = this.plugin.buildLink(e);
    ctx.editor.replaceRange(link, ctx.start, ctx.end);
    const pos = ctx.editor.posToOffset(ctx.start) + link.length;
    ctx.editor.setCursor(ctx.editor.offsetToPos(pos));
  }
}

class CodeLinkerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  detectPreset() {
    const tpl = this.plugin.settings.uriTemplate;
    for (const k of Object.keys(PRESETS)) if (PRESETS[k] === tpl) return k;
    return "custom";
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const save = () => this.plugin.saveSettings();
    const wide = (t) => {
      t.inputEl.style.width = "100%";
      return t;
    };

    containerEl.createEl("h3", { text: "Code index" });

    new Setting(containerEl)
      .setName("Code root")
      .setDesc("Base folder the scan paths are relative to. Empty = the folder containing this vault.")
      .addText((t) =>
        wide(t)
          .setPlaceholder(this.plugin.codeRoot())
          .setValue(s.codeRoot)
          .onChange(async (v) => {
            s.codeRoot = v.trim();
            await save();
          })
      );

    new Setting(containerEl)
      .setName("Scan folders")
      .setDesc("One path per line, relative to the code root. These folders are scanned for source files.")
      .addTextArea((t) => {
        t.inputEl.rows = 4;
        t.inputEl.style.width = "100%";
        t.setValue(s.scanRoots).onChange(async (v) => {
          s.scanRoots = v;
          await save();
        });
      });

    new Setting(containerEl)
      .setName("Extensions")
      .setDesc("File extensions to index, e.g. .cs .ts")
      .addText((t) =>
        t.setValue(s.extensions).onChange(async (v) => {
          s.extensions = v;
          await save();
        })
      );

    new Setting(containerEl)
      .setName("Skip folders")
      .setDesc("Folder names never descended into.")
      .addText((t) =>
        wide(t)
          .setValue(s.skipDirs)
          .onChange(async (v) => {
            s.skipDirs = v;
            await save();
          })
      );

    new Setting(containerEl)
      .setName("Rebuild index now")
      .addButton((b) => b.setButtonText("Rebuild").onClick(() => this.plugin.rebuildIndex(true)));

    containerEl.createEl("h3", { text: "Suggestions & links" });

    new Setting(containerEl)
      .setName("Trigger")
      .setDesc("Type this to start a code suggestion.")
      .addText((t) =>
        t.setValue(s.trigger).onChange(async (v) => {
          s.trigger = v || "@@";
          await save();
        })
      );

    const detected = this.detectPreset();
    if (this.customMode === undefined) this.customMode = detected === "custom";

    new Setting(containerEl)
      .setName("Editor link preset")
      .setDesc("Which editor the inserted links open in.")
      .addDropdown((d) =>
        d
          .addOption("vscode", "VS Code")
          .addOption("rider", "Rider / JetBrains")
          .addOption("file", "file:// (open in default)")
          .addOption("custom", "Custom")
          .setValue(this.customMode ? "custom" : detected)
          .onChange(async (v) => {
            this.customMode = v === "custom";
            if (!this.customMode && PRESETS[v]) s.uriTemplate = PRESETS[v];
            await save();
            this.display();
          })
      );

    if (this.customMode) {
      new Setting(containerEl)
        .setName("URI template")
        .setDesc("Placeholders: {abs} {path} {line} {name} {project}")
        .addText((t) =>
          wide(t)
            .setValue(s.uriTemplate)
            .onChange(async (v) => {
              s.uriTemplate = v;
              await save();
            })
        );
    }

    new Setting(containerEl).setName("Min characters").addText((t) => {
      t.inputEl.type = "number";
      t.setValue(String(s.minChars)).onChange(async (v) => {
        const n = parseInt(v, 10);
        s.minChars = Number.isFinite(n) ? n : 1;
        await save();
      });
    });

    new Setting(containerEl).setName("Max results").addText((t) => {
      t.inputEl.type = "number";
      t.setValue(String(s.maxResults)).onChange(async (v) => {
        const n = parseInt(v, 10);
        s.maxResults = Number.isFinite(n) && n > 0 ? n : 12;
        await save();
      });
    });

    const info = containerEl.createEl("div", { cls: "setting-item-description" });
    info.setText(`Code root: ${this.plugin.codeRoot() || "(unknown)"} · ${this.plugin.index.length} entries indexed`);
  }
}

module.exports = class CodeLinkerPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.index = [];

    this.registerEditorSuggest(new CodeIndexSuggest(this.app, this));
    this.addSettingTab(new CodeLinkerSettingTab(this.app, this));
    this.addCommand({
      id: "rebuild-code-index",
      name: "Rebuild code index",
      callback: () => this.rebuildIndex(true),
    });

    // Build in the background once the workspace is ready, so startup is not blocked.
    this.app.workspace.onLayoutReady(() => this.rebuildIndex(false));
  }

  // Absolute base folder the scan paths are resolved against.
  codeRoot() {
    if (this.settings.codeRoot) return this.settings.codeRoot;
    const adapter = this.app.vault.adapter;
    const base = adapter && typeof adapter.getBasePath === "function" ? adapter.getBasePath() : "";
    return base ? nodePath.dirname(base) : "";
  }

  async rebuildIndex(notify) {
    const root = this.codeRoot();
    if (!root) {
      if (notify) new Notice("Code Linker: could not determine code root");
      return;
    }
    const roots = splitLines(this.settings.scanRoots);
    if (!roots.length) {
      this.index = [];
      if (notify) new Notice("Code Linker: no scan folders configured (see settings)");
      return;
    }
    const exts = splitList(this.settings.extensions).map((e) => (e.startsWith(".") ? e : "." + e));
    const skip = new Set(splitList(this.settings.skipDirs));
    const out = [];
    try {
      for (const r of roots) {
        await this.walk(nodePath.join(root, r), root, exts, skip, out);
      }
    } catch (err) {
      if (notify) new Notice(`Code Linker: scan failed — ${err && err.message}`);
      return;
    }
    out.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
    this.index = out;
    if (notify) new Notice(`Code Linker: ${out.length} entries indexed`);
  }

  async walk(absDir, root, exts, skip, out) {
    let items;
    try {
      items = await fsp.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const it of items) {
      const abs = nodePath.join(absDir, it.name);
      if (it.isDirectory()) {
        if (!skip.has(it.name)) await this.walk(abs, root, exts, skip, out);
      } else if (it.isFile() && exts.some((e) => it.name.endsWith(e))) {
        await this.indexFile(abs, root, out);
      }
    }
  }

  async indexFile(abs, root, out) {
    let text;
    try {
      text = await fsp.readFile(abs, "utf8");
    } catch {
      return;
    }
    const rel = nodePath.relative(root, abs).split(nodePath.sep).join("/");
    const base = nodePath.basename(abs).replace(/\.[^.]+$/, "");
    out.push({ name: base, kind: "file", path: rel, line: 1 });
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const m = TYPE_RE.exec(lines[i]);
      if (m) out.push({ name: m[2], kind: m[1], path: rel, line: i + 1 });
    }
  }

  buildLink(e) {
    const root = this.codeRoot();
    const absFs = root ? nodePath.join(root, e.path) : e.path;
    const absFwd = absFs.split(nodePath.sep).join("/");
    const line = String(e.line || 1);
    // First path segment is a reasonable default for IDE "project" placeholders.
    const project = (e.path.split("/")[0] || "").trim();
    const uri = this.settings.uriTemplate
      .replace(/{abs}/g, encodeURI(absFwd))
      .replace(/{path}/g, e.path)
      .replace(/{line}/g, line)
      .replace(/{name}/g, e.name)
      .replace(/{project}/g, project);
    return `[${e.name}](${uri})`;
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};
