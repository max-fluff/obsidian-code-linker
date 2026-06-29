/* Code Linker — bundled from src/ by esbuild. Do not edit directly; edit src/ and run "npm run build". */
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/constants.js
var require_constants = __commonJS({
  "src/constants.js"(exports2, module2) {
    "use strict";
    var PRESETS = {
      vscode: "vscode://file/{abs}:{line}",
      rider: "jetbrains://rider/navigate/reference?project={project}&path={path}:{line}",
      file: "file:///{abs}"
    };
    var DEFAULTS2 = {
      trigger: "@@",
      uriTemplate: PRESETS.vscode,
      codeRoot: "",
      // empty => parent folder of the vault
      scanRoots: "",
      // one path per line, relative to codeRoot
      skipDirs: "obj, bin, .git, Library, Temp, node_modules",
      enabledLanguages: ["csharp"],
      languagesFile: "code-languages.json",
      // vault-relative JSON of extra/override languages
      disabledKinds: [],
      // entity kinds hidden from suggestions (query-time filter)
      minChars: 1,
      maxResults: 12
    };
    var splitLines2 = (s) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);
    var splitList2 = (s) => (s || "").split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
    module2.exports = { PRESETS, DEFAULTS: DEFAULTS2, splitLines: splitLines2, splitList: splitList2 };
  }
});

// languages/csharp.json
var require_csharp = __commonJS({
  "languages/csharp.json"(exports2, module2) {
    module2.exports = {
      id: "csharp",
      name: "C#",
      extensions: [".cs"],
      patterns: [
        {
          re: "^\\s*(?:\\[[^\\]]*\\]\\s*)*(?:(?:public|internal|private|protected|static|sealed|abstract|partial|readonly|unsafe|new|ref)\\s+)*(class|struct|interface|enum|record)\\s+([A-Za-z_][A-Za-z0-9_]*)",
          kindGroup: 1,
          nameGroup: 2
        }
      ]
    };
  }
});

// languages/typescript.json
var require_typescript = __commonJS({
  "languages/typescript.json"(exports2, module2) {
    module2.exports = {
      id: "typescript",
      name: "TypeScript",
      extensions: [".ts", ".tsx"],
      patterns: [
        {
          re: "^\\s*(?:export\\s+)?(?:default\\s+)?(?:abstract\\s+)?(class|interface|enum|type)\\s+([A-Za-z_$][\\w$]*)",
          kindGroup: 1,
          nameGroup: 2
        },
        {
          re: "^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)",
          kind: "function",
          nameGroup: 1
        }
      ]
    };
  }
});

// languages/javascript.json
var require_javascript = __commonJS({
  "languages/javascript.json"(exports2, module2) {
    module2.exports = {
      id: "javascript",
      name: "JavaScript",
      extensions: [".js", ".jsx", ".mjs", ".cjs"],
      patterns: [
        {
          re: "^\\s*(?:export\\s+)?(?:default\\s+)?class\\s+([A-Za-z_$][\\w$]*)",
          kind: "class",
          nameGroup: 1
        },
        {
          re: "^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)",
          kind: "function",
          nameGroup: 1
        }
      ]
    };
  }
});

// languages/python.json
var require_python = __commonJS({
  "languages/python.json"(exports2, module2) {
    module2.exports = {
      id: "python",
      name: "Python",
      extensions: [".py"],
      patterns: [
        { re: "^\\s*class\\s+([A-Za-z_]\\w*)", kind: "class", nameGroup: 1 },
        { re: "^\\s*def\\s+([A-Za-z_]\\w*)", kind: "def", nameGroup: 1 }
      ]
    };
  }
});

// languages/cpp.json
var require_cpp = __commonJS({
  "languages/cpp.json"(exports2, module2) {
    module2.exports = {
      id: "cpp",
      name: "C / C++",
      extensions: [".h", ".hpp", ".hh", ".cpp", ".cc", ".cxx"],
      patterns: [
        {
          re: "^\\s*(?:template\\s*<[^>]*>\\s*)?(class|struct|enum)\\s+([A-Za-z_]\\w*)",
          kindGroup: 1,
          nameGroup: 2
        }
      ]
    };
  }
});

// languages/go.json
var require_go = __commonJS({
  "languages/go.json"(exports2, module2) {
    module2.exports = {
      id: "go",
      name: "Go",
      extensions: [".go"],
      patterns: [
        { re: "^\\s*type\\s+([A-Za-z_]\\w*)\\s+(?:struct|interface)", kind: "type", nameGroup: 1 },
        { re: "^\\s*func\\s+(?:\\([^)]*\\)\\s*)?([A-Za-z_]\\w*)", kind: "func", nameGroup: 1 }
      ]
    };
  }
});

// src/builtin-languages.js
var require_builtin_languages = __commonJS({
  "src/builtin-languages.js"(exports2, module2) {
    "use strict";
    var BUILTIN_LANGUAGES2 = [
      require_csharp(),
      require_typescript(),
      require_javascript(),
      require_python(),
      require_cpp(),
      require_go()
    ];
    var LANGUAGES_TEMPLATE2 = `[
  {
    "id": "rust",
    "name": "Rust",
    "extensions": [".rs"],
    "patterns": [
      { "re": "^\\\\s*(?:pub\\\\s+)?(struct|enum|trait)\\\\s+([A-Za-z_]\\\\w*)", "kindGroup": 1, "nameGroup": 2 },
      { "re": "^\\\\s*(?:pub\\\\s+)?fn\\\\s+([A-Za-z_]\\\\w*)", "kind": "fn", "nameGroup": 1 }
    ]
  }
]
`;
    module2.exports = { BUILTIN_LANGUAGES: BUILTIN_LANGUAGES2, LANGUAGES_TEMPLATE: LANGUAGES_TEMPLATE2 };
  }
});

// src/suggest.js
var require_suggest = __commonJS({
  "src/suggest.js"(exports2, module2) {
    "use strict";
    var { EditorSuggest } = require("obsidian");
    var CodeIndexSuggest2 = class extends EditorSuggest {
      constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
      }
      onTrigger(cursor, editor) {
        const s = this.plugin.settings;
        const before = editor.getLine(cursor.line).slice(0, cursor.ch);
        const i = before.lastIndexOf(s.trigger);
        if (i === -1)
          return null;
        const query = before.slice(i + s.trigger.length);
        if (!/^[\w.]*$/.test(query))
          return null;
        if (query.length < Math.max(0, s.minChars))
          return null;
        return { start: { line: cursor.line, ch: i }, end: cursor, query };
      }
      getSuggestions(ctx) {
        const idx = this.plugin.index;
        if (!idx || !idx.length)
          return [];
        const q = ctx.query.toLowerCase();
        const max = this.plugin.settings.maxResults;
        const hidden = new Set(this.plugin.settings.disabledKinds || []);
        const starts = [];
        const contains = [];
        for (const e of idx) {
          if (hidden.has(e.kind))
            continue;
          const n = e.name.toLowerCase();
          if (n.startsWith(q)) {
            starts.push(e);
            if (starts.length >= max)
              break;
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
        if (!ctx)
          return;
        const link = this.plugin.buildLink(e);
        ctx.editor.replaceRange(link, ctx.start, ctx.end);
        const pos = ctx.editor.posToOffset(ctx.start) + link.length;
        ctx.editor.setCursor(ctx.editor.offsetToPos(pos));
      }
    };
    module2.exports = { CodeIndexSuggest: CodeIndexSuggest2 };
  }
});

// src/settings-tab.js
var require_settings_tab = __commonJS({
  "src/settings-tab.js"(exports2, module2) {
    "use strict";
    var { PluginSettingTab, Setting } = require("obsidian");
    var { PRESETS } = require_constants();
    var CodeLinkerSettingTab2 = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
      }
      detectPreset() {
        const tpl = this.plugin.settings.uriTemplate;
        for (const k of Object.keys(PRESETS))
          if (PRESETS[k] === tpl)
            return k;
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
        new Setting(containerEl).setName("Code root").setDesc("Base folder the scan paths are relative to. Empty = the folder containing this vault.").addText(
          (t) => wide(t).setPlaceholder(this.plugin.codeRoot()).setValue(s.codeRoot).onChange(async (v) => {
            s.codeRoot = v.trim();
            await save();
          })
        );
        new Setting(containerEl).setName("Scan folders").setDesc("One path per line, relative to the code root. These folders are scanned for source files.").addTextArea((t) => {
          t.inputEl.rows = 4;
          t.inputEl.style.width = "100%";
          t.setValue(s.scanRoots).onChange(async (v) => {
            s.scanRoots = v;
            await save();
          });
        });
        new Setting(containerEl).setName("Skip folders").setDesc("Folder names never descended into.").addText(
          (t) => wide(t).setValue(s.skipDirs).onChange(async (v) => {
            s.skipDirs = v;
            await save();
          })
        );
        new Setting(containerEl).setName("Rebuild index now").addButton((b) => b.setButtonText("Rebuild").onClick(() => this.plugin.rebuildIndex(true).then(() => this.display())));
        containerEl.createEl("h3", { text: "Languages" });
        const enabled = new Set(s.enabledLanguages || []);
        const enabledCount = this.plugin.languages.filter((l) => enabled.has(l.id)).length;
        containerEl.createEl("div", {
          cls: "setting-item-description",
          text: `Which languages are scanned, and how declarations are detected. ${enabledCount} of ${this.plugin.languages.length} enabled.`
        });
        for (const lang of this.plugin.languages) {
          new Setting(containerEl).setName(lang.name).setDesc(`id: ${lang.id} \xB7 ${lang.extensions.join(" ") || "(no extensions)"}`).addToggle(
            (t) => t.setValue(enabled.has(lang.id)).onChange(async (v) => {
              const set = new Set(s.enabledLanguages || []);
              if (v)
                set.add(lang.id);
              else
                set.delete(lang.id);
              s.enabledLanguages = [...set];
              await save();
              await this.plugin.rebuildIndex(false);
              this.display();
            })
          );
        }
        for (const bad of this.plugin.languageErrors || []) {
          const row = new Setting(containerEl).setName(bad.id).setDesc(`Invalid: ${bad.error}`);
          row.settingEl.addClass("mod-warning");
        }
        new Setting(containerEl).setName("Languages file").setDesc("Vault-relative JSON file with extra/override languages. An entry whose id matches a built-in replaces it.").addText(
          (t) => wide(t).setValue(s.languagesFile).onChange(async (v) => {
            s.languagesFile = v.trim();
            await save();
          })
        );
        new Setting(containerEl).setName("Template / reload").setDesc("Create a starter template at that path, or reload it after editing.").addButton((b) => b.setButtonText("Create template").onClick(() => this.plugin.createLanguagesTemplate().then(() => this.display()))).addButton(
          (b) => b.setButtonText("Reload & rebuild").setCta().onClick(async () => {
            await this.plugin.loadLanguagesFile();
            await this.plugin.rebuildIndex(true);
            this.display();
          })
        );
        containerEl.createEl("h3", { text: "Searchable entities" });
        const kinds = [...new Set(this.plugin.index.map((e) => e.kind))].sort();
        if (!kinds.length) {
          containerEl.createEl("div", {
            cls: "setting-item-description",
            text: "Rebuild the index to see the entity kinds it contains."
          });
        } else {
          containerEl.createEl("div", {
            cls: "setting-item-description",
            text: "Turn a kind off to hide it from suggestions (e.g. files, or structs). Applied instantly \u2014 no rescan."
          });
          const hidden = new Set(s.disabledKinds || []);
          for (const kind of kinds) {
            const count = this.plugin.index.reduce((a, e) => a + (e.kind === kind ? 1 : 0), 0);
            new Setting(containerEl).setName(kind).setDesc(`${count} in index`).addToggle(
              (t) => t.setValue(!hidden.has(kind)).onChange(async (v) => {
                const set = new Set(s.disabledKinds || []);
                if (v)
                  set.delete(kind);
                else
                  set.add(kind);
                s.disabledKinds = [...set];
                await save();
              })
            );
          }
        }
        containerEl.createEl("h3", { text: "Suggestions & links" });
        new Setting(containerEl).setName("Trigger").setDesc("Type this to start a code suggestion.").addText(
          (t) => t.setValue(s.trigger).onChange(async (v) => {
            s.trigger = v || "@@";
            await save();
          })
        );
        const detected = this.detectPreset();
        if (this.customMode === void 0)
          this.customMode = detected === "custom";
        new Setting(containerEl).setName("Editor link preset").setDesc("Which editor the inserted links open in.").addDropdown(
          (d) => d.addOption("vscode", "VS Code").addOption("rider", "Rider / JetBrains").addOption("file", "file:// (open in default)").addOption("custom", "Custom").setValue(this.customMode ? "custom" : detected).onChange(async (v) => {
            this.customMode = v === "custom";
            if (!this.customMode && PRESETS[v])
              s.uriTemplate = PRESETS[v];
            await save();
            this.display();
          })
        );
        if (this.customMode) {
          new Setting(containerEl).setName("URI template").setDesc("Placeholders: {abs} {path} {line} {name} {project}").addText(
            (t) => wide(t).setValue(s.uriTemplate).onChange(async (v) => {
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
        info.setText(`Code root: ${this.plugin.codeRoot() || "(unknown)"} \xB7 ${this.plugin.index.length} entries indexed`);
      }
    };
    module2.exports = { CodeLinkerSettingTab: CodeLinkerSettingTab2 };
  }
});

// src/main.js
var { Plugin, Notice } = require("obsidian");
var fs = require("fs");
var fsp = fs.promises;
var nodePath = require("path");
var { DEFAULTS, splitLines, splitList } = require_constants();
var { BUILTIN_LANGUAGES, LANGUAGES_TEMPLATE } = require_builtin_languages();
var { CodeIndexSuggest } = require_suggest();
var { CodeLinkerSettingTab } = require_settings_tab();
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
      callback: () => this.rebuildIndex(true)
    });
    this.registerEvent(
      this.app.vault.on("modify", async (f) => {
        if (f && f.path === this.settings.languagesFile) {
          await this.loadLanguagesFile();
          this.rebuildIndex(false);
        }
      })
    );
    this.app.workspace.onLayoutReady(() => this.rebuildIndex(false));
  }
  // Absolute base folder the scan paths are resolved against.
  codeRoot() {
    if (this.settings.codeRoot)
      return this.settings.codeRoot;
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
      } catch (e) {
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
    const merged = /* @__PURE__ */ new Map();
    for (const l of BUILTIN_LANGUAGES)
      merged.set(l.id, l);
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
            this.languageErrors.push({ id: def && def.id || "(unknown)", error: "missing string id" });
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
            nameGroup: p.nameGroup
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
      if (notify)
        new Notice("Code Linker: could not determine code root");
      return;
    }
    const roots = splitLines(this.settings.scanRoots);
    if (!roots.length) {
      this.index = [];
      if (notify)
        new Notice("Code Linker: no scan folders configured (see settings)");
      return;
    }
    const enabled = new Set(this.settings.enabledLanguages || []);
    const byExt = /* @__PURE__ */ new Map();
    for (const lang of this.languages) {
      if (!enabled.has(lang.id))
        continue;
      for (const ext of lang.extensions) {
        if (!byExt.has(ext))
          byExt.set(ext, []);
        byExt.get(ext).push(lang);
      }
    }
    if (!byExt.size) {
      this.index = [];
      if (notify)
        new Notice("Code Linker: no languages enabled");
      return;
    }
    const skip = new Set(splitList(this.settings.skipDirs));
    const out = [];
    try {
      for (const r of roots) {
        await this.walk(nodePath.join(root, r), root, byExt, skip, out);
      }
    } catch (err) {
      if (notify)
        new Notice(`Code Linker: scan failed \u2014 ${err && err.message}`);
      return;
    }
    out.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
    this.index = out;
    if (notify)
      new Notice(`Code Linker: ${out.length} entries indexed`);
  }
  async walk(absDir, root, byExt, skip, out) {
    let items;
    try {
      items = await fsp.readdir(absDir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const it of items) {
      const abs = nodePath.join(absDir, it.name);
      if (it.isDirectory()) {
        if (!skip.has(it.name))
          await this.walk(abs, root, byExt, skip, out);
      } else if (it.isFile()) {
        const langs = byExt.get(nodePath.extname(it.name).toLowerCase());
        if (langs)
          await this.indexFile(abs, root, langs, out);
      }
    }
  }
  async indexFile(abs, root, langs, out) {
    let text;
    try {
      text = await fsp.readFile(abs, "utf8");
    } catch (e) {
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
          if (!m)
            continue;
          let name, kind;
          if (p.kindGroup != null) {
            kind = m[p.kindGroup];
            name = m[p.nameGroup != null ? p.nameGroup : 2];
          } else {
            kind = p.kind || "type";
            name = m[p.nameGroup != null ? p.nameGroup : 1];
          }
          if (name)
            out.push({ name, kind, path: rel, line: i + 1 });
        }
      }
    }
  }
  buildLink(e) {
    const root = this.codeRoot();
    const absFs = root ? nodePath.join(root, e.path) : e.path;
    const absFwd = absFs.split(nodePath.sep).join("/");
    const line = String(e.line || 1);
    const project = (e.path.split("/")[0] || "").trim();
    const uri = this.settings.uriTemplate.replace(/{abs}/g, encodeURI(absFwd)).replace(/{path}/g, e.path).replace(/{line}/g, line).replace(/{name}/g, e.name).replace(/{project}/g, project);
    return `[${e.name}](${uri})`;
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
