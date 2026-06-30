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
    var PRESETS2 = {
      // {root} keeps the note portable: the file holds a relative path, the absolute
      // code root is filled in on render/click (same mechanism as the file preset).
      vscode: "vscode://file/{root}/{path}:{line}",
      // {product} resolves to the chosen JetBrains IDE (the "JetBrains IDE" setting).
      jetbrains: "jetbrains://{product}/navigate/reference?project={project}&path={path}:{line}",
      // {root} is left in the note and resolved to the absolute code root on click,
      // so the link text stays portable across machines.
      file: "file:///{root}/{path}"
    };
    var JETBRAINS_PRODUCTS = [
      ["idea", "IntelliJ IDEA"],
      ["pycharm", "PyCharm"],
      ["webstorm", "WebStorm"],
      ["phpstorm", "PhpStorm"],
      ["rubymine", "RubyMine"],
      ["clion", "CLion"],
      ["goland", "GoLand"],
      ["rider", "Rider"],
      ["rustrover", "RustRover"],
      ["datagrip", "DataGrip"]
    ];
    var DEFAULT_SETTINGS2 = {
      trigger: "@@",
      uriTemplate: PRESETS2.file,
      jetbrainsProduct: "idea",
      // IDE the JetBrains preset opens; {product} in the template
      codeRoot: "",
      // empty => parent folder of the vault
      scanRoots: "",
      // one path per line, relative to codeRoot
      skipDirs: "obj\nbin\n.git\nLibrary\nTemp\nnode_modules",
      // one folder name per line
      editors: [],
      // user-defined editor presets, each { name, template }
      enabledLanguages: null,
      // null on first run => every built-in enabled
      languagesFile: "code-languages.json",
      // vault-relative JSON of extra/override languages
      disabledKinds: [],
      // "<langId>:<kind>" keys hidden from suggestions (query-time filter)
      autoRefresh: true,
      // watch scan folders and rebuild the index when code changes
      minChars: 1,
      maxResults: 12,
      maxFileSizeKb: 2048,
      // 0 = no limit; larger files are indexed by name only, not parsed
      contextMenu: true
      // the "Convert"/"Find and open" items in the editor right-click menu
    };
    var splitLines2 = (s) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);
    function isProtected(text, pos) {
      if (/^---\r?\n/.test(text)) {
        const end = text.indexOf("\n---", 3);
        if (end !== -1 && pos <= end + 4)
          return true;
      }
      const lines = text.split("\n");
      let lineStart = 0, lineIdx = 0;
      for (; lineIdx < lines.length; lineIdx++) {
        if (pos <= lineStart + lines[lineIdx].length)
          break;
        lineStart += lines[lineIdx].length + 1;
      }
      let fenced = false;
      for (let i = 0; i < lineIdx; i++) {
        const s = lines[i].trimStart();
        if (s.startsWith("```") || s.startsWith("~~~"))
          fenced = !fenced;
      }
      if (fenced)
        return true;
      const col = pos - lineStart;
      const line = lines[lineIdx] || "";
      return inMatch(line, col, /`[^`\n]+`/g) || inMatch(line, col, /\[[^\]]*\]\([^)]*\)/g);
    }
    function inMatch(line, col, re) {
      let m;
      while ((m = re.exec(line)) !== null) {
        if (col > m.index && col < m.index + m[0].length)
          return true;
      }
      return false;
    }
    function inTableCell2(text, pos) {
      const lines = text.split("\n");
      const lineIdx = (text.slice(0, pos).match(/\n/g) || []).length;
      if (!lines[lineIdx] || !lines[lineIdx].includes("|"))
        return false;
      const isDelimiter = (l) => l.includes("|") && l.includes("-") && /^[\s|:-]+$/.test(l);
      let top = lineIdx, bot = lineIdx;
      while (top > 0 && lines[top - 1].trim() !== "")
        top--;
      while (bot < lines.length - 1 && lines[bot + 1].trim() !== "")
        bot++;
      for (let i = top; i <= bot; i++)
        if (isDelimiter(lines[i]))
          return true;
      return false;
    }
    module2.exports = { PRESETS: PRESETS2, JETBRAINS_PRODUCTS, DEFAULT_SETTINGS: DEFAULT_SETTINGS2, splitLines: splitLines2, isProtected, inTableCell: inTableCell2 };
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
    module2.exports = { BUILTIN_LANGUAGES: BUILTIN_LANGUAGES2 };
  }
});

// src/suggest.js
var require_suggest = __commonJS({
  "src/suggest.js"(exports2, module2) {
    "use strict";
    var { EditorSuggest, prepareFuzzySearch } = require("obsidian");
    var { isProtected, inTableCell: inTableCell2 } = require_constants();
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
        const off = editor.posToOffset(cursor);
        if (isProtected(editor.getValue(), off))
          return null;
        return { start: { line: cursor.line, ch: i }, end: cursor, query };
      }
      getSuggestions(ctx) {
        const idx = this.plugin.index;
        if (!idx || !idx.length)
          return [];
        const max = this.plugin.settings.maxResults;
        const hidden = new Set(this.plugin.settings.disabledKinds || []);
        if (!ctx.query) {
          const out = [];
          for (const e of idx) {
            if (hidden.has(e.lang + ":" + e.kind))
              continue;
            out.push(e);
            if (out.length >= max)
              break;
          }
          return out;
        }
        const match = prepareFuzzySearch(ctx.query);
        const scored = [];
        for (const e of idx) {
          if (hidden.has(e.lang + ":" + e.kind))
            continue;
          const r = match(e.name);
          if (r)
            scored.push({ e, score: r.score });
        }
        scored.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));
        return scored.slice(0, max).map((s) => s.e);
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
        const inTable = inTableCell2(ctx.editor.getValue(), ctx.editor.posToOffset(ctx.start));
        const link = this.plugin.buildLink(e, inTable);
        ctx.editor.replaceRange(link, ctx.start, ctx.end);
        const pos = ctx.editor.posToOffset(ctx.start) + link.length;
        ctx.editor.setCursor(ctx.editor.offsetToPos(pos));
      }
    };
    module2.exports = { CodeIndexSuggest: CodeIndexSuggest2 };
  }
});

// src/locales/en.js
var require_en = __commonJS({
  "src/locales/en.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Commands
      "cmd.rebuildIndex": "Rebuild code index",
      "cmd.insertLink": "Insert code link",
      "cmd.openFile": "Open code file",
      "cmd.copyLink": "Copy code link",
      "cmd.convertSelection": "Convert selection to code link",
      "cmd.openSelection": "Find and open code",
      // Editor context menu
      "menu.convert": "Convert to code link",
      // Notices
      "notice.noCodeRoot": "Code Linker: could not determine code root",
      "notice.noScanFolders": "Code Linker: no scan folders configured (see settings)",
      "notice.noLanguages": "Code Linker: no languages enabled",
      "notice.scanFailed": "Code Linker: scan failed \u2014 {error}",
      "notice.indexed": "Code Linker: {entries} indexed",
      "notice.missingFolders": "Code Linker: scan folder not found \u2014 {folders}",
      "notice.copied": "Code Linker: link copied",
      "notice.noSelection": "Code Linker: select a name or path first",
      "notice.noMatch": "Code Linker: no code entry matches \u201C{query}\u201D",
      "notice.watchUnsupported": "Code Linker: auto-refresh is unavailable on this platform \u2014 rebuild manually",
      // Status bar
      "status.indexing": "Code Linker: indexing\u2026 {n}",
      // Command-palette modal
      "modal.searchPlaceholder": "Search code files and types\u2026",
      // Settings — headings
      "set.heading.index": "Code index",
      "set.heading.languages": "Languages",
      "set.heading.customLanguages": "Custom languages",
      "set.heading.suggestions": "Suggestions & links",
      // Settings — code index
      "set.codeRoot.name": "Code root",
      "set.codeRoot.desc": "Base folder the scan paths are relative to. Empty = the folder containing this vault.",
      "set.scanFolders.name": "Scan folders",
      "set.scanFolders.desc": "One path per line, relative to the code root. These folders are scanned for source files.",
      "set.scanFolders.notFound": "Folder not found under the code root.",
      "set.maxFileSize.name": "Max file size (KB)",
      "set.maxFileSize.desc": "Files larger than this are indexed by name only, not parsed for declarations. 0 = no limit.",
      "set.skipFolders.name": "Skip folders",
      "set.skipFolders.desc": "One folder name per line. These are never descended into.",
      "set.rebuild.name": "Rebuild index now",
      "set.rebuild.button": "Rebuild",
      // Settings — languages
      "set.languages.desc": "Which languages are scanned \u2014 {enabled} of {total} enabled. Expand an enabled language to pick which of its entity kinds are searchable.",
      "set.lang.meta": "id: {id} \xB7 {ext}",
      "set.lang.noExtensions": "(no extensions)",
      "set.lang.showEntities": "Show entities",
      "set.lang.hideEntities": "Hide entities",
      "set.lang.invalid": "Invalid: {error}",
      "set.kind.count": "{n} in index",
      "set.kind.rebuildHint": "Rebuild the index to choose which of its entities are searchable.",
      // Settings — custom languages
      "set.customLanguages.desc": "Add your own languages, or override a built-in, from a JSON file in your vault. Create the file at the path below, paste the example from the README, edit it, then save \u2014 it reloads on save. An entry whose id matches a built-in replaces it; a new id appears as a new language above.",
      "set.languagesFile.name": "Languages file",
      "set.languagesFile.desc": "Path to the JSON file, relative to your vault root.",
      "set.reloadLanguages.name": "Reload languages file",
      "set.reloadLanguages.desc": "Re-reads the file and rebuilds. Also happens automatically when you save the file.",
      "set.reloadLanguages.button": "Reload & rebuild",
      // Settings — suggestions & links
      "set.trigger.name": "Trigger",
      "set.trigger.desc": "Type this to start a code suggestion.",
      "set.editorPreset.name": "Editor link preset",
      "set.editorPreset.desc": "Which editor the inserted links open in. Add your own under \u201CYour editors\u201D below.",
      "set.preset.vscode": "VS Code",
      "set.preset.jetbrains": "JetBrains",
      "set.preset.file": "file:// (open in default)",
      "set.jetbrainsProduct.name": "JetBrains IDE",
      "set.jetbrainsProduct.desc": "Which JetBrains IDE the links open in.",
      "set.editors.name": "Your editors",
      "set.editors.count": "{n} added",
      "set.editors.collapse": "Collapse",
      "set.editors.expand": "Expand",
      "set.editors.desc": "Named presets for the dropdown above. Placeholders: {abs} {path} {line} {name} {project} {product} {root}.",
      "set.editors.namePlaceholder": "Name",
      "set.editors.remove": "Remove",
      "set.editors.add": "+ Add editor",
      "set.minChars.name": "Min characters",
      "set.minChars.desc": "How many characters to type before suggestions appear.",
      "set.maxResults.name": "Max results",
      "set.maxResults.desc": "Most suggestions to show at once.",
      "set.autoRefresh.name": "Auto-refresh index",
      "set.autoRefresh.desc": "Watch the scan folders and rebuild the index when source files change.",
      "set.autoRefresh.unsupported": "Recursive folder watching isn\u2019t supported on this platform (Linux); rebuild manually instead.",
      "set.contextMenu.name": "Editor context menu",
      "set.contextMenu.desc": "Add \u201CConvert to code link\u201D and \u201CFind and open code\u201D to the editor right-click menu.",
      "set.info": "Code root: {root} \xB7 {entries} indexed",
      "set.info.unknownRoot": "(unknown)",
      // Plural noun phrases
      "plural.entry": { one: "{n} entry", other: "{n} entries" }
    };
  }
});

// src/locales/ru.js
var require_ru = __commonJS({
  "src/locales/ru.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Commands
      "cmd.rebuildIndex": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441 \u043A\u043E\u0434\u0430",
      "cmd.insertLink": "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434",
      "cmd.openFile": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u0430\u0439\u043B \u043A\u043E\u0434\u0430",
      "cmd.copyLink": "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434",
      "cmd.convertSelection": "\u041F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0432 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434",
      "cmd.openSelection": "\u041D\u0430\u0439\u0442\u0438 \u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u043E\u0434",
      // Editor context menu
      "menu.convert": "\u041F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434",
      // Notices
      "notice.noCodeRoot": "Code Linker: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043A\u043E\u0440\u0435\u043D\u044C \u043A\u043E\u0434\u0430",
      "notice.noScanFolders": "Code Linker: \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B \u043F\u0430\u043F\u043A\u0438 \u0434\u043B\u044F \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F (\u0441\u043C. \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438)",
      "notice.noLanguages": "Code Linker: \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0451\u043D \u043D\u0438 \u043E\u0434\u0438\u043D \u044F\u0437\u044B\u043A",
      "notice.scanFailed": "Code Linker: \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u2014 {error}",
      "notice.indexed": "Code Linker: \u043F\u0440\u043E\u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043E {entries}",
      "notice.missingFolders": "Code Linker: \u043F\u0430\u043F\u043A\u0430 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u2014 {folders}",
      "notice.copied": "Code Linker: \u0441\u0441\u044B\u043B\u043A\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430",
      "notice.noSelection": "Code Linker: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0438\u043C\u044F \u0438\u043B\u0438 \u043F\u0443\u0442\u044C",
      "notice.noMatch": "Code Linker: \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0438 \u043A\u043E\u0434\u0430 \u0434\u043B\u044F \xAB{query}\xBB",
      "notice.watchUnsupported": "Code Linker: \u0430\u0432\u0442\u043E\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043D\u0430 \u044D\u0442\u043E\u0439 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435 \u2014 \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
      // Status bar
      "status.indexing": "Code Linker: \u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\u2026 {n}",
      // Command-palette modal
      "modal.searchPlaceholder": "\u041F\u043E\u0438\u0441\u043A \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 \u0442\u0438\u043F\u043E\u0432 \u043A\u043E\u0434\u0430\u2026",
      // Settings — headings
      "set.heading.index": "\u0418\u043D\u0434\u0435\u043A\u0441 \u043A\u043E\u0434\u0430",
      "set.heading.languages": "\u042F\u0437\u044B\u043A\u0438",
      "set.heading.customLanguages": "\u0421\u0432\u043E\u0438 \u044F\u0437\u044B\u043A\u0438",
      "set.heading.suggestions": "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u0438 \u0441\u0441\u044B\u043B\u043A\u0438",
      // Settings — code index
      "set.codeRoot.name": "\u041A\u043E\u0440\u0435\u043D\u044C \u043A\u043E\u0434\u0430",
      "set.codeRoot.desc": "\u0411\u0430\u0437\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430, \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u0437\u0430\u0434\u0430\u044E\u0442\u0441\u044F \u043F\u0443\u0442\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F. \u041F\u0443\u0441\u0442\u043E = \u043F\u0430\u043F\u043A\u0430, \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0449\u0430\u044F \u044D\u0442\u043E \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435.",
      "set.scanFolders.name": "\u041F\u0430\u043F\u043A\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F",
      "set.scanFolders.desc": "\u041F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u043F\u0443\u0442\u0438 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435, \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043A\u043E\u0440\u043D\u044F \u043A\u043E\u0434\u0430. \u042D\u0442\u0438 \u043F\u0430\u043F\u043A\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u043D\u0430 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B.",
      "set.scanFolders.notFound": "\u041F\u0430\u043F\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 \u043A\u043E\u0440\u043D\u0435 \u043A\u043E\u0434\u0430.",
      "set.maxFileSize.name": "\u041C\u0430\u043A\u0441. \u0440\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 (\u041A\u0411)",
      "set.maxFileSize.desc": "\u0424\u0430\u0439\u043B\u044B \u043A\u0440\u0443\u043F\u043D\u0435\u0435 \u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u0438\u043C\u0435\u043D\u0438, \u0431\u0435\u0437 \u0440\u0430\u0437\u0431\u043E\u0440\u0430 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0439. 0 = \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F.",
      "set.skipFolders.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u043C\u044B\u0435 \u043F\u0430\u043F\u043A\u0438",
      "set.skipFolders.desc": "\u041F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0438\u043C\u0435\u043D\u0438 \u043F\u0430\u043F\u043A\u0438 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435. \u0412 \u043D\u0438\u0445 \u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0437\u0430\u0445\u043E\u0434\u0438\u043C.",
      "set.rebuild.name": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441 \u0441\u0435\u0439\u0447\u0430\u0441",
      "set.rebuild.button": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C",
      // Settings — languages
      "set.languages.desc": "\u041A\u0430\u043A\u0438\u0435 \u044F\u0437\u044B\u043A\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u2014 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E {enabled} \u0438\u0437 {total}. \u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0438\u0442\u0435 \u0432\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0439 \u044F\u0437\u044B\u043A, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0431\u0440\u0430\u0442\u044C, \u043A\u0430\u043A\u0438\u0435 \u0432\u0438\u0434\u044B \u0441\u0443\u0449\u043D\u043E\u0441\u0442\u0435\u0439 \u0432 \u043D\u0451\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0434\u043B\u044F \u043F\u043E\u0438\u0441\u043A\u0430.",
      "set.lang.meta": "id: {id} \xB7 {ext}",
      "set.lang.noExtensions": "(\u0431\u0435\u0437 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0439)",
      "set.lang.showEntities": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0443\u0449\u043D\u043E\u0441\u0442\u0438",
      "set.lang.hideEntities": "\u0421\u043A\u0440\u044B\u0442\u044C \u0441\u0443\u0449\u043D\u043E\u0441\u0442\u0438",
      "set.lang.invalid": "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E: {error}",
      "set.kind.count": "\u0432 \u0438\u043D\u0434\u0435\u043A\u0441\u0435: {n}",
      "set.kind.rebuildHint": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u0438\u043D\u0434\u0435\u043A\u0441, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0431\u0440\u0430\u0442\u044C, \u043A\u0430\u043A\u0438\u0435 \u0435\u0433\u043E \u0441\u0443\u0449\u043D\u043E\u0441\u0442\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0434\u043B\u044F \u043F\u043E\u0438\u0441\u043A\u0430.",
      // Settings — custom languages
      "set.customLanguages.desc": "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0441\u0432\u043E\u0438 \u044F\u0437\u044B\u043A\u0438 \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u0447\u0435\u0440\u0435\u0437 JSON-\u0444\u0430\u0439\u043B \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0444\u0430\u0439\u043B \u043F\u043E \u043F\u0443\u0442\u0438 \u043D\u0438\u0436\u0435, \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u0440\u0438\u043C\u0435\u0440 \u0438\u0437 README, \u043E\u0442\u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u2014 \u043E\u043D \u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0441\u044F \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438. \u0417\u0430\u043F\u0438\u0441\u044C \u0441 id \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u043E\u0433\u043E \u044F\u0437\u044B\u043A\u0430 \u0437\u0430\u043C\u0435\u043D\u044F\u0435\u0442 \u0435\u0433\u043E; \u043D\u043E\u0432\u044B\u0439 id \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A\u0430\u043A \u043D\u043E\u0432\u044B\u0439 \u044F\u0437\u044B\u043A \u0432\u044B\u0448\u0435.",
      "set.languagesFile.name": "\u0424\u0430\u0439\u043B \u044F\u0437\u044B\u043A\u043E\u0432",
      "set.languagesFile.desc": "\u041F\u0443\u0442\u044C \u043A JSON-\u0444\u0430\u0439\u043B\u0443 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043A\u043E\u0440\u043D\u044F \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430.",
      "set.reloadLanguages.name": "\u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B \u044F\u0437\u044B\u043A\u043E\u0432",
      "set.reloadLanguages.desc": "\u041F\u0435\u0440\u0435\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442 \u0444\u0430\u0439\u043B \u0438 \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0435\u0442 \u0438\u043D\u0434\u0435\u043A\u0441. \u0422\u0430\u043A\u0436\u0435 \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0434\u0438\u0442 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430.",
      "set.reloadLanguages.button": "\u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438 \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C",
      // Settings — suggestions & links
      "set.trigger.name": "\u0422\u0440\u0438\u0433\u0433\u0435\u0440",
      "set.trigger.desc": "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u044D\u0442\u043E, \u0447\u0442\u043E\u0431\u044B \u043D\u0430\u0447\u0430\u0442\u044C \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0443 \u043F\u043E \u043A\u043E\u0434\u0443.",
      "set.editorPreset.name": "\u041F\u0440\u0435\u0441\u0435\u0442 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440",
      "set.editorPreset.desc": "\u0412 \u043A\u0430\u043A\u043E\u043C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0441\u0441\u044B\u043B\u043A\u0438. \u0421\u0432\u043E\u0438 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0432 \xAB\u0412\u0430\u0448\u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u044B\xBB \u043D\u0438\u0436\u0435.",
      "set.preset.vscode": "VS Code",
      "set.preset.jetbrains": "JetBrains",
      "set.preset.file": "file:// (\u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E)",
      "set.jetbrainsProduct.name": "IDE JetBrains",
      "set.jetbrainsProduct.desc": "\u0412 \u043A\u0430\u043A\u043E\u0439 JetBrains IDE \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0441\u0441\u044B\u043B\u043A\u0438.",
      "set.editors.name": "\u0412\u0430\u0448\u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u044B",
      "set.editors.count": "\u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E: {n}",
      "set.editors.collapse": "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      "set.editors.expand": "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      "set.editors.desc": "\u0418\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043F\u0440\u0435\u0441\u0435\u0442\u044B \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0430 \u0432\u044B\u0448\u0435. \u041F\u043B\u0435\u0439\u0441\u0445\u043E\u043B\u0434\u0435\u0440\u044B: {abs} {path} {line} {name} {project} {product} {root}.",
      "set.editors.namePlaceholder": "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435",
      "set.editors.remove": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      "set.editors.add": "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440",
      "set.minChars.name": "\u041C\u0438\u043D\u0438\u043C\u0443\u043C \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
      "set.minChars.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0432\u0432\u0435\u0441\u0442\u0438, \u043F\u0440\u0435\u0436\u0434\u0435 \u0447\u0435\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438.",
      "set.maxResults.name": "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432",
      "set.maxResults.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043E\u043A \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E.",
      "set.autoRefresh.name": "\u0410\u0432\u0442\u043E\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0438\u043D\u0434\u0435\u043A\u0441\u0430",
      "set.autoRefresh.desc": "\u0421\u043B\u0435\u0434\u0438\u0442\u044C \u0437\u0430 \u043F\u0430\u043F\u043A\u0430\u043C\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441 \u043F\u0440\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0438 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0445 \u0444\u0430\u0439\u043B\u043E\u0432.",
      "set.autoRefresh.unsupported": "\u0420\u0435\u043A\u0443\u0440\u0441\u0438\u0432\u043D\u043E\u0435 \u0441\u043B\u0435\u0436\u0435\u043D\u0438\u0435 \u0437\u0430 \u043F\u0430\u043F\u043A\u0430\u043C\u0438 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u044D\u0442\u043E\u0439 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435 (Linux); \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.",
      "set.contextMenu.name": "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u043E\u0435 \u043C\u0435\u043D\u044E \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0430",
      "set.contextMenu.desc": "\u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0442\u044C \xAB\u041F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434\xBB \u0438 \xAB\u041D\u0430\u0439\u0442\u0438 \u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u043E\u0434\xBB \u0432 \u043C\u0435\u043D\u044E \u043F\u043E \u043F\u0440\u0430\u0432\u043E\u043C\u0443 \u043A\u043B\u0438\u043A\u0443.",
      "set.info": "\u041A\u043E\u0440\u0435\u043D\u044C \u043A\u043E\u0434\u0430: {root} \xB7 \u043F\u0440\u043E\u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043E {entries}",
      "set.info.unknownRoot": "(\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E)",
      // Plural noun phrases
      "plural.entry": { one: "{n} \u0437\u0430\u043F\u0438\u0441\u044C", few: "{n} \u0437\u0430\u043F\u0438\u0441\u0438", many: "{n} \u0437\u0430\u043F\u0438\u0441\u0435\u0439", other: "{n} \u0437\u0430\u043F\u0438\u0441\u0435\u0439" }
    };
  }
});

// src/i18n.js
var require_i18n = __commonJS({
  "src/i18n.js"(exports2, module2) {
    "use strict";
    var LOCALES = {
      en: require_en(),
      ru: require_ru()
    };
    var dict = LOCALES.en;
    var pluralRules = new Intl.PluralRules("en");
    function initI18n2() {
      const sys = (window.localStorage.getItem("language") || "").split("-")[0].toLowerCase();
      const locale = LOCALES[sys] ? sys : "en";
      dict = LOCALES[locale];
      try {
        pluralRules = new Intl.PluralRules(locale);
      } catch (e) {
        pluralRules = new Intl.PluralRules("en");
      }
    }
    function interpolate(str, vars) {
      if (!vars)
        return str;
      return str.replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m);
    }
    function t2(key, vars) {
      let entry = dict[key];
      if (entry === void 0)
        entry = LOCALES.en[key];
      if (entry === void 0)
        return key;
      return interpolate(entry, vars);
    }
    function plural2(noun, n) {
      const forms = dict["plural." + noun] || LOCALES.en["plural." + noun];
      if (!forms)
        return n + " " + noun;
      let cat;
      try {
        cat = pluralRules.select(n);
      } catch (e) {
        cat = "other";
      }
      const tpl = forms[cat] != null ? forms[cat] : forms.other != null ? forms.other : Object.values(forms)[0];
      return interpolate(tpl, { n });
    }
    module2.exports = { initI18n: initI18n2, t: t2, plural: plural2 };
  }
});

// src/modal.js
var require_modal = __commonJS({
  "src/modal.js"(exports2, module2) {
    "use strict";
    var { FuzzySuggestModal } = require("obsidian");
    var { t: t2 } = require_i18n();
    var CodeLinkModal2 = class extends FuzzySuggestModal {
      constructor(app, plugin, opts) {
        super(app);
        this.plugin = plugin;
        this.onChoose = opts && opts.onChoose || (() => {
        });
        this.initialQuery = opts && opts.query || "";
        this.setPlaceholder(t2("modal.searchPlaceholder"));
      }
      onOpen() {
        super.onOpen();
        if (this.initialQuery) {
          this.inputEl.value = this.initialQuery;
          this.inputEl.dispatchEvent(new Event("input"));
        }
      }
      getItems() {
        const hidden = new Set(this.plugin.settings.disabledKinds || []);
        return this.plugin.index.filter((e) => !hidden.has(e.lang + ":" + e.kind));
      }
      // Path keeps same-named entries distinct in the modal's own fuzzy search.
      getItemText(e) {
        return `${e.name}  ${e.kind}  ${e.path}`;
      }
      onChooseItem(e) {
        this.onChoose(e);
      }
    };
    module2.exports = { CodeLinkModal: CodeLinkModal2 };
  }
});

// src/settings-tab.js
var require_settings_tab = __commonJS({
  "src/settings-tab.js"(exports2, module2) {
    "use strict";
    var { PluginSettingTab, Setting } = require("obsidian");
    var { PRESETS: PRESETS2, JETBRAINS_PRODUCTS } = require_constants();
    var { t: t2, plural: plural2 } = require_i18n();
    var CodeLinkerSettingTab2 = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.expanded = /* @__PURE__ */ new Set();
      }
      // The preset dropdown key matching the active template: a built-in preset, or
      // 'u:<i>' for one of the user's editors. Migration guarantees a match.
      selectedEditor() {
        const tpl = this.plugin.settings.uriTemplate;
        for (const k of Object.keys(PRESETS2))
          if (PRESETS2[k] === tpl)
            return k;
        const i = (this.plugin.settings.editors || []).findIndex((e) => e.template === tpl);
        return i >= 0 ? "u:" + i : "file";
      }
      // The kinds a language contributes to the index, each with a searchable toggle.
      renderSearchableKinds(lang) {
        const { containerEl } = this;
        const s = this.plugin.settings;
        const counts = /* @__PURE__ */ new Map();
        for (const e of this.plugin.index) {
          if (e.lang === lang.id)
            counts.set(e.kind, (counts.get(e.kind) || 0) + 1);
        }
        if (!counts.size) {
          containerEl.createEl("div", { cls: "setting-item-description code-linker-kind-row", text: t2("set.kind.rebuildHint") });
          return;
        }
        const hidden = new Set(s.disabledKinds || []);
        for (const kind of [...counts.keys()].sort()) {
          const key = lang.id + ":" + kind;
          const row = new Setting(containerEl).setName(kind).setDesc(t2("set.kind.count", { n: counts.get(kind) })).addToggle((c) => c.setValue(!hidden.has(key)).onChange(async (v) => {
            const set = new Set(s.disabledKinds || []);
            if (v)
              set.delete(key);
            else
              set.add(key);
            s.disabledKinds = [...set];
            await this.plugin.saveSettings();
          }));
          row.settingEl.addClass("code-linker-kind-row");
        }
      }
      display() {
        const { containerEl } = this;
        containerEl.empty();
        const s = this.plugin.settings;
        const save = async (rebuild) => {
          await this.plugin.saveSettings();
          if (rebuild)
            await this.plugin.rebuildIndex(false);
        };
        const wide = (c) => {
          c.inputEl.addClass("code-linker-input");
          return c;
        };
        new Setting(containerEl).setName(t2("set.heading.index")).setHeading();
        new Setting(containerEl).setName(t2("set.codeRoot.name")).setDesc(t2("set.codeRoot.desc")).addText((c) => wide(c).setPlaceholder(this.plugin.codeRoot()).setValue(s.codeRoot).onChange(async (v) => {
          s.codeRoot = v.trim();
          await save(false);
        }));
        const area = (setting, get, set) => setting.addTextArea((c) => {
          c.inputEl.rows = 4;
          c.inputEl.addClass("code-linker-input");
          c.setValue(get()).onChange(async (v) => {
            set(v);
            await save(false);
          });
        });
        area(new Setting(containerEl).setName(t2("set.scanFolders.name")).setDesc(t2("set.scanFolders.desc")), () => s.scanRoots, (v) => s.scanRoots = v);
        for (const st of this.plugin.scanRootStatus().filter((x) => !x.exists)) {
          const row = new Setting(containerEl).setName(st.rel).setDesc(t2("set.scanFolders.notFound"));
          row.settingEl.addClass("mod-warning");
        }
        area(new Setting(containerEl).setName(t2("set.skipFolders.name")).setDesc(t2("set.skipFolders.desc")), () => s.skipDirs, (v) => s.skipDirs = v);
        new Setting(containerEl).setName(t2("set.maxFileSize.name")).setDesc(t2("set.maxFileSize.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.setValue(String(s.maxFileSizeKb)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.maxFileSizeKb = Number.isFinite(n) && n >= 0 ? n : 2048;
            await save(false);
          });
          c.inputEl.addEventListener("blur", () => this.plugin.rebuildIndex(false));
        });
        new Setting(containerEl).setName(t2("set.rebuild.name")).addButton((b) => b.setButtonText(t2("set.rebuild.button")).onClick(() => this.plugin.rebuildIndex(true).then(() => this.display())));
        new Setting(containerEl).setName(t2("set.heading.languages")).setHeading();
        const enabled = new Set(s.enabledLanguages || []);
        const enabledCount = this.plugin.languages.filter((l) => enabled.has(l.id)).length;
        containerEl.createEl("div", { cls: "setting-item-description", text: t2("set.languages.desc", { enabled: enabledCount, total: this.plugin.languages.length }) });
        for (const lang of this.plugin.languages) {
          const on = enabled.has(lang.id);
          const open = this.expanded.has(lang.id);
          const ext = lang.extensions.join(" ") || t2("set.lang.noExtensions");
          const setting = new Setting(containerEl).setName(lang.name).setDesc(t2("set.lang.meta", { id: lang.id, ext }));
          if (on) {
            setting.addExtraButton((b) => b.setIcon(open ? "chevron-up" : "chevron-down").setTooltip(open ? t2("set.lang.hideEntities") : t2("set.lang.showEntities")).onClick(() => {
              if (open)
                this.expanded.delete(lang.id);
              else
                this.expanded.add(lang.id);
              this.display();
            }));
          } else {
            this.expanded.delete(lang.id);
          }
          setting.addToggle((c) => c.setValue(on).onChange(async (v) => {
            const set = new Set(s.enabledLanguages || []);
            if (v)
              set.add(lang.id);
            else
              set.delete(lang.id);
            s.enabledLanguages = [...set];
            await save(true);
            this.display();
          }));
          if (on && open)
            this.renderSearchableKinds(lang);
        }
        for (const bad of this.plugin.languageErrors || []) {
          const row = new Setting(containerEl).setName(bad.id).setDesc(t2("set.lang.invalid", { error: bad.error }));
          row.settingEl.addClass("mod-warning");
        }
        new Setting(containerEl).setName(t2("set.heading.customLanguages")).setHeading();
        containerEl.createEl("div", { cls: "setting-item-description", text: t2("set.customLanguages.desc") });
        new Setting(containerEl).setName(t2("set.languagesFile.name")).setDesc(t2("set.languagesFile.desc")).addText((c) => wide(c).setValue(s.languagesFile).onChange(async (v) => {
          s.languagesFile = v.trim();
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.reloadLanguages.name")).setDesc(t2("set.reloadLanguages.desc")).addButton((b) => b.setButtonText(t2("set.reloadLanguages.button")).setCta().onClick(async () => {
          await this.plugin.loadLanguagesFile();
          await this.plugin.rebuildIndex(true);
          this.display();
        }));
        new Setting(containerEl).setName(t2("set.heading.suggestions")).setHeading();
        new Setting(containerEl).setName(t2("set.trigger.name")).setDesc(t2("set.trigger.desc")).addText((c) => c.setValue(s.trigger).onChange(async (v) => {
          s.trigger = v || "@@";
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.editorPreset.name")).setDesc(t2("set.editorPreset.desc")).addDropdown((d) => {
          d.addOption("file", t2("set.preset.file"));
          d.addOption("vscode", t2("set.preset.vscode"));
          d.addOption("jetbrains", t2("set.preset.jetbrains"));
          (s.editors || []).forEach((e, i) => d.addOption("u:" + i, e.name || `Editor ${i + 1}`));
          d.setValue(this.selectedEditor()).onChange(async (v) => {
            const wasJetbrains = this.selectedEditor() === "jetbrains";
            if (PRESETS2[v])
              s.uriTemplate = PRESETS2[v];
            else if (v.startsWith("u:"))
              s.uriTemplate = s.editors[+v.slice(2)].template;
            await save(false);
            if (wasJetbrains !== (v === "jetbrains"))
              this.display();
          });
        });
        if (this.selectedEditor() === "jetbrains") {
          new Setting(containerEl).setName(t2("set.jetbrainsProduct.name")).setDesc(t2("set.jetbrainsProduct.desc")).addDropdown((d) => {
            for (const [code, label] of JETBRAINS_PRODUCTS)
              d.addOption(code, label);
            d.setValue(s.jetbrainsProduct).onChange(async (v) => {
              s.jetbrainsProduct = v;
              await save(false);
            });
          });
        }
        if (this.showEditors === void 0)
          this.showEditors = false;
        const editors = s.editors || [];
        new Setting(containerEl).setName(t2("set.editors.name")).setDesc(t2("set.editors.count", { n: editors.length })).addExtraButton((b) => b.setIcon(this.showEditors ? "chevron-up" : "chevron-down").setTooltip(this.showEditors ? t2("set.editors.collapse") : t2("set.editors.expand")).onClick(() => {
          this.showEditors = !this.showEditors;
          this.display();
        }));
        if (this.showEditors) {
          editors.forEach((ed, i) => {
            const row = new Setting(containerEl).addText((c) => {
              c.inputEl.addClass("code-linker-editor-name");
              c.setPlaceholder(t2("set.editors.namePlaceholder")).setValue(ed.name).onChange(async (v) => {
                ed.name = v;
                await save(false);
              });
            }).addText((c) => {
              c.inputEl.addClass("code-linker-editor-tpl");
              c.setPlaceholder("cursor://file/{abs}:{line}").setValue(ed.template).onChange(async (v) => {
                if (s.uriTemplate === ed.template)
                  s.uriTemplate = v;
                ed.template = v;
                await save(false);
              });
            }).addExtraButton((b) => b.setIcon("trash").setTooltip(t2("set.editors.remove")).onClick(async () => {
              if (s.uriTemplate === ed.template)
                s.uriTemplate = PRESETS2.file;
              editors.splice(i, 1);
              await save(false);
              this.display();
            }));
            row.settingEl.addClass("code-linker-editor-row");
          });
          new Setting(containerEl).setDesc(t2("set.editors.desc")).addButton((b) => b.setButtonText(t2("set.editors.add")).setCta().onClick(async () => {
            editors.push({ name: "", template: "" });
            s.editors = editors;
            await save(false);
            this.display();
          }));
        }
        new Setting(containerEl).setName(t2("set.minChars.name")).setDesc(t2("set.minChars.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.setValue(String(s.minChars)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.minChars = Number.isFinite(n) ? n : 1;
            await save(false);
          });
        });
        new Setting(containerEl).setName(t2("set.maxResults.name")).setDesc(t2("set.maxResults.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.setValue(String(s.maxResults)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.maxResults = Number.isFinite(n) && n > 0 ? n : 12;
            await save(false);
          });
        });
        new Setting(containerEl).setName(t2("set.autoRefresh.name")).setDesc(t2("set.autoRefresh.desc")).addToggle((c) => c.setValue(s.autoRefresh).onChange(async (v) => {
          s.autoRefresh = v;
          await save(false);
          if (v)
            this.plugin.startWatchers();
          else
            this.plugin.stopWatchers();
        }));
        if (s.autoRefresh && this.plugin.watchUnsupported) {
          const warn = new Setting(containerEl).setDesc(t2("set.autoRefresh.unsupported"));
          warn.settingEl.addClass("mod-warning");
        }
        new Setting(containerEl).setName(t2("set.contextMenu.name")).setDesc(t2("set.contextMenu.desc")).addToggle((c) => c.setValue(s.contextMenu).onChange(async (v) => {
          s.contextMenu = v;
          await save(false);
        }));
        const root = this.plugin.codeRoot() || t2("set.info.unknownRoot");
        containerEl.createEl("div", { cls: "setting-item-description", text: t2("set.info", { root, entries: plural2("entry", this.plugin.index.length) }) });
      }
    };
    module2.exports = { CodeLinkerSettingTab: CodeLinkerSettingTab2 };
  }
});

// src/api.js
var require_api = __commonJS({
  "src/api.js"(exports2, module2) {
    "use strict";
    var pick = (e) => ({ name: e.name, kind: e.kind, lang: e.lang, path: e.path, line: e.line });
    module2.exports = {
      buildApi() {
        return {
          version: this.manifest.version,
          codeRoot: () => this.codeRoot(),
          // Every indexed entry: { name, kind, lang, path, line }.
          getEntries: () => this.index.map(pick),
          // One row per indexed file: { name, path, lang, entries }.
          getFiles: () => this.apiFiles(),
          // Totals: { files, entries, byLang, byKind }.
          getStats: () => this.apiStats(),
          // Enabled languages: { id, name, extensions }.
          getLanguages: () => this.apiLanguages(),
          // Entries matching a name or path tail (the same lookup the commands use).
          find: (text) => this.lookup(String(text || "")).map(pick),
          // Render helpers: a portable markdown link, or a ready-to-open absolute URI.
          linkFor: (entry) => this.buildLink(entry),
          uriFor: (entry) => this.fillRoot(this.buildUri(entry)),
          // Subscribe to index rebuilds; returns an unsubscribe function.
          onChange: (cb) => this.onIndexChange(cb)
        };
      },
      apiFiles() {
        const out = [];
        for (const v of this.fileCache.values()) {
          const f = v.entries[0];
          if (f)
            out.push({ name: f.name, path: f.path, lang: f.lang, entries: v.entries.length });
        }
        out.sort((a, b) => a.path.localeCompare(b.path));
        return out;
      },
      apiStats() {
        const byLang = {}, byKind = {};
        for (const e of this.index) {
          byLang[e.lang] = (byLang[e.lang] || 0) + 1;
          byKind[e.kind] = (byKind[e.kind] || 0) + 1;
        }
        return { files: this.fileCache.size, entries: this.index.length, byLang, byKind };
      },
      apiLanguages() {
        const enabled = new Set(this.settings.enabledLanguages || []);
        return this.languages.filter((l) => enabled.has(l.id)).map((l) => ({ id: l.id, name: l.name, extensions: l.extensions.slice() }));
      },
      onIndexChange(cb) {
        if (typeof cb !== "function")
          return () => {
          };
        if (!this._indexListeners)
          this._indexListeners = /* @__PURE__ */ new Set();
        this._indexListeners.add(cb);
        return () => this._indexListeners.delete(cb);
      },
      notifyIndexChange() {
        for (const cb of this._indexListeners || []) {
          try {
            cb();
          } catch (e) {
          }
        }
      }
    };
  }
});

// src/main.js
var { Plugin, Notice, normalizePath } = require("obsidian");
var { EditorView } = require("@codemirror/view");
var { Prec } = require("@codemirror/state");
var fs = require("fs");
var fsp = fs.promises;
var readline = require("readline");
var nodePath = require("path");
var { PRESETS, DEFAULT_SETTINGS, splitLines, inTableCell } = require_constants();
var MAX_PARSE_LINE_LENGTH = 2e3;
var { BUILTIN_LANGUAGES } = require_builtin_languages();
var { CodeIndexSuggest } = require_suggest();
var { CodeLinkModal } = require_modal();
var { CodeLinkerSettingTab } = require_settings_tab();
var { initI18n, t, plural } = require_i18n();
var api = require_api();
var CodeLinkerPlugin = class extends Plugin {
  async onload() {
    initI18n();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.index = [];
    this.languages = [];
    this.languageErrors = [];
    this.customRaw = "";
    this.watchers = [];
    this.fileCache = /* @__PURE__ */ new Map();
    this.cacheSignature = "";
    this._indexListeners = /* @__PURE__ */ new Set();
    await this.loadLanguagesFile();
    this.migrateSettings();
    await this.loadCache();
    this.api = this.buildApi();
    this.registerEditorSuggest(new CodeIndexSuggest(this.app, this));
    this.registerMarkdownPostProcessor((el) => this.resolveRootLinks(el));
    this.registerEditorExtension(
      Prec.highest(
        EditorView.domEventHandlers({
          mousedown: (evt, view) => this.onEditorLink(evt, view, false),
          click: (evt, view) => this.onEditorLink(evt, view, true),
          auxclick: (evt, view) => this.onEditorLink(evt, view, true)
        })
      )
    );
    this.addSettingTab(new CodeLinkerSettingTab(this.app, this));
    this.statusEl = this.addStatusBarItem();
    this.addCommand({ id: "rebuild-code-index", name: t("cmd.rebuildIndex"), callback: () => this.rebuildIndex(true) });
    this.addCommand({ id: "insert-code-link", name: t("cmd.insertLink"), editorCallback: (editor) => this.pickEntry((e) => this.insertLink(editor, e)) });
    this.addCommand({ id: "open-code-file", name: t("cmd.openFile"), callback: () => this.pickEntry((e) => this.openEntry(e)) });
    this.addCommand({ id: "copy-code-link", name: t("cmd.copyLink"), callback: () => this.pickEntry((e) => this.copyLink(e)) });
    this.addCommand({ id: "convert-selection-to-link", name: t("cmd.convertSelection"), editorCallback: (editor) => this.convertSelection(editor) });
    this.addCommand({ id: "open-selected-code", name: t("cmd.openSelection"), editorCallback: (editor) => this.openSelection(editor) });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        if (!this.settings.contextMenu || !this.selectionOrWord(editor))
          return;
        menu.addItem((item) => item.setTitle(t("menu.convert")).setIcon("link").onClick(() => this.convertSelection(editor)));
        menu.addItem((item) => item.setTitle(t("cmd.openSelection")).setIcon("file-search").onClick(() => this.openSelection(editor)));
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", async (f) => {
        if (f && f.path === this.languagesFilePath()) {
          await this.loadLanguagesFile();
          this.rebuildIndex(false);
        }
      })
    );
    this.app.workspace.onLayoutReady(() => this.rebuildIndex(false));
  }
  onunload() {
    this.stopWatchers();
    clearTimeout(this.watchTimer);
  }
  migrateSettings() {
    if (this.settings.enabledLanguages == null) {
      this.settings.enabledLanguages = this.languages.map((l) => l.id);
    }
    this.settings.skipDirs = (this.settings.skipDirs || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).join("\n");
    if (this.settings.uriTemplate === "file:///{abs}")
      this.settings.uriTemplate = PRESETS.file;
    const tpl = this.settings.uriTemplate;
    const editors = this.settings.editors || (this.settings.editors = []);
    const known = Object.values(PRESETS).includes(tpl) || editors.some((e) => e.template === tpl);
    if (!known)
      editors.push({ name: "Custom", template: tpl });
  }
  // Obsidian URL-encodes the braces in a rendered href, so match both forms.
  fillRoot(v) {
    const root = encodeURI(this.codeRoot().split(nodePath.sep).join("/"));
    return v.replace(/\{root\}|%7Broot%7D/gi, root);
  }
  resolveRootLinks(el) {
    const links = el.querySelectorAll ? el.querySelectorAll("a") : [];
    for (const a of links) {
      for (const attr of ["href", "data-href"]) {
        const v = a.getAttribute(attr);
        if (!v)
          continue;
        const out = this.fillRoot(v);
        if (out !== v)
          a.setAttribute(attr, out);
      }
    }
  }
  // CM6 link handler for Live Preview. Suppresses Obsidian's open of the literal
  // {root} URL; opens the resolved one on click/auxclick. Returns true when handled.
  onEditorLink(evt, view, open) {
    if (evt.button !== 0 && evt.button !== 1)
      return false;
    const uri = this.rootUriAt(evt, view);
    if (!uri)
      return false;
    evt.preventDefault();
    evt.stopPropagation();
    if (open)
      window.open(uri);
    return true;
  }
  // The markdown link under the click, if it carries a {root} token, resolved. The
  // rendered span has no href, so map the click to a document position and read it.
  rootUriAt(evt, view) {
    const el = evt.target;
    if (!el || !el.closest || !el.closest(".cm-link"))
      return null;
    if (typeof view.posAtCoords !== "function")
      return null;
    const offset = view.posAtCoords({ x: evt.clientX, y: evt.clientY });
    if (offset == null)
      return null;
    const line = view.state.doc.lineAt(offset);
    const ch = offset - line.from;
    const re = /\[[^\]]*\]\(([^)]+)\)/g;
    let m;
    while (m = re.exec(line.text)) {
      if (ch < m.index || ch > m.index + m[0].length)
        continue;
      const tgt = m[1].trim();
      return /\{root\}|%7Broot%7D/i.test(tgt) ? this.fillRoot(tgt) : null;
    }
    return null;
  }
  // Absolute base folder the scan paths are resolved against.
  codeRoot() {
    if (this.settings.codeRoot)
      return this.settings.codeRoot;
    const adapter = this.app.vault.adapter;
    const base = adapter && typeof adapter.getBasePath === "function" ? adapter.getBasePath() : "";
    return base ? nodePath.dirname(base) : "";
  }
  // Vault-relative, normalized path of the custom languages file (or "" if unset).
  languagesFilePath() {
    const raw = (this.settings.languagesFile || "").trim();
    return raw ? normalizePath(raw) : "";
  }
  cacheFilePath() {
    return normalizePath(`${this.manifest.dir}/index-cache.json`);
  }
  // A fingerprint of what the scan would produce: enabled languages, their
  // extensions and patterns. When it changes, the per-file entry cache is stale
  // even if file mtimes haven't moved (e.g. a regex was edited), so we drop it.
  indexSignature() {
    const enabled = new Set(this.settings.enabledLanguages || []);
    const parts = [];
    for (const lang of this.languages) {
      if (!enabled.has(lang.id))
        continue;
      const pats = lang.patterns.map((p) => [p.regex.source, p.regex.flags, p.kind, p.kindGroup, p.nameGroup]);
      parts.push([lang.id, lang.extensions, pats]);
    }
    return JSON.stringify([this.settings.maxFileSizeKb, parts]);
  }
  async loadCache() {
    try {
      const p = this.cacheFilePath();
      if (!await this.app.vault.adapter.exists(p))
        return;
      const data = JSON.parse(await this.app.vault.adapter.read(p));
      if (!data || data.version !== 1 || !data.files)
        return;
      this.cacheSignature = data.signature || "";
      this.fileCache = new Map(Object.entries(data.files));
      this.index = this.flattenCache();
    } catch (e) {
    }
  }
  async saveCache() {
    try {
      const files = {};
      for (const [rel, v] of this.fileCache.entries())
        files[rel] = v;
      const data = { version: 1, signature: this.cacheSignature, files };
      await this.app.vault.adapter.write(this.cacheFilePath(), JSON.stringify(data));
    } catch (e) {
    }
  }
  flattenCache() {
    const out = [];
    for (const v of this.fileCache.values())
      for (const e of v.entries)
        out.push(e);
    out.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
    return out;
  }
  // Extensions of currently enabled languages, used to filter watch events.
  watchedExts() {
    const enabled = new Set(this.settings.enabledLanguages || []);
    const exts = /* @__PURE__ */ new Set();
    for (const lang of this.languages) {
      if (enabled.has(lang.id))
        for (const e of lang.extensions)
          exts.add(e);
    }
    return exts;
  }
  startWatchers() {
    this.stopWatchers();
    this.watchUnsupported = false;
    if (!this.settings.autoRefresh)
      return;
    const root = this.codeRoot();
    if (!root)
      return;
    for (const r of splitLines(this.settings.scanRoots)) {
      const dir = nodePath.join(root, r);
      if (!fs.existsSync(dir))
        continue;
      try {
        const w = fs.watch(dir, { recursive: true }, (_evt, filename) => this.onWatchEvent(filename));
        this.watchers.push(w);
      } catch (e) {
        if (e && e.code === "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM")
          this.watchUnsupported = true;
      }
    }
    if (this.watchUnsupported && !this.watchUnsupportedNotified) {
      this.watchUnsupportedNotified = true;
      new Notice(t("notice.watchUnsupported"));
    }
  }
  stopWatchers() {
    for (const w of this.watchers) {
      try {
        w.close();
      } catch (e) {
      }
    }
    this.watchers = [];
  }
  // Debounce a background rebuild on file changes. Skip-dir noise (node_modules)
  // and files we don't index are dropped cheaply before scheduling.
  onWatchEvent(filename) {
    if (filename) {
      const name = String(filename);
      const skip = new Set(splitLines(this.settings.skipDirs));
      if (name.split(/[\\/]/).some((s) => skip.has(s)))
        return;
      const ext = nodePath.extname(name).toLowerCase();
      if (ext && !this.watchedExts().has(ext))
        return;
    }
    clearTimeout(this.watchTimer);
    this.watchTimer = setTimeout(() => this.rebuildIndex(false), 1500);
  }
  async loadLanguagesFile() {
    const path = this.languagesFilePath();
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
  // Empty the index (nothing to scan) and persist, telling whoever's listening.
  async resetIndex(noticeKey, notify) {
    this.index = [];
    this.fileCache = /* @__PURE__ */ new Map();
    await this.saveCache();
    this.notifyIndexChange();
    if (notify)
      new Notice(t(noticeKey));
  }
  async rebuildIndex(notify) {
    this.stopWatchers();
    const root = this.codeRoot();
    if (!root) {
      if (notify)
        new Notice(t("notice.noCodeRoot"));
      return;
    }
    const roots = splitLines(this.settings.scanRoots);
    if (!roots.length) {
      await this.resetIndex("notice.noScanFolders", notify);
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
      await this.resetIndex("notice.noLanguages", notify);
      return;
    }
    const signature = this.indexSignature();
    const old = signature === this.cacheSignature ? this.fileCache : /* @__PURE__ */ new Map();
    let seen = 0;
    const onFile = () => {
      if (++seen % 200 === 0)
        this.statusEl.setText(t("status.indexing", { n: seen }));
    };
    const scan = { root, byExt, skip: new Set(splitLines(this.settings.skipDirs)), old, next: /* @__PURE__ */ new Map(), onFile };
    try {
      for (const r of roots) {
        await this.walk(nodePath.join(root, r), scan);
      }
    } catch (err) {
      this.statusEl.setText("");
      if (notify)
        new Notice(t("notice.scanFailed", { error: err && err.message }));
      return;
    }
    this.statusEl.setText("");
    this.fileCache = scan.next;
    this.cacheSignature = signature;
    this.index = this.flattenCache();
    await this.saveCache();
    this.notifyIndexChange();
    this.startWatchers();
    if (notify) {
      const missing = this.scanRootStatus().filter((st) => !st.exists).map((st) => st.rel);
      if (missing.length)
        new Notice(t("notice.missingFolders", { folders: missing.join(", ") }));
      else
        new Notice(t("notice.indexed", { entries: plural("entry", this.index.length) }));
    }
  }
  async walk(absDir, scan) {
    let items;
    try {
      items = await fsp.readdir(absDir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const it of items) {
      const abs = nodePath.join(absDir, it.name);
      if (it.isDirectory()) {
        if (!scan.skip.has(it.name))
          await this.walk(abs, scan);
      } else if (it.isFile()) {
        const langs = scan.byExt.get(nodePath.extname(it.name).toLowerCase());
        if (langs)
          await this.indexFile(abs, langs, scan);
      }
    }
  }
  async indexFile(abs, langs, scan) {
    const rel = nodePath.relative(scan.root, abs).split(nodePath.sep).join("/");
    let stat;
    try {
      stat = await fsp.stat(abs);
    } catch (e) {
      return;
    }
    if (scan.onFile)
      scan.onFile();
    const cached = scan.old.get(rel);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      scan.next.set(rel, cached);
      return;
    }
    const base = nodePath.basename(abs).replace(/\.[^.]+$/, "");
    const entries = [{ name: base, kind: "file", lang: langs[0].id, path: rel, line: 1 }];
    const maxBytes = Math.max(0, this.settings.maxFileSizeKb || 0) * 1024;
    if (!maxBytes || stat.size <= maxBytes) {
      try {
        await this.parseLines(abs, langs, rel, entries);
      } catch (e) {
      }
    }
    scan.next.set(rel, { mtimeMs: stat.mtimeMs, entries });
  }
  // Stream line by line so we never hold the whole file plus a lines[] array at
  // once; appends each declaration it finds to `entries`.
  parseLines(abs, langs, rel, entries) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(abs, { encoding: "utf8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      let i = 0;
      rl.on("line", (line) => {
        i++;
        if (line.length > MAX_PARSE_LINE_LENGTH)
          return;
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
              entries.push({ name, kind, lang: lang.id, path: rel, line: i });
          }
        }
      });
      rl.on("close", resolve);
      stream.on("error", reject);
    });
  }
  // {root} stays in the link for portability (resolved on render/click); call
  // fillRoot() on the result when opening the URI directly, with no note involved.
  buildUri(e) {
    const root = this.codeRoot();
    const absFs = root ? nodePath.join(root, e.path) : e.path;
    const absFwd = absFs.split(nodePath.sep).join("/");
    const line = String(e.line || 1);
    const project = (e.path.split("/")[0] || "").trim();
    const product = this.settings.jetbrainsProduct || "idea";
    const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
    return this.settings.uriTemplate.replace(/{abs}/g, encodeURI(absFwd)).replace(/{path}/g, encPath(e.path)).replace(/{line}/g, line).replace(/{name}/g, encodeURIComponent(e.name)).replace(/{project}/g, encodeURIComponent(project)).replace(/{product}/g, product);
  }
  // The markdown link to insert. Inside a table cell a literal pipe splits the row.
  buildLink(e, inTable) {
    const link = `[${e.name}](${this.buildUri(e)})`;
    return inTable ? link.replace(/\|/g, "\\|") : link;
  }
  pickEntry(onChoose, query) {
    new CodeLinkModal(this.app, this, { onChoose, query }).open();
  }
  insertLink(editor, e) {
    const inTable = inTableCell(editor.getValue(), editor.posToOffset(editor.getCursor("from")));
    editor.replaceSelection(this.buildLink(e, inTable));
  }
  copyLink(e) {
    navigator.clipboard.writeText(this.buildLink(e));
    new Notice(t("notice.copied"));
  }
  // fillRoot resolves the portable {root} token, since there's no note to render it.
  openEntry(e) {
    window.open(this.fillRoot(this.buildUri(e)));
  }
  // Entries matched by name, or by path tail so a selected "Foo/Bar.cs" resolves too.
  lookup(text) {
    const q = text.trim();
    if (!q)
      return [];
    const lc = q.toLowerCase();
    const norm = lc.split("\\").join("/");
    const out = [];
    for (const e of this.index) {
      const p = e.path.toLowerCase();
      if (e.name.toLowerCase() === lc || p === norm || p.endsWith("/" + norm))
        out.push(e);
    }
    return out;
  }
  selectionOrWord(editor) {
    const sel = editor.getSelection();
    if (sel)
      return { text: sel, from: editor.getCursor("from"), to: editor.getCursor("to") };
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line);
    const isWord = (ch) => ch && /[\w./\\-]/.test(ch);
    let s = cur.ch, en = cur.ch;
    while (s > 0 && isWord(line[s - 1]))
      s--;
    while (en < line.length && isWord(line[en]))
      en++;
    const text = line.slice(s, en);
    return text ? { text, from: { line: cur.line, ch: s }, to: { line: cur.line, ch: en } } : null;
  }
  // Run the selected (or under-cursor) token through the index: a single match runs
  // `action`, several open the picker, none notifies.
  resolveSelection(editor, action) {
    const target = this.selectionOrWord(editor);
    if (!target) {
      new Notice(t("notice.noSelection"));
      return;
    }
    const matches = this.lookup(target.text);
    if (!matches.length) {
      new Notice(t("notice.noMatch", { query: target.text }));
      return;
    }
    const run = (e) => action(e, target);
    if (matches.length === 1)
      run(matches[0]);
    else
      this.pickEntry(run, target.text);
  }
  convertSelection(editor) {
    this.resolveSelection(editor, (e, target) => {
      const inTable = inTableCell(editor.getValue(), editor.posToOffset(target.from));
      editor.replaceRange(this.buildLink(e, inTable), target.from, target.to);
    });
  }
  openSelection(editor) {
    this.resolveSelection(editor, (e) => this.openEntry(e));
  }
  scanRootStatus() {
    const root = this.codeRoot();
    return splitLines(this.settings.scanRoots).map((rel) => ({
      rel,
      exists: !!root && fs.existsSync(nodePath.join(root, rel))
    }));
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
Object.assign(CodeLinkerPlugin.prototype, api);
module.exports = CodeLinkerPlugin;
