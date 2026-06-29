"use strict";
// Code Linker — autocomplete references to source-code files and types.
//
// Type the trigger (default "@@") followed by a class/file name; pick a match
// to insert a markdown link whose URL opens the file at its line in your editor.
//
// The plugin scans the configured folders itself (Node fs, desktop only) and
// keeps the index in memory — no external build step or index file.

const { Plugin, Notice } = require("obsidian");
const fs = require("fs");
const fsp = fs.promises;
const nodePath = require("path");

const { DEFAULTS, splitLines, splitList } = require("./constants");
const { BUILTIN_LANGUAGES, LANGUAGES_TEMPLATE } = require("./builtin-languages");
const { CodeIndexSuggest } = require("./suggest");
const { CodeLinkerSettingTab } = require("./settings-tab");

module.exports = class CodeLinkerPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.index = [];
    this.languages = [];
    this.languageErrors = [];
    this.customRaw = "";
    await this.loadLanguagesFile();

    this.registerEditorSuggest(new CodeIndexSuggest(this.app, this));
    this.addSettingTab(new CodeLinkerSettingTab(this.app, this));
    this.addCommand({
      id: "rebuild-code-index",
      name: "Rebuild code index",
      callback: () => this.rebuildIndex(true),
    });

    // Recompile + rebuild when the languages file is edited.
    this.registerEvent(
      this.app.vault.on("modify", async (f) => {
        if (f && f.path === this.settings.languagesFile) {
          await this.loadLanguagesFile();
          this.rebuildIndex(false);
        }
      })
    );

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

  async loadLanguagesFile() {
    const path = (this.settings.languagesFile || "").trim();
    this.customRaw = "";
    if (path) {
      try {
        if (await this.app.vault.adapter.exists(path)) {
          this.customRaw = await this.app.vault.adapter.read(path);
        }
      } catch {
        /* leave customRaw empty */
      }
    }
    this.compileLanguages();
  }

  async createLanguagesTemplate() {
    const path = (this.settings.languagesFile || "").trim();
    if (!path) {
      new Notice("Code Linker: set a languages file path first");
      return;
    }
    if (await this.app.vault.adapter.exists(path)) {
      new Notice(`Code Linker: ${path} already exists`);
      return;
    }
    await this.app.vault.adapter.write(path, LANGUAGES_TEMPLATE);
    new Notice(`Code Linker: template created at ${path}`);
    await this.loadLanguagesFile();
  }

  // Merge built-ins with the languages file, compile every regex.
  compileLanguages() {
    const merged = new Map();
    for (const l of BUILTIN_LANGUAGES) merged.set(l.id, l);
    this.languageErrors = [];

    const raw = (this.customRaw || "").trim();
    if (raw) {
      let arr = null;
      try {
        arr = JSON.parse(raw);
      } catch (e) {
        this.languageErrors.push({ id: "(languages file)", error: "invalid JSON: " + e.message });
      }
      if (Array.isArray(arr)) {
        for (const def of arr) {
          if (!def || typeof def.id !== "string") {
            this.languageErrors.push({ id: (def && def.id) || "(unknown)", error: "missing string id" });
            continue;
          }
          merged.set(def.id, def);
        }
      } else if (arr != null) {
        this.languageErrors.push({ id: "(languages file)", error: "expected a JSON array" });
      }
    }

    const out = [];
    for (const def of merged.values()) {
      const extensions = Array.isArray(def.extensions) ? def.extensions.map((e) => String(e).toLowerCase()) : [];
      const patterns = [];
      for (const p of def.patterns || []) {
        try {
          patterns.push({
            regex: new RegExp(p.re, p.flags || ""),
            kind: p.kind,
            kindGroup: p.kindGroup,
            nameGroup: p.nameGroup,
          });
        } catch (e) {
          this.languageErrors.push({ id: def.id, error: `bad regex: ${e.message}` });
        }
      }
      out.push({ id: def.id, name: def.name || def.id, extensions, patterns });
    }
    this.languages = out;
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

    // extension -> [enabled languages that claim it]
    const enabled = new Set(this.settings.enabledLanguages || []);
    const byExt = new Map();
    for (const lang of this.languages) {
      if (!enabled.has(lang.id)) continue;
      for (const ext of lang.extensions) {
        if (!byExt.has(ext)) byExt.set(ext, []);
        byExt.get(ext).push(lang);
      }
    }
    if (!byExt.size) {
      this.index = [];
      if (notify) new Notice("Code Linker: no languages enabled");
      return;
    }

    const skip = new Set(splitList(this.settings.skipDirs));
    const out = [];
    try {
      for (const r of roots) {
        await this.walk(nodePath.join(root, r), root, byExt, skip, out);
      }
    } catch (err) {
      if (notify) new Notice(`Code Linker: scan failed — ${err && err.message}`);
      return;
    }
    out.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
    this.index = out;
    if (notify) new Notice(`Code Linker: ${out.length} entries indexed`);
  }

  async walk(absDir, root, byExt, skip, out) {
    let items;
    try {
      items = await fsp.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const it of items) {
      const abs = nodePath.join(absDir, it.name);
      if (it.isDirectory()) {
        if (!skip.has(it.name)) await this.walk(abs, root, byExt, skip, out);
      } else if (it.isFile()) {
        const langs = byExt.get(nodePath.extname(it.name).toLowerCase());
        if (langs) await this.indexFile(abs, root, langs, out);
      }
    }
  }

  async indexFile(abs, root, langs, out) {
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
      const line = lines[i];
      for (const lang of langs) {
        for (const p of lang.patterns) {
          p.regex.lastIndex = 0;
          const m = p.regex.exec(line);
          if (!m) continue;
          let name, kind;
          if (p.kindGroup != null) {
            kind = m[p.kindGroup];
            name = m[p.nameGroup != null ? p.nameGroup : 2];
          } else {
            kind = p.kind || "type";
            name = m[p.nameGroup != null ? p.nameGroup : 1];
          }
          if (name) out.push({ name, kind, path: rel, line: i + 1 });
        }
      }
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
