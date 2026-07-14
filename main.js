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
      // {jetbrainsProduct} resolves to the chosen JetBrains IDE (the "JetBrains IDE" setting).
      jetbrains: "jetbrains://{jetbrainsProduct}/navigate/reference?project={project}&path={path}:{line}",
      // {root} is left in the note and resolved to the absolute code root on click,
      // so the link text stays portable across machines.
      file: "file:///{root}/{path}",
      // Web permalinks: {gitRemote}/{gitSha} come from the file's git repo at insert time,
      // pinning the link to that exact commit. GitLab serves blobs under /-/blob.
      github: "{gitRemote}/blob/{gitSha}/{path}#L{line}",
      gitlab: "{gitRemote}/-/blob/{gitSha}/{path}#L{line}"
    };
    var PRISM_LANG2 = {
      csharp: "csharp",
      typescript: "typescript",
      javascript: "javascript",
      python: "python",
      java: "java",
      cpp: "cpp",
      php: "php",
      go: "go",
      rust: "rust"
    };
    var JETBRAINS_PRODUCTS2 = [
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
      hiddenPresets: ["github", "gitlab"],
      // presets kept out of the pickers; revealed on first run if the remote matches
      presetsInitialized: false,
      // whether the one-time preset reveal has run
      recentPresets: [],
      // preset keys, most-recent first, to float recent picks up the picker
      askOnInsert: true,
      // ask which editor format to use on every insert (vs. a fixed preset)
      showStatusBar: false,
      // show the active editor preset in the status bar, click to switch
      enabledLanguages: null,
      // null on first run => every built-in enabled
      languagesFile: "code-languages.json",
      // vault-relative JSON of extra/override languages
      disabledKinds: [],
      // "<langId>:<kind>" keys hidden from suggestions (query-time filter)
      autoRefresh: true,
      // watch scan folders and rebuild the index when code changes
      hoverPreview: true,
      // show the file-snippet popover when hovering a code link
      hoverBefore: 3,
      // preview lines shown above the target line
      hoverAfter: 20,
      // preview lines shown below the target line
      markStaleLinks: true,
      // underline links whose stored line has drifted from the code
      minChars: 1,
      maxResults: 12,
      maxFileSizeKb: 2048,
      // 0 = no limit; larger files are indexed by name only, not parsed
      contextMenu: true
      // the "Convert"/"Find and open" items in the editor right-click menu
    };
    var splitLines2 = (s) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);
    function parseSkip2(skipDirs) {
      const names = /* @__PURE__ */ new Set();
      const paths = /* @__PURE__ */ new Set();
      for (const raw of splitLines2(skipDirs)) {
        const s = raw.split("\\").join("/").replace(/^\.?\//, "").replace(/\/+$/, "");
        if (!s)
          continue;
        if (s.includes("/"))
          paths.add(s);
        else
          names.add(s);
      }
      return { names, paths };
    }
    function underSkip2(rel, skip) {
      const segs = rel.split("/").filter(Boolean);
      for (const s of segs)
        if (skip.names.has(s))
          return true;
      if (skip.paths.size) {
        let acc = "";
        for (const seg of segs) {
          acc = acc ? acc + "/" + seg : seg;
          if (skip.paths.has(acc))
            return true;
        }
      }
      return false;
    }
    var LANGUAGES_TEMPLATE2 = `[
  {
    "id": "kotlin",
    "name": "Kotlin",
    "prism": "kotlin",
    "extensions": [".kt", ".kts"],
    "patterns": [
      { "re": "^\\\\s*(?:(?:public|private|internal|open|abstract|sealed|data)\\\\s+)*(class|interface|object)\\\\s+([A-Za-z_]\\\\w*)", "kindGroup": 1, "nameGroup": 2 },
      { "re": "^\\\\s*(?:(?:public|private|internal|override|suspend|inline)\\\\s+)*fun\\\\s+([A-Za-z_]\\\\w*)", "kind": "fn", "nameGroup": 1 }
    ]
  }
]
`;
    var LINK_PATTERN = "\\[([^\\]]*)\\]\\(([^)]+)\\)";
    var linkRegex2 = () => new RegExp(LINK_PATTERN, "g");
    var isFenceLine = (line) => {
      const s = line.trimStart();
      return s.startsWith("```") || s.startsWith("~~~");
    };
    var INLINE_CODE = /`[^`\n]+`/g;
    var inInlineCode = (line, col) => inMatch(line, col, INLINE_CODE);
    function inMatch(line, col, re) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        if (col > m.index && col < m.index + m[0].length)
          return true;
      }
      return false;
    }
    function pathInTarget2(dec, p) {
      let from = 0, i;
      while ((i = dec.indexOf(p, from)) !== -1) {
        if (i === 0 || dec[i - 1] === "/")
          return true;
        from = i + 1;
      }
      return false;
    }
    function locate(lines, pos) {
      let start = 0, i = 0;
      for (; i < lines.length; i++) {
        if (pos <= start + lines[i].length)
          break;
        start += lines[i].length + 1;
      }
      return { i, col: pos - start, line: lines[i] || "" };
    }
    function inCode2(text, pos) {
      if (/^---\r?\n/.test(text)) {
        const end = text.indexOf("\n---", 3);
        if (end !== -1 && pos <= end + 4)
          return true;
      }
      const lines = text.split("\n");
      const { i, col, line } = locate(lines, pos);
      let fenced = false;
      for (let k = 0; k < i; k++)
        if (isFenceLine(lines[k]))
          fenced = !fenced;
      if (fenced)
        return true;
      return inMatch(line, col, INLINE_CODE);
    }
    function inLink2(text, pos) {
      const { col, line } = locate(text.split("\n"), pos);
      return inMatch(line, col, linkRegex2());
    }
    function isProtected(text, pos) {
      return inCode2(text, pos) || inLink2(text, pos);
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
    module2.exports = { PRESETS: PRESETS2, PRISM_LANG: PRISM_LANG2, JETBRAINS_PRODUCTS: JETBRAINS_PRODUCTS2, DEFAULT_SETTINGS: DEFAULT_SETTINGS2, LANGUAGES_TEMPLATE: LANGUAGES_TEMPLATE2, splitLines: splitLines2, parseSkip: parseSkip2, underSkip: underSkip2, pathInTarget: pathInTarget2, isProtected, inCode: inCode2, inLink: inLink2, inInlineCode, isFenceLine, linkRegex: linkRegex2, inTableCell: inTableCell2 };
  }
});

// src/git.js
var require_git = __commonJS({
  "src/git.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs");
    var nodePath2 = require("path");
    function resolveGit2(absFile) {
      return repoFrom(nodePath2.dirname(absFile));
    }
    function resolveGitDir2(dir) {
      return repoFrom(dir);
    }
    function repoFrom(startDir) {
      const found = findGitDir(startDir);
      if (!found)
        return null;
      const head = readHead(found.gitDir);
      if (!head)
        return null;
      const remote = readRemote(found.gitDir);
      if (!remote)
        return null;
      return { remote, sha: head.sha, branch: head.branch, repoRoot: found.repoRoot };
    }
    function findGitDir(startDir) {
      let dir = startDir;
      for (; ; ) {
        const dotGit = nodePath2.join(dir, ".git");
        let st;
        try {
          st = fs2.statSync(dotGit);
        } catch (e) {
          st = null;
        }
        if (st && st.isDirectory())
          return { repoRoot: dir, gitDir: dotGit };
        if (st) {
          const m = readText(dotGit).match(/^gitdir:\s*(.+)$/m);
          if (m) {
            const p = m[1].trim();
            return { repoRoot: dir, gitDir: nodePath2.isAbsolute(p) ? p : nodePath2.resolve(dir, p) };
          }
        }
        const parent = nodePath2.dirname(dir);
        if (parent === dir)
          return null;
        dir = parent;
      }
    }
    function readHead(gitDir) {
      const head = readText(nodePath2.join(gitDir, "HEAD")).trim();
      const ref = head.match(/^ref:\s*(.+)$/);
      if (!ref)
        return /^[0-9a-f]{40}$/i.test(head) ? { sha: head, branch: null } : null;
      const refName = ref[1].trim();
      const sha = readRef(gitDir, refName);
      if (!sha)
        return null;
      return { sha, branch: refName.startsWith("refs/heads/") ? refName.slice("refs/heads/".length) : null };
    }
    function readRef(gitDir, refName) {
      const dirs = [gitDir];
      const common = readText(nodePath2.join(gitDir, "commondir")).trim();
      if (common)
        dirs.push(nodePath2.resolve(gitDir, common));
      for (const d of dirs) {
        const loose = readText(nodePath2.join(d, refName)).trim();
        if (/^[0-9a-f]{40}$/i.test(loose))
          return loose;
        for (const line of readText(nodePath2.join(d, "packed-refs")).split("\n")) {
          const m = line.match(/^([0-9a-f]{40})\s+(.+)$/);
          if (m && m[2].trim() === refName)
            return m[1];
        }
      }
      return null;
    }
    function readRemote(gitDir) {
      const config = readText(nodePath2.join(gitDir, "config"));
      let section = "", origin = "", fallback = "";
      for (const raw of config.split("\n")) {
        const line = raw.trim();
        const sec = line.match(/^\[(.+?)\]$/);
        if (sec) {
          section = sec[1].trim();
          continue;
        }
        const kv = line.match(/^url\s*=\s*(.+)$/);
        if (!kv || !/^remote\b/.test(section))
          continue;
        if (/^remote\s+"origin"$/.test(section))
          origin = kv[1].trim();
        else if (!fallback)
          fallback = kv[1].trim();
      }
      return normalizeRemote(origin || fallback);
    }
    function normalizeRemote(url) {
      let s = (url || "").trim();
      if (!s)
        return null;
      const scp = s.match(/^[^/@]+@([^:]+):(.+)$/);
      if (scp)
        s = "https://" + scp[1] + "/" + scp[2];
      else
        s = s.replace(/^(?:ssh|git|http):\/\//i, "https://");
      s = s.replace(/^(https:\/\/)[^/@]+@/i, "$1");
      s = s.replace(/\.git$/i, "").replace(/\/+$/, "");
      return /^https:\/\/[^/]+\/.+/.test(s) ? s : null;
    }
    function readText(path) {
      try {
        return fs2.readFileSync(path, "utf8");
      } catch (e) {
        return "";
      }
    }
    module2.exports = { resolveGit: resolveGit2, resolveGitDir: resolveGitDir2, normalizeRemote };
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
        },
        {
          re: "^\\s*(?:\\[[^\\]]*\\]\\s*)*(?:(?:public|private|protected|internal|static|virtual|override|abstract|sealed|async|extern|unsafe|new|partial|readonly|volatile|required|file)\\s+)*(?!(?:public|private|protected|internal|static|virtual|override|abstract|sealed|async|extern|unsafe|new|partial|readonly|volatile|required|file|const|if|else|for|foreach|while|do|switch|case|catch|try|finally|return|throw|yield|await|using|lock|fixed|checked|unchecked|goto|break|continue|in|is|as|class|struct|interface|enum|record|namespace|delegate|event|where|get|set|add|remove|when|select|from|orderby|group|let|var|typeof|nameof|sizeof|default|stackalloc)\\b)[A-Za-z_][\\w.]*(?:<(?:[^<>()]|<[^<>()]*>)*>)?(?:\\[\\s*,*\\s*\\])?\\??\\s+([A-Za-z_]\\w*)\\s*(?:<(?:[^<>()]|<[^<>()]*>)*>)?\\s*\\(",
          kind: "method",
          nameGroup: 1
        },
        {
          re: "^\\s*(?:\\[[^\\]]*\\]\\s*)*(?:(?:public|private|protected|internal|static|virtual|override|abstract|sealed|async|extern|unsafe|new|partial|readonly|volatile|required|file)\\s+)*(?!(?:public|private|protected|internal|static|virtual|override|abstract|sealed|async|extern|unsafe|new|partial|readonly|volatile|required|file|const|if|else|for|foreach|while|do|switch|case|catch|try|finally|return|throw|yield|await|using|lock|fixed|checked|unchecked|goto|break|continue|in|is|as|class|struct|interface|enum|record|namespace|delegate|event|where|get|set|add|remove|when|select|from|orderby|group|let|var|typeof|nameof|sizeof|default|stackalloc)\\b)[A-Za-z_][\\w.]*(?:<(?:[^<>()]|<[^<>()]*>)*>)?(?:\\[\\s*,*\\s*\\])?\\??\\s+([A-Za-z_]\\w*)\\s*(?:\\{|=>)",
          kind: "property",
          nameGroup: 1
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
          re: "^\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)",
          kind: "function",
          nameGroup: 1
        },
        {
          re: "^\\s*(?:export\\s+)?(?:default\\s+)?(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*(?::\\s*[^=;]+)?=\\s*(?:async\\s+)?(?:function\\b|(?:<[^>]*>\\s*)?\\(?[A-Za-z_$)][^=;]*=>)",
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
          re: "^\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)",
          kind: "function",
          nameGroup: 1
        },
        {
          re: "^\\s*(?:export\\s+)?(?:default\\s+)?(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:async\\s+)?(?:function\\b|\\(?[A-Za-z_$)][^=;]*=>)",
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

// languages/java.json
var require_java = __commonJS({
  "languages/java.json"(exports2, module2) {
    module2.exports = {
      id: "java",
      name: "Java",
      extensions: [".java"],
      patterns: [
        {
          re: "^\\s*(?:@[A-Za-z_][\\w.]*(?:\\([^)]*\\))?\\s+)*(?:(?:public|protected|private|abstract|final|static|sealed|non-sealed|strictfp)\\s+)*(class|interface|enum|record)\\s+([A-Za-z_$][\\w$]*)",
          kindGroup: 1,
          nameGroup: 2
        },
        {
          re: "^\\s*(?:@[A-Za-z_][\\w.]*(?:\\([^)]*\\))?\\s+)*(?:(?:public|private|protected|static|final|abstract|synchronized|native|strictfp|default)\\s+)*(?:<(?:[^<>()]|<[^<>()]*>)*>\\s*)?(?!(?:public|private|protected|static|final|abstract|synchronized|native|strictfp|default|if|else|for|while|do|switch|case|catch|try|finally|return|throw|new|instanceof|class|interface|enum|record|extends|implements|super|this|assert|yield|break|continue|import|package)\\b)[A-Za-z_][\\w.]*(?:<(?:[^<>()]|<[^<>()]*>)*>)?(?:\\[\\s*\\])*\\s+([A-Za-z_]\\w*)\\s*\\(",
          kind: "method",
          nameGroup: 1
        }
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
      extensions: [".c", ".h", ".hpp", ".hh", ".cpp", ".cc", ".cxx"],
      patterns: [
        {
          re: "^\\s*(?:template\\s*<[^>]*>\\s*)?(class|struct|enum)\\s+([A-Za-z_]\\w*)",
          kindGroup: 1,
          nameGroup: 2
        },
        {
          re: "^\\s*(?:(?:static|inline|virtual|explicit|friend|constexpr|consteval|constinit|extern|const|volatile|register|mutable|thread_local)\\s+)*(?!(?:static|inline|virtual|explicit|friend|constexpr|consteval|constinit|extern|const|volatile|register|mutable|thread_local|if|else|for|while|do|switch|case|catch|return|throw|new|delete|sizeof|typedef|using|namespace|template|class|struct|union|enum|public|private|protected|goto|break|continue|static_assert|decltype|co_return|co_await|co_yield)\\b)(?:(?:unsigned|signed|long|short|const|volatile|struct|enum|union)\\s+)*[A-Za-z_]\\w*(?:\\s*::\\s*[A-Za-z_]\\w*)*(?:<(?:[^<>()]|<[^<>()]*>)*>)?(?:\\s*[*&]+|\\s+)\\s*(?:[A-Za-z_]\\w*\\s*::\\s*)*(~?[A-Za-z_]\\w*)\\s*\\(",
          kind: "function",
          nameGroup: 1
        }
      ]
    };
  }
});

// languages/php.json
var require_php = __commonJS({
  "languages/php.json"(exports2, module2) {
    module2.exports = {
      id: "php",
      name: "PHP",
      extensions: [".php"],
      patterns: [
        {
          re: "^\\s*(?:(?:abstract|final|readonly)\\s+)*(class|interface|trait|enum)\\s+([A-Za-z_]\\w*)",
          kindGroup: 1,
          nameGroup: 2
        },
        {
          re: "^\\s*(?:(?:public|protected|private|static|abstract|final)\\s+)*function\\s+&?\\s*([A-Za-z_]\\w*)",
          kind: "function",
          nameGroup: 1
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

// languages/rust.json
var require_rust = __commonJS({
  "languages/rust.json"(exports2, module2) {
    module2.exports = {
      id: "rust",
      name: "Rust",
      extensions: [".rs"],
      patterns: [
        {
          re: "^\\s*(?:pub(?:\\([^)]*\\))?\\s+)?(struct|enum|trait|type|union)\\s+([A-Za-z_]\\w*)",
          kindGroup: 1,
          nameGroup: 2
        },
        {
          re: '^\\s*(?:pub(?:\\([^)]*\\))?\\s+)?(?:const\\s+|async\\s+|unsafe\\s+|extern\\s+(?:"[^"]*"\\s+)?)*fn\\s+([A-Za-z_]\\w*)',
          kind: "fn",
          nameGroup: 1
        }
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
      require_java(),
      require_cpp(),
      require_php(),
      require_go(),
      require_rust()
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
        if (!/^[\w.:]*$/.test(query))
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
        const f = this.plugin.parseQuery(ctx.query);
        const pass = (e) => !hidden.has(e.lang + ":" + e.kind) && this.plugin.entryPassesFilter(e, f);
        if (!f.name) {
          const out = [];
          for (const e of idx) {
            if (!pass(e))
              continue;
            out.push(e);
            if (out.length >= max)
              break;
          }
          return out;
        }
        const match = prepareFuzzySearch(f.name);
        const scored = [];
        for (const e of idx) {
          if (!pass(e))
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
        const insert = (template) => {
          const link = this.plugin.buildLink(e, inTable, template);
          ctx.editor.replaceRange(link, ctx.start, ctx.end);
          const pos = ctx.editor.posToOffset(ctx.start) + link.length;
          ctx.editor.setCursor(ctx.editor.offsetToPos(pos));
        };
        this.plugin.withFormat(this.plugin.settings.askOnInsert, insert);
      }
    };
    module2.exports = { CodeIndexSuggest: CodeIndexSuggest2 };
  }
});

// src/filter.js
var require_filter = __commonJS({
  "src/filter.js"(exports2, module2) {
    "use strict";
    function parseQuery(raw, resolveLang, kinds) {
      const f = { lang: null, kind: null, container: null, name: "" };
      const parts = String(raw == null ? "" : raw).split(":");
      let i = 0;
      for (; i < parts.length - 1; i++) {
        const id = resolveLang(parts[i]);
        if (id)
          f.lang = id;
        else if (kinds.has(parts[i]))
          f.kind = parts[i];
        else
          break;
      }
      const segs = parts.slice(i).join(":").split(".");
      f.name = segs[segs.length - 1];
      if (segs.length > 1 && segs[segs.length - 2])
        f.container = segs[segs.length - 2];
      return f;
    }
    module2.exports = { parseQuery };
  }
});

// src/render.js
var require_render = __commonJS({
  "src/render.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs");
    var readline2 = require("readline");
    var { loadPrism } = require("obsidian");
    var MAX_LINE = 400;
    var PRISM_MAX_LINES = 5e3;
    function readLines(absPath, from, to) {
      return new Promise((resolve) => {
        from = Math.max(1, from);
        const lines = [];
        let i = 0;
        let binary = false;
        let stream;
        try {
          stream = fs2.createReadStream(absPath, { encoding: "utf8" });
        } catch (e) {
          resolve(null);
          return;
        }
        const rl = readline2.createInterface({ input: stream, crlfDelay: Infinity });
        const stop = () => {
          try {
            rl.close();
          } catch (e) {
          }
          stream.destroy();
        };
        rl.on("line", (text) => {
          i++;
          if (i < from)
            return;
          if (i > to) {
            stop();
            return;
          }
          if (/[\x00-\x08\x0E-\x1F]/.test(text)) {
            binary = true;
            stop();
            return;
          }
          lines.push(text.length > MAX_LINE ? text.slice(0, MAX_LINE) + "\u2026" : text);
        });
        rl.on("close", () => resolve(binary || !lines.length ? null : { startLine: from, lines }));
        rl.on("error", () => resolve(null));
        stream.on("error", () => resolve(null));
      });
    }
    function renderTokens(parent, tokens) {
      for (const tok of tokens) {
        if (typeof tok === "string") {
          parent.appendText(tok);
          continue;
        }
        const aliases = Array.isArray(tok.alias) ? tok.alias.join(" ") : tok.alias || "";
        const span = parent.createSpan({ cls: ("token " + tok.type + " " + aliases).trim() });
        if (typeof tok.content === "string")
          span.setText(tok.content);
        else
          renderTokens(span, Array.isArray(tok.content) ? tok.content : [tok.content]);
      }
    }
    var prismPromise = null;
    function ensurePrism() {
      if (!prismPromise)
        prismPromise = loadPrism().catch(() => null);
      return prismPromise;
    }
    function prismGrammar(P, prismId) {
      if (!P || !P.languages)
        return null;
      return prismId && P.languages[prismId] || P.languages.clike || null;
    }
    async function renderCode(parent, text, prismId) {
      const P = text.split("\n").length <= PRISM_MAX_LINES ? await ensurePrism() : null;
      const grammar = prismGrammar(P, prismId);
      const pre = parent.createEl("pre");
      const code = pre.createEl("code");
      if (grammar)
        renderTokens(code, P.tokenize(text, grammar));
      else
        code.setText(text);
    }
    module2.exports = { readLines, renderCode };
  }
});

// src/hover.js
var require_hover = __commonJS({
  "src/hover.js"(exports2, module2) {
    "use strict";
    var nodePath2 = require("path");
    var { readLines, renderCode } = require_render();
    var SHOW_DELAY = 200;
    var HIDE_GRACE = 250;
    var keyOf = (e) => e.path + ":" + e.line;
    var HoverPreview2 = class {
      constructor(plugin) {
        this.plugin = plugin;
        this.el = null;
        this.timer = null;
        this.hideTimer = null;
        this.key = "";
        this.pendingKey = "";
      }
      ensureEl() {
        if (!this.el) {
          this.el = document.body.createDiv({ cls: "code-linker-hover code-linker-code code-linker-hidden" });
          this.el.addEventListener("mouseenter", () => this.cancelHide());
          this.el.addEventListener("mouseleave", () => this.leave());
        }
        return this.el;
      }
      isVisible() {
        return !!this.el && !this.el.classList.contains("code-linker-hidden");
      }
      contains(node) {
        return !!this.el && !!node && this.el.contains(node);
      }
      cancelHide() {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      schedule(entry, x, y) {
        this.cancelHide();
        const key = keyOf(entry);
        if (key === this.key && this.isVisible())
          return;
        if (key === this.pendingKey)
          return;
        this.pendingKey = key;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.pendingKey = "";
          this.show(entry, x, y);
        }, SHOW_DELAY);
      }
      leave() {
        if (this.hideTimer)
          return;
        this.hideTimer = setTimeout(() => this.hide(), HIDE_GRACE);
      }
      async show(entry, x, y) {
        const s = this.plugin.settings;
        const root = this.plugin.codeRoot();
        const abs = root ? nodePath2.join(root, entry.path) : entry.path;
        const line = entry.line || 1;
        const before = s.hoverBefore < 0 ? Infinity : Math.max(0, s.hoverBefore | 0);
        const after = s.hoverAfter < 0 ? Infinity : Math.max(0, s.hoverAfter | 0);
        const snippet = await readLines(abs, line - before, line + after);
        if (!snippet)
          return;
        this.key = keyOf(entry);
        const el = this.ensureEl();
        el.empty();
        el.createDiv({ cls: "code-linker-hover-header", text: keyOf(entry) });
        const body = el.createDiv({ cls: "code-linker-hover-body" });
        const idx = Math.min(Math.max(0, line - snippet.startLine), snippet.lines.length - 1);
        const band = body.createDiv({ cls: "code-linker-hover-band" });
        band.style.top = "calc(var(--cl-lh) * " + idx + ")";
        await renderCode(body, snippet.lines.join("\n"), this.plugin.prismIdFor(entry.lang));
        el.style.visibility = "hidden";
        el.style.left = "-9999px";
        el.style.top = "0px";
        el.removeClass("code-linker-hidden");
        body.scrollTop = Math.max(0, band.offsetTop - (body.clientHeight - band.offsetHeight) / 2);
        const r = el.getBoundingClientRect();
        const pad = 12;
        let left = x + pad;
        let top = y + pad;
        if (left + r.width > window.innerWidth - pad)
          left = Math.max(pad, x - pad - r.width);
        if (top + r.height > window.innerHeight - pad)
          top = Math.max(pad, y - pad - r.height);
        el.style.left = left + "px";
        el.style.top = top + "px";
        el.style.visibility = "visible";
      }
      hide() {
        clearTimeout(this.timer);
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
        this.pendingKey = "";
        this.key = "";
        if (this.el) {
          this.el.addClass("code-linker-hidden");
          this.el.empty();
        }
      }
      destroy() {
        clearTimeout(this.timer);
        clearTimeout(this.hideTimer);
        if (this.el) {
          this.el.remove();
          this.el = null;
        }
      }
    };
    module2.exports = { HoverPreview: HoverPreview2 };
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
      "cmd.insertLinkAs": "Insert code link as\u2026",
      "cmd.switchPreset": "Switch editor preset",
      "cmd.openFile": "Open code file",
      "cmd.copyLink": "Copy code link",
      "cmd.convertSelection": "Convert selection to code link",
      "cmd.openSelection": "Find and open code",
      "cmd.insertEmbed": "Insert code embed",
      "cmd.updateLinksNote": "Update code links in this note",
      "cmd.updateLinksVault": "Update code links in the whole vault",
      // Editor context menu
      "menu.convert": "Find and convert to link",
      "menu.copyLink": "Copy code link",
      "menu.fixLink": "Update this code link",
      // Notices
      "notice.noCodeRoot": "Code Linker: could not determine code root",
      "notice.noLanguages": "Code Linker: no languages enabled",
      "notice.scanFailed": "Code Linker: scan failed \u2014 {error}",
      "notice.indexed": "Code Linker: {entries} indexed",
      "notice.missingFolders": "Code Linker: scan folder not found \u2014 {folders}",
      "notice.copied": "Code Linker: link copied",
      "notice.noGit": "Code Linker: no git repository (with a remote) found for this file",
      "notice.editorSet": "Code Linker: links now open in {name}",
      "notice.noSelection": "Code Linker: select a name or path first",
      "notice.noMatch": "Code Linker: no code entry matches \u201C{query}\u201D",
      "notice.watchUnsupported": "Code Linker: auto-refresh is unavailable on this platform \u2014 rebuild manually",
      "notice.linksUpdated": "Code Linker: {n} link(s) updated",
      "notice.linksUpdatedVault": "Code Linker: {n} link(s) updated across {files} note(s)",
      "notice.langFileNoPath": "Code Linker: set a languages file path first",
      "notice.langFileExists": "Code Linker: the languages file already exists",
      "notice.langFileCreated": "Code Linker: created {path}",
      "notice.langFileError": "Code Linker: could not create the file \u2014 {error}",
      // Inline embeds
      "embed.empty": "Code Linker: empty embed \u2014 give a symbol name or a path:line",
      "embed.fmt.symbol": "Symbol \u2014 tracks the declaration as code moves",
      "embed.fmt.line": "Declaration line ({line})",
      "embed.fmt.range": "Line range ({from}-{to}, edit to taste)",
      "embed.menu.open": "Open code file",
      "embed.menu.refresh": "Refresh embed",
      "embed.notFound": "Code Linker: no code entry matches \u201C{query}\u201D",
      "embed.ambiguous": "Code Linker: {n} entries match \u201C{query}\u201D \u2014 add a language/kind filter (e.g. py:) or a path to pick one",
      "embed.unreadable": "Code Linker: can\u2019t read {path}",
      "embed.truncated": "Code Linker: showing the first {max} lines",
      // Status bar
      "status.indexing": "Code Linker: indexing\u2026 {n}",
      "status.editor": "Code link: {name}",
      "status.editorTooltip": "Code Linker: click to switch the editor links open in",
      // Command-palette modal
      "modal.searchPlaceholder": "Search code files and types\u2026",
      "modal.switchPlaceholder": "Choose the editor links open in\u2026",
      "modal.formatPlaceholder": "Choose an editor format for this link\u2026",
      "modal.productPlaceholder": "Choose a JetBrains IDE\u2026",
      "modal.embedPlaceholder": "Choose an embed format\u2026",
      // Settings — headings
      "set.heading.index": "Code index",
      "set.heading.languages": "Languages",
      "set.heading.customLanguages": "Custom languages",
      "set.heading.suggestions": "Suggestions & links",
      "set.heading.hover": "Hover preview",
      "set.heading.links": "Links",
      // Settings — code index
      "set.codeRoot.name": "Code root",
      "set.codeRoot.desc": "Base folder the scan paths are relative to. Empty = the folder containing this vault.",
      "set.scanFolders.name": "Scan folders",
      "set.scanFolders.desc": "Folders scanned for source files, relative to the code root. Leave empty to scan the whole code root.",
      "set.scanFolders.notFound": "\u26A0 Not found under the code root \u2014 {folders}",
      "set.folderList.add": "Add folder\u2026",
      "set.folderList.remove": "Remove",
      "set.folderList.addAria": "Add",
      "set.maxFileSize.name": "Max file size (KB)",
      "set.maxFileSize.desc": "Files larger than this are indexed by name only, not parsed for declarations. 0 = no limit.",
      "set.skipFolders.name": "Skip folders",
      "set.skipFolders.desc": "A bare name (node_modules) is skipped at any depth; a path with a slash (src/generated) skips only that folder, relative to the code root.",
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
      "set.customLanguages.desc": "Add your own languages, or override a built-in, from a JSON file in your vault. Set a path below and press Create to write a starter template, edit it, then save \u2014 it reloads on save. An entry whose id matches a built-in replaces it; a new id appears as a new language above.",
      "set.languagesFile.name": "Languages file",
      "set.languagesFile.desc": "Path to the JSON file, relative to your vault root.",
      "set.languagesFile.create": "Create file",
      "set.languagesFile.open": "Open the languages file",
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
      "set.preset.file": "file://",
      "set.preset.github": "GitHub permalink",
      "set.preset.gitlab": "GitLab permalink",
      "set.preset.ask": "Always ask",
      "set.jetbrainsProduct.name": "JetBrains IDE",
      "set.jetbrainsProduct.desc": "Which JetBrains IDE the links open in.",
      "set.shownPresets.name": "Shown in the picker",
      "set.shownPresets.count": "{shown} of {total} shown",
      "set.shownPresets.desc": "Which built-in presets appear in the pickers. Your own editors always appear.",
      "set.editors.name": "Your editors",
      "set.editors.count": "{n} added",
      "set.editors.collapse": "Collapse",
      "set.editors.expand": "Expand",
      "set.editors.desc": "Named presets for the dropdown above. Placeholders: {abs} {path} {line} {name} {project} {jetbrainsProduct} {root} {gitRemote} {gitSha} {gitBranch}.",
      "set.editors.namePlaceholder": "Name",
      "set.editors.remove": "Remove",
      "set.editors.add": "+ Add editor",
      "set.statusBar.name": "Show editor in status bar",
      "set.statusBar.desc": "Show the active editor preset in the status bar; click it to switch without opening settings.",
      "set.minChars.name": "Min characters",
      "set.minChars.desc": "How many characters to type before suggestions appear.",
      "set.maxResults.name": "Max results",
      "set.maxResults.desc": "Most suggestions to show at once.",
      "set.autoRefresh.name": "Auto-refresh index",
      "set.autoRefresh.desc": "Watch the scan folders and rebuild the index when source files change.",
      "set.autoRefresh.unsupported": "Recursive folder watching isn\u2019t supported on this platform (Linux); rebuild manually instead.",
      "set.contextMenu.name": "Editor context menu",
      "set.contextMenu.desc": "Add \u201CFind and convert to link\u201D and \u201CFind and open code\u201D to the editor right-click menu \u2014 plus \u201CCopy code link\u201D when you right-click a code link.",
      "set.hoverPreview.name": "Code preview on hover",
      "set.hoverPreview.desc": "Preview the file around a code link\u2019s line when you hover it. In live preview, hold Ctrl/Cmd; in reading view a plain hover is enough.",
      "set.hoverBefore.name": "Preview lines before",
      "set.hoverBefore.desc": "How many lines to show above the target line. -1 = no limit (to the start of the file).",
      "set.hoverAfter.name": "Preview lines after",
      "set.hoverAfter.desc": "How many lines to show below the target line. -1 = no limit (to the end of the file).",
      "set.markStaleLinks.name": "Mark stale links",
      "set.markStaleLinks.desc": "Underline code links whose stored line has drifted from the declaration (warning colour) or whose symbol is gone \u2014 renamed or removed (error colour). Run \u201CUpdate code links\u2026\u201D to fix drifted ones.",
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
      "cmd.insertLinkAs": "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434 \u043A\u0430\u043A\u2026",
      "cmd.switchPreset": "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0440\u0435\u0441\u0435\u0442 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0430",
      "cmd.openFile": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u0430\u0439\u043B \u043A\u043E\u0434\u0430",
      "cmd.copyLink": "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434",
      "cmd.convertSelection": "\u041F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0432 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434",
      "cmd.openSelection": "\u041D\u0430\u0439\u0442\u0438 \u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u043E\u0434",
      "cmd.insertEmbed": "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C embed \u043A\u043E\u0434\u0430",
      "cmd.updateLinksNote": "\u0410\u043A\u0442\u0443\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u043A\u043E\u0434 \u0432 \u044D\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0435",
      "cmd.updateLinksVault": "\u0410\u043A\u0442\u0443\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u043A\u043E\u0434 \u0432\u043E \u0432\u0441\u0451\u043C \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
      // Editor context menu
      "menu.convert": "\u041D\u0430\u0439\u0442\u0438 \u0438 \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432 \u0441\u0441\u044B\u043B\u043A\u0443",
      "menu.copyLink": "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434",
      "menu.fixLink": "\u0410\u043A\u0442\u0443\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u0443 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434",
      // Notices
      "notice.noCodeRoot": "Code Linker: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043A\u043E\u0440\u0435\u043D\u044C \u043A\u043E\u0434\u0430",
      "notice.noLanguages": "Code Linker: \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0451\u043D \u043D\u0438 \u043E\u0434\u0438\u043D \u044F\u0437\u044B\u043A",
      "notice.scanFailed": "Code Linker: \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u2014 {error}",
      "notice.indexed": "Code Linker: \u043F\u0440\u043E\u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043E {entries}",
      "notice.missingFolders": "Code Linker: \u043F\u0430\u043F\u043A\u0430 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u2014 {folders}",
      "notice.copied": "Code Linker: \u0441\u0441\u044B\u043B\u043A\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430",
      "notice.noGit": "Code Linker: \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0444\u0430\u0439\u043B\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D git-\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0441 remote",
      "notice.editorSet": "Code Linker: \u0441\u0441\u044B\u043B\u043A\u0438 \u0442\u0435\u043F\u0435\u0440\u044C \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432 {name}",
      "notice.noSelection": "Code Linker: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0438\u043C\u044F \u0438\u043B\u0438 \u043F\u0443\u0442\u044C",
      "notice.noMatch": "Code Linker: \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0438 \u043A\u043E\u0434\u0430 \u0434\u043B\u044F \xAB{query}\xBB",
      "notice.watchUnsupported": "Code Linker: \u0430\u0432\u0442\u043E\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043D\u0430 \u044D\u0442\u043E\u0439 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435 \u2014 \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
      "notice.linksUpdated": "Code Linker: \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0441\u0441\u044B\u043B\u043E\u043A \u2014 {n}",
      "notice.linksUpdatedVault": "Code Linker: \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0441\u0441\u044B\u043B\u043E\u043A \u2014 {n} \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445: {files}",
      "notice.langFileNoPath": "Code Linker: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u044C \u043A \u0444\u0430\u0439\u043B\u0443 \u044F\u0437\u044B\u043A\u043E\u0432",
      "notice.langFileExists": "Code Linker: \u0444\u0430\u0439\u043B \u044F\u0437\u044B\u043A\u043E\u0432 \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442",
      "notice.langFileCreated": "Code Linker: \u0441\u043E\u0437\u0434\u0430\u043D {path}",
      "notice.langFileError": "Code Linker: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0444\u0430\u0439\u043B \u2014 {error}",
      // Inline embeds
      "embed.empty": "Code Linker: \u043F\u0443\u0441\u0442\u043E\u0439 embed \u2014 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u043C\u044F \u0441\u0438\u043C\u0432\u043E\u043B\u0430 \u0438\u043B\u0438 \u043F\u0443\u0442\u044C:\u0441\u0442\u0440\u043E\u043A\u0443",
      "embed.fmt.symbol": "\u0421\u0438\u043C\u0432\u043E\u043B \u2014 \u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u0437\u0430 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u043F\u0440\u0438 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0438 \u043A\u043E\u0434\u0430",
      "embed.fmt.line": "\u0421\u0442\u0440\u043E\u043A\u0430 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F ({line})",
      "embed.fmt.range": "\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0441\u0442\u0440\u043E\u043A ({from}-{to}, \u043F\u043E\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043F\u043E \u0432\u043A\u0443\u0441\u0443)",
      "embed.menu.open": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u0430\u0439\u043B \u043A\u043E\u0434\u0430",
      "embed.menu.refresh": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C embed",
      "embed.notFound": "Code Linker: \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0438 \u043A\u043E\u0434\u0430 \u0434\u043B\u044F \xAB{query}\xBB",
      "embed.ambiguous": "Code Linker: \u043F\u043E\u0434 \xAB{query}\xBB \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439: {n} \u2014 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u043E\u043C \u044F\u0437\u044B\u043A\u0430/\u0442\u0438\u043F\u0430 (\u043D\u0430\u043F\u0440. py:) \u0438\u043B\u0438 \u043F\u0443\u0442\u0451\u043C",
      "embed.unreadable": "Code Linker: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C {path}",
      "embed.truncated": "Code Linker: \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043F\u0435\u0440\u0432\u044B\u0435 {max} \u0441\u0442\u0440\u043E\u043A",
      // Status bar
      "status.indexing": "Code Linker: \u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\u2026 {n}",
      "status.editor": "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u043A\u043E\u0434: {name}",
      "status.editorTooltip": "Code Linker: \u043A\u043B\u0438\u043A \u2014 \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440, \u0432 \u043A\u043E\u0442\u043E\u0440\u043E\u043C \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0441\u0441\u044B\u043B\u043A\u0438",
      // Command-palette modal
      "modal.searchPlaceholder": "\u041F\u043E\u0438\u0441\u043A \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 \u0442\u0438\u043F\u043E\u0432 \u043A\u043E\u0434\u0430\u2026",
      "modal.switchPlaceholder": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440, \u0432 \u043A\u043E\u0442\u043E\u0440\u043E\u043C \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0441\u0441\u044B\u043B\u043A\u0438\u2026",
      "modal.formatPlaceholder": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0430\u0442 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0430 \u0434\u043B\u044F \u044D\u0442\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u0438\u2026",
      "modal.productPlaceholder": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 IDE JetBrains\u2026",
      "modal.embedPlaceholder": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0430\u0442 embed\u2026",
      // Settings — headings
      "set.heading.index": "\u0418\u043D\u0434\u0435\u043A\u0441 \u043A\u043E\u0434\u0430",
      "set.heading.languages": "\u042F\u0437\u044B\u043A\u0438",
      "set.heading.customLanguages": "\u0421\u0432\u043E\u0438 \u044F\u0437\u044B\u043A\u0438",
      "set.heading.suggestions": "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u0438 \u0441\u0441\u044B\u043B\u043A\u0438",
      "set.heading.hover": "\u041F\u0440\u0435\u0432\u044C\u044E \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438",
      "set.heading.links": "\u0421\u0441\u044B\u043B\u043A\u0438",
      // Settings — code index
      "set.codeRoot.name": "\u041A\u043E\u0440\u0435\u043D\u044C \u043A\u043E\u0434\u0430",
      "set.codeRoot.desc": "\u0411\u0430\u0437\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430, \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u0437\u0430\u0434\u0430\u044E\u0442\u0441\u044F \u043F\u0443\u0442\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F. \u041F\u0443\u0441\u0442\u043E = \u043F\u0430\u043F\u043A\u0430, \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0449\u0430\u044F \u044D\u0442\u043E \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435.",
      "set.scanFolders.name": "\u041F\u0430\u043F\u043A\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F",
      "set.scanFolders.desc": "\u041F\u0430\u043F\u043A\u0438, \u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0435\u043C\u044B\u0435 \u043D\u0430 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B, \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043A\u043E\u0440\u043D\u044F \u043A\u043E\u0434\u0430. \u041E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u0443\u0441\u0442\u044B\u043C, \u0447\u0442\u043E\u0431\u044B \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0435\u0441\u044C \u043A\u043E\u0440\u0435\u043D\u044C \u043A\u043E\u0434\u0430.",
      "set.scanFolders.notFound": "\u26A0 \u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u043A\u043E\u0440\u043D\u0435 \u043A\u043E\u0434\u0430 \u2014 {folders}",
      "set.folderList.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443\u2026",
      "set.folderList.remove": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      "set.folderList.addAria": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C",
      "set.maxFileSize.name": "\u041C\u0430\u043A\u0441. \u0440\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 (\u041A\u0411)",
      "set.maxFileSize.desc": "\u0424\u0430\u0439\u043B\u044B \u043A\u0440\u0443\u043F\u043D\u0435\u0435 \u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u0438\u043C\u0435\u043D\u0438, \u0431\u0435\u0437 \u0440\u0430\u0437\u0431\u043E\u0440\u0430 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0439. 0 = \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F.",
      "set.skipFolders.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u043C\u044B\u0435 \u043F\u0430\u043F\u043A\u0438",
      "set.skipFolders.desc": "\u041F\u0440\u043E\u0441\u0442\u043E \u0438\u043C\u044F (node_modules) \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u043B\u044E\u0431\u043E\u0439 \u0433\u043B\u0443\u0431\u0438\u043D\u0435; \u043F\u0443\u0442\u044C \u0441\u043E \u0441\u043B\u044D\u0448\u0435\u043C (src/generated) \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u0443 \u043F\u0430\u043F\u043A\u0443 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043A\u043E\u0440\u043D\u044F \u043A\u043E\u0434\u0430.",
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
      "set.customLanguages.desc": "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0441\u0432\u043E\u0438 \u044F\u0437\u044B\u043A\u0438 \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u0447\u0435\u0440\u0435\u0437 JSON-\u0444\u0430\u0439\u043B \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435. \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u044C \u043D\u0438\u0436\u0435 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0444\u0430\u0439\u043B\xBB, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0442\u0430\u0440\u0442\u043E\u0432\u044B\u0439 \u0448\u0430\u0431\u043B\u043E\u043D, \u043E\u0442\u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u2014 \u043E\u043D \u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0441\u044F \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438. \u0417\u0430\u043F\u0438\u0441\u044C \u0441 id \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u043E\u0433\u043E \u044F\u0437\u044B\u043A\u0430 \u0437\u0430\u043C\u0435\u043D\u044F\u0435\u0442 \u0435\u0433\u043E; \u043D\u043E\u0432\u044B\u0439 id \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A\u0430\u043A \u043D\u043E\u0432\u044B\u0439 \u044F\u0437\u044B\u043A \u0432\u044B\u0448\u0435.",
      "set.languagesFile.name": "\u0424\u0430\u0439\u043B \u044F\u0437\u044B\u043A\u043E\u0432",
      "set.languagesFile.desc": "\u041F\u0443\u0442\u044C \u043A JSON-\u0444\u0430\u0439\u043B\u0443 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043A\u043E\u0440\u043D\u044F \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430.",
      "set.languagesFile.create": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0444\u0430\u0439\u043B",
      "set.languagesFile.open": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u0430\u0439\u043B \u044F\u0437\u044B\u043A\u043E\u0432",
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
      "set.preset.file": "file://",
      "set.preset.github": "\u041F\u0435\u0440\u043C\u0430\u043B\u0438\u043D\u043A GitHub",
      "set.preset.gitlab": "\u041F\u0435\u0440\u043C\u0430\u043B\u0438\u043D\u043A GitLab",
      "set.preset.ask": "\u0412\u0441\u0435\u0433\u0434\u0430 \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C",
      "set.jetbrainsProduct.name": "IDE JetBrains",
      "set.jetbrainsProduct.desc": "\u0412 \u043A\u0430\u043A\u043E\u0439 JetBrains IDE \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0441\u0441\u044B\u043B\u043A\u0438.",
      "set.shownPresets.name": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0432 \u0432\u044B\u0431\u043E\u0440\u0435",
      "set.shownPresets.count": "\u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E: {shown} \u0438\u0437 {total}",
      "set.shownPresets.desc": "\u041A\u0430\u043A\u0438\u0435 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0435 \u043F\u0440\u0435\u0441\u0435\u0442\u044B \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432 \u043F\u0438\u043A\u0435\u0440\u0430\u0445. \u0412\u0430\u0448\u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u044B \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432\u0441\u0435\u0433\u0434\u0430.",
      "set.editors.name": "\u0412\u0430\u0448\u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u044B",
      "set.editors.count": "\u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E: {n}",
      "set.editors.collapse": "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      "set.editors.expand": "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      "set.editors.desc": "\u0418\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043F\u0440\u0435\u0441\u0435\u0442\u044B \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0430 \u0432\u044B\u0448\u0435. \u041F\u043B\u0435\u0439\u0441\u0445\u043E\u043B\u0434\u0435\u0440\u044B: {abs} {path} {line} {name} {project} {jetbrainsProduct} {root} {gitRemote} {gitSha} {gitBranch}.",
      "set.editors.namePlaceholder": "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435",
      "set.editors.remove": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      "set.editors.add": "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440",
      "set.statusBar.name": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0432 \u0441\u0442\u0430\u0442\u0443\u0441-\u0431\u0430\u0440\u0435",
      "set.statusBar.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u043F\u0440\u0435\u0441\u0435\u0442 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0430 \u0432 \u0441\u0442\u0430\u0442\u0443\u0441-\u0431\u0430\u0440\u0435; \u043A\u043B\u0438\u043A \u043F\u043E \u043D\u0435\u043C\u0443 \u043C\u0435\u043D\u044F\u0435\u0442 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0431\u0435\u0437 \u0432\u0445\u043E\u0434\u0430 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438.",
      "set.minChars.name": "\u041C\u0438\u043D\u0438\u043C\u0443\u043C \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
      "set.minChars.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0432\u0432\u0435\u0441\u0442\u0438, \u043F\u0440\u0435\u0436\u0434\u0435 \u0447\u0435\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438.",
      "set.maxResults.name": "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432",
      "set.maxResults.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043E\u043A \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E.",
      "set.autoRefresh.name": "\u0410\u0432\u0442\u043E\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0438\u043D\u0434\u0435\u043A\u0441\u0430",
      "set.autoRefresh.desc": "\u0421\u043B\u0435\u0434\u0438\u0442\u044C \u0437\u0430 \u043F\u0430\u043F\u043A\u0430\u043C\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441 \u043F\u0440\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0438 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0445 \u0444\u0430\u0439\u043B\u043E\u0432.",
      "set.autoRefresh.unsupported": "\u0420\u0435\u043A\u0443\u0440\u0441\u0438\u0432\u043D\u043E\u0435 \u0441\u043B\u0435\u0436\u0435\u043D\u0438\u0435 \u0437\u0430 \u043F\u0430\u043F\u043A\u0430\u043C\u0438 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u044D\u0442\u043E\u0439 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435 (Linux); \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.",
      "set.contextMenu.name": "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u043E\u0435 \u043C\u0435\u043D\u044E \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0430",
      "set.contextMenu.desc": "\u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0442\u044C \xAB\u041D\u0430\u0439\u0442\u0438 \u0438 \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432 \u0441\u0441\u044B\u043B\u043A\u0443\xBB \u0438 \xAB\u041D\u0430\u0439\u0442\u0438 \u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u043E\u0434\xBB \u0432 \u043C\u0435\u043D\u044E \u043F\u043E \u043F\u0440\u0430\u0432\u043E\u043C\u0443 \u043A\u043B\u0438\u043A\u0443 \u2014 \u043F\u043B\u044E\u0441 \xAB\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u043E\u0434\xBB \u043F\u0440\u0438 \u043A\u043B\u0438\u043A\u0435 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435 \u0432 \u043A\u043E\u0434.",
      "set.hoverPreview.name": "\u041F\u0440\u0435\u0432\u044C\u044E \u043A\u043E\u0434\u0430 \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438",
      "set.hoverPreview.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0444\u0430\u0439\u043B\u0430 \u0432\u043E\u043A\u0440\u0443\u0433 \u0441\u0442\u0440\u043E\u043A\u0438 \u0441\u0441\u044B\u043B\u043A\u0438 \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438. \u0412 \u0440\u0435\u0436\u0438\u043C\u0435 live preview \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0439\u0442\u0435 Ctrl/Cmd; \u0432 \u0440\u0435\u0436\u0438\u043C\u0435 \u0447\u0442\u0435\u043D\u0438\u044F \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u043E\u0441\u0442\u043E\u0433\u043E \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u044F.",
      "set.hoverBefore.name": "\u0421\u0442\u0440\u043E\u043A \u043F\u0440\u0435\u0432\u044C\u044E \u0434\u043E",
      "set.hoverBefore.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0440\u043E\u043A \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043D\u0430\u0434 \u0446\u0435\u043B\u0435\u0432\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u043E\u0439. -1 = \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F (\u0434\u043E \u043D\u0430\u0447\u0430\u043B\u0430 \u0444\u0430\u0439\u043B\u0430).",
      "set.hoverAfter.name": "\u0421\u0442\u0440\u043E\u043A \u043F\u0440\u0435\u0432\u044C\u044E \u043F\u043E\u0441\u043B\u0435",
      "set.hoverAfter.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0440\u043E\u043A \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u043E\u0434 \u0446\u0435\u043B\u0435\u0432\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u043E\u0439. -1 = \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F (\u0434\u043E \u043A\u043E\u043D\u0446\u0430 \u0444\u0430\u0439\u043B\u0430).",
      "set.markStaleLinks.name": "\u041E\u0442\u043C\u0435\u0447\u0430\u0442\u044C \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0435 \u0441\u0441\u044B\u043B\u043A\u0438",
      "set.markStaleLinks.desc": "\u041F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u043A\u043E\u0434, \u0443 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430 \u0443\u0435\u0445\u0430\u043B\u0430 \u043E\u0442 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F (\u0446\u0432\u0435\u0442 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F) \u0438\u043B\u0438 \u0441\u0438\u043C\u0432\u043E\u043B \u043F\u0440\u043E\u043F\u0430\u043B \u2014 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0451\u043D (\u0446\u0432\u0435\u0442 \u043E\u0448\u0438\u0431\u043A\u0438). \u0423\u0435\u0445\u0430\u0432\u0448\u0438\u0435 \u0447\u0438\u043D\u044F\u0442\u0441\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 \xAB\u0410\u043A\u0442\u0443\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438\u2026\xBB.",
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

// src/embed.js
var require_embed = __commonJS({
  "src/embed.js"(exports2, module2) {
    "use strict";
    var { MarkdownRenderChild, Menu } = require("obsidian");
    var nodePath2 = require("path");
    var { readLines, renderCode } = require_render();
    var { t: t2 } = require_i18n();
    var EMBED_LANG = "code-link";
    var MAX_EMBED_LINES = 400;
    function parseSpec(source) {
      const spec = { target: "", context: "", lines: "", title: "" };
      for (const raw of source.split("\n")) {
        const line = raw.trim();
        if (!line)
          continue;
        const m = /^(context|lines|title)\s*:\s*(.*)$/i.exec(line);
        if (m)
          spec[m[1].toLowerCase()] = m[2].trim();
        else if (!spec.target)
          spec.target = line;
      }
      return spec;
    }
    var baseName = (p) => nodePath2.basename(p).replace(/\.[^.]+$/, "");
    var intOr = (v, def) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : def;
    };
    function splitRange(v) {
      const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec((v || "").trim());
      if (!m)
        return null;
      const a = parseInt(m[1], 10);
      const b = m[2] ? parseInt(m[2], 10) : a;
      return { from: Math.min(a, b), to: Math.max(a, b) };
    }
    function splitPathRange(t3) {
      const m = /^(.+?):(\d+)(?:-(\d+))?$/.exec(t3);
      if (!m)
        return null;
      const from = parseInt(m[2], 10);
      const to = m[3] ? parseInt(m[3], 10) : from;
      return { path: m[1], from: Math.min(from, to), to: Math.max(from, to), single: !m[3] };
    }
    var looksLikePath = (s) => s.includes("/") || s.includes("\\") || /\.[a-z0-9]+$/i.test(s);
    function langForPath(plugin, relPath) {
      const ext = nodePath2.extname(relPath).toLowerCase();
      const lang = plugin.languages.find((l) => l.extensions.includes(ext));
      return lang ? lang.id : "";
    }
    function resolvePath(plugin, relPath) {
      const norm = relPath.split("\\").join("/").replace(/^\.?\//, "");
      const hit = plugin.lookup(norm)[0];
      return hit ? hit.path : norm;
    }
    function build(plugin, relPath, langId, from, to, targetLine, name) {
      const root = plugin.codeRoot();
      const absPath = root ? nodePath2.join(root, relPath) : relPath;
      const requestedTo = to;
      to = Math.min(to, from + MAX_EMBED_LINES - 1);
      return {
        absPath,
        relPath,
        from,
        to,
        targetLine,
        truncated: to < requestedTo,
        prismId: langId ? plugin.prismIdFor(langId) : "",
        entry: { name: name || baseName(relPath), path: relPath, line: targetLine || from }
      };
    }
    function fromPath(plugin, spec, relPath, from, to, targetLine) {
      relPath = resolvePath(plugin, relPath);
      const ctx = intOr(spec.context, 0);
      const lr = splitRange(spec.lines);
      if (lr) {
        from = lr.from;
        to = lr.to;
        targetLine = null;
      }
      if (from == null) {
        from = 1;
        to = MAX_EMBED_LINES;
      }
      from = Math.max(1, from - ctx);
      to = to + ctx;
      return build(plugin, relPath, langForPath(plugin, relPath), from, to, targetLine, null);
    }
    function resolve(plugin, spec) {
      const target = spec.target;
      if (!target)
        return { error: t2("embed.empty") };
      const pr = splitPathRange(target);
      if (pr)
        return fromPath(plugin, spec, pr.path, pr.from, pr.to, pr.single ? pr.from : null);
      if (looksLikePath(target))
        return fromPath(plugin, spec, target, null, null, null);
      const f = plugin.parseQuery(target);
      const matches = plugin.entriesByName(f.name).filter((m) => plugin.entryPassesFilter(m, f));
      if (!matches.length)
        return { error: t2("embed.notFound", { query: target }) };
      const paths = new Set(matches.map((m) => m.path));
      if (paths.size > 1)
        return { error: t2("embed.ambiguous", { n: paths.size, query: target }) };
      const e = matches.find((m) => m.kind !== "file") || matches[0];
      const ctx = intOr(spec.context, 0);
      const lr = splitRange(spec.lines);
      const from = Math.max(1, (lr ? lr.from : e.line) - ctx);
      const to = (lr ? lr.to : e.line) + ctx;
      return build(plugin, e.path, e.lang, from, to, lr ? null : e.line, e.name);
    }
    var CodeEmbed = class extends MarkdownRenderChild {
      constructor(containerEl, plugin, spec) {
        super(containerEl);
        this.plugin = plugin;
        this.spec = spec;
        this.renderId = 0;
      }
      onload() {
        this.containerEl.addEventListener("contextmenu", (evt) => this.onContextMenu(evt));
        this.render();
        this.unsub = this.plugin.onIndexChange(() => this.render());
      }
      onunload() {
        if (this.unsub)
          this.unsub();
      }
      // Open the embedded file, honouring the editor-link preset (and the format picker
      // when "Always ask" is on) — the same path the open/insert commands use.
      open() {
        const e = this.res && this.res.entry;
        if (!e)
          return;
        this.plugin.withFormat(this.plugin.settings.askOnInsert, (tpl) => this.plugin.openEntry(e, tpl));
      }
      onContextMenu(evt) {
        const res = this.res;
        if (!res)
          return;
        evt.preventDefault();
        evt.stopPropagation();
        const menu = new Menu();
        if (res.entry)
          menu.addItem((i) => i.setTitle(t2("embed.menu.open")).setIcon("go-to-file").onClick(() => this.open()));
        menu.addItem((i) => i.setTitle(t2("embed.menu.refresh")).setIcon("refresh-cw").onClick(() => this.render(true)));
        menu.showAtMouseEvent(evt);
      }
      notice(cls, text) {
        this.containerEl.empty();
        this.containerEl.createDiv({ cls, text });
      }
      async render(force) {
        const el = this.containerEl;
        el.addClass("code-linker-embed", "code-linker-code");
        const token = ++this.renderId;
        const res = resolve(this.plugin, this.spec);
        this.res = res;
        const cached = res.relPath && this.plugin.fileCache.get(res.relPath);
        const mtime = cached ? cached.mtimeMs : null;
        const sig = res.error ? "err:" + res.error : res.absPath + "|" + res.from + "|" + res.to + "|" + res.targetLine + "|" + mtime;
        if (!force && sig === this.lastSig && (res.error || mtime != null))
          return;
        this.lastSig = sig;
        if (res.error) {
          this.notice("code-linker-embed-error", res.error);
          return;
        }
        const snippet = await readLines(res.absPath, res.from, res.to);
        if (token !== this.renderId)
          return;
        if (!snippet) {
          this.notice("code-linker-embed-error", t2("embed.unreadable", { path: res.relPath }));
          this.lastSig = null;
          return;
        }
        el.empty();
        const start = snippet.startLine;
        const end = start + snippet.lines.length - 1;
        const header = el.createDiv({ cls: "code-linker-embed-header mod-clickable" });
        header.createSpan({ text: this.spec.title || res.relPath + ":" + (start === end ? start : start + "-" + end) });
        header.addEventListener("click", () => this.open());
        const body = el.createDiv({ cls: "code-linker-embed-body" });
        if (res.targetLine != null) {
          const idx = res.targetLine - start;
          if (idx >= 0 && idx < snippet.lines.length) {
            const band = body.createDiv({ cls: "code-linker-embed-band" });
            band.style.top = "calc(var(--cl-lh) * " + idx + ")";
          }
        }
        await renderCode(body, snippet.lines.join("\n"), res.prismId);
        if (res.truncated)
          el.createDiv({ cls: "code-linker-embed-note", text: t2("embed.truncated", { max: MAX_EMBED_LINES }) });
      }
    };
    function registerEmbed2(plugin) {
      plugin.registerMarkdownCodeBlockProcessor(EMBED_LANG, (source, el, ctx) => {
        ctx.addChild(new CodeEmbed(el, plugin, parseSpec(source)));
      });
    }
    module2.exports = { registerEmbed: registerEmbed2 };
  }
});

// src/actualize.js
var require_actualize = __commonJS({
  "src/actualize.js"(exports2, module2) {
    "use strict";
    var { Notice: Notice2, MarkdownView: MarkdownView2 } = require("obsidian");
    var { ViewPlugin, Decoration } = require("@codemirror/view");
    var { RangeSetBuilder, StateEffect } = require("@codemirror/state");
    var { syntaxTree } = require("@codemirror/language");
    var { linkRegex: linkRegex2, isFenceLine, inInlineCode } = require_constants();
    var { t: t2 } = require_i18n();
    var LINE_RE = /:(\d+)(?=\D*$)/;
    var SKIP_NODE = /code|comment|frontmatter/i;
    function updateLinksInText(plugin, text) {
      const lines = text.split("\n");
      let fenced = false, count = 0;
      for (let i = 0; i < lines.length; i++) {
        if (isFenceLine(lines[i])) {
          fenced = !fenced;
          continue;
        }
        if (fenced)
          continue;
        lines[i] = lines[i].replace(linkRegex2(), (whole, name, target, offset) => {
          if (inInlineCode(lines[i], offset))
            return whole;
          const fixed = plugin.actualizedTarget(name, target);
          if (fixed == null)
            return whole;
          count++;
          return "[" + name + "](" + fixed + ")";
        });
      }
      return { text: lines.join("\n"), count };
    }
    var refreshEffect = StateEffect.define();
    function refreshStaleLinks(app) {
      app.workspace.iterateAllLeaves((leaf) => {
        const cm = leaf.view && leaf.view.editor && leaf.view.editor.cm;
        if (cm)
          cm.dispatch({ effects: refreshEffect.of(null) });
      });
    }
    function staleLinksExtension(plugin) {
      const marks = {
        stale: Decoration.mark({ class: "code-linker-stale" }),
        broken: Decoration.mark({ class: "code-linker-broken" })
      };
      const build = (view) => {
        const builder = new RangeSetBuilder();
        if (plugin.settings.markStaleLinks) {
          const tree = syntaxTree(view.state);
          for (const { from, to } of view.visibleRanges) {
            const text = view.state.doc.sliceString(from, to);
            const re = linkRegex2();
            let m;
            while (m = re.exec(text)) {
              const start = from + m.index;
              const end = start + m[0].length;
              let inCodeNode = false;
              tree.iterate({ from: start, to: end, enter: (n) => {
                if (SKIP_NODE.test(n.type.name))
                  inCodeNode = true;
              } });
              const state = inCodeNode ? null : plugin.linkState(m[1], m[2]);
              if (state)
                builder.add(start, end, marks[state]);
            }
          }
        }
        return builder.finish();
      };
      return ViewPlugin.fromClass(
        class {
          constructor(view) {
            this.decorations = build(view);
          }
          update(u) {
            const refresh = u.transactions.some((tr) => tr.effects.some((e) => e.is(refreshEffect)));
            if (u.docChanged || u.viewportChanged || refresh)
              this.decorations = build(u.view);
          }
        },
        { decorations: (v) => v.decorations }
      );
    }
    var methods = {
      // A stored link resolved to its live entry, or null when it can't be safely
      // actualized (no line, not a code link, or an ambiguous name in the file). Unlike
      // entryUnderPointer it never uses the stored line to disambiguate — that would hide
      // the very drift we're detecting.
      resolveStoredLink(name, target) {
        if (!name || !target)
          return null;
        const m = LINE_RE.exec(target);
        if (!m)
          return null;
        const storedLine = parseInt(m[1], 10);
        const { cand } = this.linkCandidates(name, target);
        const decls = cand.filter((e) => e.kind !== "file");
        let entry;
        if (decls.length === 1)
          entry = decls[0];
        else if (!decls.length && cand.length === 1)
          entry = cand[0];
        else
          return null;
        return { entry, storedLine, currentLine: entry.line };
      },
      isLinkStale(name, target) {
        const r = this.resolveStoredLink(name, target);
        return !!r && r.currentLine !== r.storedLine;
      },
      // Freshness of a code link for the visual marks: 'stale' (line drifted, fixable),
      // 'broken' (its file is still indexed but the symbol is gone — renamed or removed),
      // or null (current, ambiguous, not a code link, or unrelated — nothing to mark).
      linkState(name, target) {
        if (!name || !target)
          return null;
        if (!LINE_RE.test(target))
          return null;
        const r = this.resolveStoredLink(name, target);
        if (r)
          return r.currentLine === r.storedLine ? null : "stale";
        const { dec, cand } = this.linkCandidates(name, target);
        if (cand.length)
          return null;
        return this.targetIndexedFile(dec) ? "broken" : null;
      },
      // The link target with its line corrected to the current declaration, or null when
      // there's nothing to fix. Shared by the vault/note commands and the right-click fix.
      actualizedTarget(name, target) {
        const r = this.resolveStoredLink(name, target);
        if (!r || r.currentLine === r.storedLine)
          return null;
        return target.replace(LINE_RE, ":" + r.currentLine);
      },
      // Works in both edit and reading view: an open editor keeps cursor/undo, otherwise
      // the active file is rewritten through the vault.
      async updateLinksInActiveNote() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView2);
        const editor = view && view.editor;
        if (editor) {
          const { text: text2, count: count2 } = updateLinksInText(this, editor.getValue());
          if (count2) {
            const cur = editor.getCursor();
            editor.setValue(text2);
            editor.setCursor(cur);
          }
          new Notice2(t2("notice.linksUpdated", { n: count2 }));
          return;
        }
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice2(t2("notice.linksUpdated", { n: 0 }));
          return;
        }
        const { text, count } = updateLinksInText(this, await this.app.vault.read(file));
        if (count)
          await this.app.vault.modify(file, text);
        new Notice2(t2("notice.linksUpdated", { n: count }));
      },
      async updateLinksInVault() {
        let files = 0, total = 0;
        for (const f of this.app.vault.getMarkdownFiles()) {
          const src = await this.app.vault.read(f);
          const { text, count } = updateLinksInText(this, src);
          if (count) {
            await this.app.vault.modify(f, text);
            files++;
            total += count;
          }
        }
        new Notice2(t2("notice.linksUpdatedVault", { n: total, files }));
      }
    };
    module2.exports = { methods, staleLinksExtension, refreshStaleLinks };
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
    var PresetPickerModal2 = class extends FuzzySuggestModal {
      constructor(app, items, onChoose, placeholder) {
        super(app);
        this.items = items;
        this.onChoose = onChoose;
        if (placeholder)
          this.setPlaceholder(placeholder);
      }
      getItems() {
        return this.items;
      }
      getItemText(p) {
        return p.label;
      }
      onChooseItem(p) {
        this.onChoose(p);
      }
    };
    module2.exports = { CodeLinkModal: CodeLinkModal2, PresetPickerModal: PresetPickerModal2 };
  }
});

// src/folder-suggest.js
var require_folder_suggest = __commonJS({
  "src/folder-suggest.js"(exports2, module2) {
    "use strict";
    var obsidian = require("obsidian");
    var fs2 = require("fs");
    var nodePath2 = require("path");
    var { AbstractInputSuggest } = obsidian;
    var FolderSuggest = class extends AbstractInputSuggest {
      constructor(app, inputEl, getRoot, onSelect, getSeed) {
        super(app, inputEl);
        this.inputEl = inputEl;
        this.getRoot = getRoot;
        this.onSelect = onSelect;
        this.getSeed = getSeed;
      }
      // Immediate subdirectory names of an absolute dir, or [] if it can't be read.
      subdirs(dir) {
        try {
          return fs2.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
        } catch (e) {
          return [];
        }
      }
      getSuggestions(query) {
        const base = this.getRoot ? this.getRoot() : "";
        const q = query.replace(/\\/g, "/");
        const slash = q.lastIndexOf("/");
        const partial = (slash === -1 ? q : q.slice(slash + 1)).toLowerCase();
        const head = slash === -1 ? "" : q.slice(0, slash);
        let scanDir, prefix;
        if (base) {
          scanDir = nodePath2.join(base, head);
          prefix = head;
        } else if (slash === -1) {
          scanDir = this.getSeed ? this.getSeed() : "";
          prefix = scanDir;
        } else {
          scanDir = head.endsWith(":") ? head + "/" : head;
          prefix = head;
        }
        if (!scanDir)
          return [];
        const stem = prefix.replace(/\/+$/, "");
        return this.subdirs(scanDir).filter((name) => name.toLowerCase().includes(partial)).map((name) => stem ? stem + "/" + name : name).sort().slice(0, 50);
      }
      renderSuggestion(path, el) {
        el.setText(path);
      }
      selectSuggestion(path) {
        if (this.onSelect) {
          this.onSelect(path);
          this.setValue("");
          this.close();
          return;
        }
        this.setValue(path);
        this.inputEl.trigger("input");
        this.close();
      }
    };
    var folderSuggestAvailable = () => typeof AbstractInputSuggest === "function";
    module2.exports = { FolderSuggest, folderSuggestAvailable };
  }
});

// src/folder-list.js
var require_folder_list = __commonJS({
  "src/folder-list.js"(exports2, module2) {
    "use strict";
    var { Setting, setIcon } = require("obsidian");
    function renderFolderList(containerEl, opts) {
      const cls = opts.cls;
      const norm = opts.normalize || ((x) => x.trim());
      const read = () => (opts.get() || "").split("\n").map((x) => x.trim()).filter(Boolean);
      new Setting(containerEl).setName(opts.name).setDesc(opts.desc);
      const rowsEl = containerEl.createDiv({ cls: `${cls}-folder-rows` });
      const addEl = containerEl.createDiv({ cls: `${cls}-folder-add` });
      const commit = async (next) => {
        const seen = /* @__PURE__ */ new Set();
        const clean = [];
        for (const p of next) {
          const n = norm(p);
          if (n && !seen.has(n)) {
            seen.add(n);
            clean.push(n);
          }
        }
        await opts.set(clean.join("\n"));
        draw();
      };
      const draw = () => {
        rowsEl.empty();
        read().forEach((path, i) => {
          const row = new Setting(rowsEl).setName(path);
          row.settingEl.addClass(`${cls}-folder-row`);
          row.addExtraButton((b) => b.setIcon("x").setTooltip(opts.removeLabel || "").onClick(() => {
            const next = read();
            next.splice(i, 1);
            commit(next);
          }));
        });
      };
      const input = addEl.createEl("input", { type: "text", cls: `${cls}-folder-input`, attr: { placeholder: opts.placeholder || "" } });
      const addBtn = addEl.createEl("button", { cls: `${cls}-folder-addbtn`, attr: { "aria-label": opts.addLabel || "" } });
      setIcon(addBtn, "plus");
      const add = (raw) => {
        if (norm(raw))
          commit([...read(), raw]);
        input.value = "";
        input.focus();
      };
      if (opts.attachSuggest)
        opts.attachSuggest(input, add);
      addBtn.addEventListener("click", () => add(input.value));
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          add(input.value);
        }
      });
      draw();
    }
    module2.exports = { renderFolderList };
  }
});

// src/settings-tab.js
var require_settings_tab = __commonJS({
  "src/settings-tab.js"(exports2, module2) {
    "use strict";
    var { PluginSettingTab, Setting } = require("obsidian");
    var { PRESETS: PRESETS2, JETBRAINS_PRODUCTS: JETBRAINS_PRODUCTS2 } = require_constants();
    var { FolderSuggest, folderSuggestAvailable } = require_folder_suggest();
    var { renderFolderList } = require_folder_list();
    var { t: t2, plural: plural2 } = require_i18n();
    var normFolder = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "").trim();
    var CodeLinkerSettingTab2 = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.expanded = /* @__PURE__ */ new Set();
      }
      // The dropdown key for the active preset: 'ask' in always-ask mode, a built-in
      // preset, or 'u:<i>' for a user editor. Migration guarantees a template match.
      selectedEditor() {
        if (this.plugin.settings.askOnInsert)
          return "ask";
        const p = this.plugin.editorPresets().find((x) => x.template === this.plugin.settings.uriTemplate);
        return p ? p.key : "file";
      }
      // Whether the selected default's template uses a product placeholder (→ show the IDE dropdown).
      selectedUsesProduct() {
        const p = this.plugin.editorPresets().find((x) => x.key === this.selectedEditor());
        return !!p && this.plugin.usesProduct(p.template);
      }
      // Chevron toggle shared by the foldable sections (languages, presets, editors).
      foldButton(setting, open, onToggle) {
        setting.addExtraButton((b) => b.setIcon(open ? "chevron-up" : "chevron-down").setTooltip(open ? t2("set.editors.collapse") : t2("set.editors.expand")).onClick(onToggle));
      }
      // Update one editor's dropdown label as its name is typed, sparing a full re-render.
      refreshPresetOption(dropdown, i, name) {
        if (!dropdown)
          return;
        const opt = Array.from(dropdown.selectEl.options).find((o) => o.value === "u:" + i);
        if (opt)
          opt.text = name || `Editor ${i + 1}`;
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
        new Setting(containerEl).setName(t2("set.codeRoot.name")).setDesc(t2("set.codeRoot.desc")).addText((c) => {
          wide(c).setPlaceholder(this.plugin.codeRoot()).setValue(s.codeRoot).onChange(async (v) => {
            s.codeRoot = v.trim();
            await save(false);
          });
          if (folderSuggestAvailable())
            new FolderSuggest(this.app, c.inputEl, () => "", null, () => this.plugin.codeRoot());
        });
        const folderList = (name, desc, key) => renderFolderList(containerEl, {
          cls: "code-linker",
          name,
          desc,
          get: () => s[key],
          set: async (v) => {
            s[key] = v;
            await save(false);
          },
          normalize: normFolder,
          attachSuggest: folderSuggestAvailable() ? (inputEl, onPick) => new FolderSuggest(this.app, inputEl, () => this.plugin.codeRoot(), onPick) : null,
          placeholder: t2("set.folderList.add"),
          removeLabel: t2("set.folderList.remove"),
          addLabel: t2("set.folderList.addAria")
        });
        folderList(t2("set.scanFolders.name"), t2("set.scanFolders.desc"), "scanRoots");
        const missing = this.plugin.scanRootStatus().filter((x) => !x.exists).map((x) => x.rel);
        if (missing.length) {
          containerEl.createEl("div", { cls: "code-linker-note is-error", text: t2("set.scanFolders.notFound", { folders: missing.join(", ") }) });
        }
        folderList(t2("set.skipFolders.name"), t2("set.skipFolders.desc"), "skipDirs");
        new Setting(containerEl).setName(t2("set.maxFileSize.name")).setDesc(t2("set.maxFileSize.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.setValue(String(s.maxFileSizeKb)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.maxFileSizeKb = Number.isFinite(n) && n >= 0 ? n : 2048;
            await save(false);
          });
          c.inputEl.addEventListener("blur", () => this.plugin.rebuildIndex(false));
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
        new Setting(containerEl).setName(t2("set.rebuild.name")).addButton((b) => b.setButtonText(t2("set.rebuild.button")).onClick(() => this.plugin.rebuildIndex(true).then(() => this.display())));
        const root = this.plugin.codeRoot() || t2("set.info.unknownRoot");
        containerEl.createEl("div", { cls: "code-linker-note", text: t2("set.info", { root, entries: plural2("entry", this.plugin.index.length) }) });
        if (this.showLanguages === void 0)
          this.showLanguages = false;
        const enabled = new Set(s.enabledLanguages || []);
        const enabledCount = this.plugin.languages.filter((l) => enabled.has(l.id)).length;
        const langHeading = new Setting(containerEl).setName(t2("set.heading.languages")).setDesc(t2("set.languages.desc", { enabled: enabledCount, total: this.plugin.languages.length })).setHeading();
        this.foldButton(langHeading, this.showLanguages, () => {
          this.showLanguages = !this.showLanguages;
          this.display();
        });
        if (this.showLanguages) {
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
        }
        for (const bad of this.plugin.languageErrors || []) {
          const row = new Setting(containerEl).setName(bad.id).setDesc(t2("set.lang.invalid", { error: bad.error }));
          row.settingEl.addClass("mod-warning");
        }
        new Setting(containerEl).setName(t2("set.heading.customLanguages")).setDesc(t2("set.customLanguages.desc")).setHeading();
        const langPath = this.plugin.languagesFilePath();
        const langFile = langPath ? this.app.vault.getAbstractFileByPath(langPath) : null;
        const langSetting = new Setting(containerEl).setName(t2("set.languagesFile.name")).setDesc(t2("set.languagesFile.desc")).addText((c) => {
          c.setValue(s.languagesFile).onChange(async (v) => {
            s.languagesFile = v.trim();
            await save(false);
          });
          c.inputEl.addEventListener("blur", () => this.display());
        });
        if (langFile) {
          langSetting.addExtraButton((b) => b.setIcon("pencil").setTooltip(t2("set.languagesFile.open")).onClick(() => this.plugin.openLanguagesFile()));
        } else {
          langSetting.addButton((b) => b.setButtonText(t2("set.languagesFile.create")).setCta().onClick(async () => {
            await this.plugin.createLanguagesFile();
            this.display();
          }));
        }
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
        new Setting(containerEl).setName(t2("set.minChars.name")).setDesc(t2("set.minChars.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.inputEl.min = "0";
          c.setValue(String(s.minChars)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.minChars = Number.isFinite(n) && n >= 0 ? n : 1;
            await save(false);
          });
        });
        new Setting(containerEl).setName(t2("set.maxResults.name")).setDesc(t2("set.maxResults.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.inputEl.min = "1";
          c.setValue(String(s.maxResults)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.maxResults = Number.isFinite(n) && n > 0 ? n : 12;
            await save(false);
          });
        });
        let presetDropdown;
        new Setting(containerEl).setName(t2("set.editorPreset.name")).setDesc(t2("set.editorPreset.desc")).addDropdown((d) => {
          presetDropdown = d;
          for (const p of this.plugin.editorPresets())
            d.addOption(p.key, p.label);
          d.addOption("ask", t2("set.preset.ask"));
          d.setValue(this.selectedEditor()).onChange(async (v) => {
            const hadProduct = this.selectedUsesProduct();
            s.askOnInsert = v === "ask";
            if (!s.askOnInsert) {
              const p = this.plugin.editorPresets().find((x) => x.key === v);
              if (p)
                s.uriTemplate = p.template;
            }
            await save(false);
            if (hadProduct !== this.selectedUsesProduct())
              this.display();
          });
        });
        if (this.selectedUsesProduct()) {
          new Setting(containerEl).setName(t2("set.jetbrainsProduct.name")).setDesc(t2("set.jetbrainsProduct.desc")).addDropdown((d) => {
            for (const [code, label] of JETBRAINS_PRODUCTS2)
              d.addOption(code, label);
            d.addOption("ask", t2("set.preset.ask"));
            d.setValue(s.jetbrainsProduct).onChange(async (v) => {
              s.jetbrainsProduct = v;
              await save(false);
            });
          });
        }
        if (this.showPresets === void 0)
          this.showPresets = false;
        const builtins = this.plugin.editorPresets().filter((p) => p.builtin);
        const hiddenPresets = new Set(s.hiddenPresets || []);
        const presetHeading = new Setting(containerEl).setName(t2("set.shownPresets.name")).setDesc(t2("set.shownPresets.count", { shown: builtins.length - hiddenPresets.size, total: builtins.length }));
        this.foldButton(presetHeading, this.showPresets, () => {
          this.showPresets = !this.showPresets;
          this.display();
        });
        if (this.showPresets) {
          containerEl.createEl("div", { cls: "code-linker-note", text: t2("set.shownPresets.desc") });
          for (const p of builtins) {
            const row = new Setting(containerEl).setName(p.label).addToggle((c) => c.setValue(!hiddenPresets.has(p.key)).onChange(async (v) => {
              const set = new Set(s.hiddenPresets || []);
              if (v)
                set.delete(p.key);
              else
                set.add(p.key);
              s.hiddenPresets = [...set];
              await save(false);
            }));
            row.settingEl.addClass("code-linker-kind-row");
          }
        }
        if (this.showEditors === void 0)
          this.showEditors = false;
        const editors = s.editors || [];
        const editorsHeading = new Setting(containerEl).setName(t2("set.editors.name")).setDesc(t2("set.editors.count", { n: editors.length }));
        this.foldButton(editorsHeading, this.showEditors, () => {
          this.showEditors = !this.showEditors;
          this.display();
        });
        if (this.showEditors) {
          editors.forEach((ed, i) => {
            const row = new Setting(containerEl).addText((c) => {
              c.inputEl.addClass("code-linker-editor-name");
              c.setPlaceholder(t2("set.editors.namePlaceholder")).setValue(ed.name).onChange(async (v) => {
                ed.name = v;
                this.refreshPresetOption(presetDropdown, i, v);
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
        new Setting(containerEl).setName(t2("set.statusBar.name")).setDesc(t2("set.statusBar.desc")).addToggle((c) => c.setValue(s.showStatusBar).onChange(async (v) => {
          s.showStatusBar = v;
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.contextMenu.name")).setDesc(t2("set.contextMenu.desc")).addToggle((c) => c.setValue(s.contextMenu).onChange(async (v) => {
          s.contextMenu = v;
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.heading.hover")).setHeading();
        new Setting(containerEl).setName(t2("set.hoverPreview.name")).setDesc(t2("set.hoverPreview.desc")).addToggle((c) => c.setValue(s.hoverPreview).onChange(async (v) => {
          s.hoverPreview = v;
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.hoverBefore.name")).setDesc(t2("set.hoverBefore.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.inputEl.min = "-1";
          c.setValue(String(s.hoverBefore)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.hoverBefore = Number.isFinite(n) ? Math.max(-1, n) : 3;
            await save(false);
          });
        });
        new Setting(containerEl).setName(t2("set.hoverAfter.name")).setDesc(t2("set.hoverAfter.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.inputEl.min = "-1";
          c.setValue(String(s.hoverAfter)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.hoverAfter = Number.isFinite(n) ? Math.max(-1, n) : 20;
            await save(false);
          });
        });
        new Setting(containerEl).setName(t2("set.heading.links")).setHeading();
        new Setting(containerEl).setName(t2("set.markStaleLinks.name")).setDesc(t2("set.markStaleLinks.desc")).addToggle((c) => c.setValue(s.markStaleLinks).onChange(async (v) => {
          s.markStaleLinks = v;
          await save(false);
        }));
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
var { Plugin, Notice, normalizePath, MarkdownView } = require("obsidian");
var { EditorView } = require("@codemirror/view");
var { Prec } = require("@codemirror/state");
var fs = require("fs");
var fsp = fs.promises;
var readline = require("readline");
var nodePath = require("path");
var { PRESETS, PRISM_LANG, JETBRAINS_PRODUCTS, DEFAULT_SETTINGS, LANGUAGES_TEMPLATE, splitLines, parseSkip, underSkip, pathInTarget, inTableCell, inCode, inLink, linkRegex } = require_constants();
var { resolveGit, resolveGitDir } = require_git();
var GIT_PLACEHOLDER = /{(?:gitRemote|gitSha|gitBranch)}/;
var PRODUCT_PLACEHOLDER = /{(?:jetbrainsProduct|product)}/;
var MAX_PARSE_LINE_LENGTH = 2e3;
var { BUILTIN_LANGUAGES } = require_builtin_languages();
var { CodeIndexSuggest } = require_suggest();
var filter = require_filter();
var { HoverPreview } = require_hover();
var { registerEmbed } = require_embed();
var actualize = require_actualize();
var { CodeLinkModal, PresetPickerModal } = require_modal();
var { CodeLinkerSettingTab } = require_settings_tab();
var { initI18n, t, plural } = require_i18n();
var api = require_api();
var CodeLinkerPlugin = class extends Plugin {
  async onload() {
    initI18n();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.setIndex([]);
    this.languages = [];
    this.languageErrors = [];
    this.customRaw = "";
    this.watchers = [];
    this.fileCache = /* @__PURE__ */ new Map();
    this.cacheSignature = "";
    this._indexListeners = /* @__PURE__ */ new Set();
    await this.loadLanguagesFile();
    this.migrateSettings();
    this.initPresetVisibility();
    await this.loadCache();
    this.api = this.buildApi();
    this.hover = new HoverPreview(this);
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
    registerEmbed(this);
    this.registerEditorExtension(actualize.staleLinksExtension(this));
    this.register(this.onIndexChange(() => this.refreshStale()));
    this.lastX = 0;
    this.lastY = 0;
    this.registerDomEvent(document, "mousemove", (evt) => this.onHoverMove(evt));
    this.registerDomEvent(document, "keydown", (evt) => {
      if (evt.key === "Control" || evt.key === "Meta")
        this.onHoverKey();
    });
    this.registerDomEvent(document, "scroll", (evt) => {
      if (!this.hover.contains(evt.target))
        this.hover.hide();
    }, { capture: true });
    this.registerDomEvent(window, "blur", () => this.hover.hide());
    this.registerDomEvent(document, "keyup", (evt) => {
      if (evt.key === "Escape")
        this.hover.hide();
    });
    this.addSettingTab(new CodeLinkerSettingTab(this.app, this));
    this.statusEl = this.addStatusBarItem();
    this.editorStatusEl = this.addStatusBarItem();
    this.editorStatusEl.addClass("mod-clickable");
    this.editorStatusEl.setAttribute("aria-label", t("status.editorTooltip"));
    this.registerDomEvent(this.editorStatusEl, "click", () => this.switchPreset());
    this.updateStatusBar();
    this.addCommand({ id: "rebuild-code-index", name: t("cmd.rebuildIndex"), callback: () => this.rebuildIndex(true) });
    this.addCommand({ id: "insert-code-link", name: t("cmd.insertLink"), editorCallback: (editor) => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.insertLink(editor, e, tpl))) });
    this.addCommand({ id: "insert-code-link-as", name: t("cmd.insertLinkAs"), editorCallback: (editor) => this.pickEntry((e) => this.withFormat(true, (tpl) => this.insertLink(editor, e, tpl))) });
    this.addCommand({ id: "switch-editor-preset", name: t("cmd.switchPreset"), callback: () => this.switchPreset() });
    this.addCommand({ id: "open-code-file", name: t("cmd.openFile"), callback: () => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.openEntry(e, tpl))) });
    this.addCommand({ id: "copy-code-link", name: t("cmd.copyLink"), callback: () => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.copyLink(e, tpl))) });
    this.addCommand({ id: "convert-selection-to-link", name: t("cmd.convertSelection"), editorCallback: (editor) => this.convertSelection(editor) });
    this.addCommand({ id: "open-selected-code", name: t("cmd.openSelection"), editorCallback: (editor) => this.openSelection(editor) });
    this.addCommand({ id: "insert-code-embed", name: t("cmd.insertEmbed"), editorCallback: (editor) => this.pickEntry((e) => this.insertEmbed(editor, e)) });
    this.addCommand({ id: "update-links-note", name: t("cmd.updateLinksNote"), callback: () => this.updateLinksInActiveNote() });
    this.addCommand({ id: "update-links-vault", name: t("cmd.updateLinksVault"), callback: () => this.updateLinksInVault() });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        if (!this.settings.contextMenu)
          return;
        if (this.selectionTarget(editor, true)) {
          menu.addItem((item) => item.setTitle(t("menu.convert")).setIcon("link").onClick(() => this.convertSelection(editor)));
        }
        if (this.selectionTarget(editor, false)) {
          menu.addItem((item) => item.setTitle(t("cmd.openSelection")).setIcon("file-search").onClick(() => this.openSelection(editor)));
        }
        const link = this.codeLinkAtCursor(editor);
        if (link && this.isCodeLink(link.name, link.target)) {
          menu.addItem((item) => item.setTitle(t("menu.copyLink")).setIcon("copy").onClick(() => this.copyLinkAtCursor(link)));
          if (this.isLinkStale(link.name, link.target)) {
            menu.addItem((item) => item.setTitle(t("menu.fixLink")).setIcon("wrench").onClick(() => this.fixLinkAtCursor(editor, link)));
          }
        }
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
    if (this.hover)
      this.hover.destroy();
  }
  migrateSettings() {
    if (this.settings.enabledLanguages == null) {
      this.settings.enabledLanguages = this.languages.map((l) => l.id);
    }
    this.settings.skipDirs = (this.settings.skipDirs || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).join("\n");
    if (this.settings.uriTemplate === "file:///{abs}")
      this.settings.uriTemplate = PRESETS.file;
    if (this.settings.uriTemplate === "jetbrains://{product}/navigate/reference?project={project}&path={path}:{line}") {
      this.settings.uriTemplate = PRESETS.jetbrains;
    }
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
    this.markStaleAnchors(el);
  }
  // Toggle the drifted/broken-link underline on every rendered anchor in `el`. toggle (not
  // add) so re-running after an index rebuild also clears links that are now current.
  markStaleAnchors(el) {
    const links = el.querySelectorAll ? el.querySelectorAll("a") : [];
    for (const a of links) {
      const state = this.settings.markStaleLinks ? this.linkState(a.textContent, a.getAttribute("href") || "") : null;
      a.classList.toggle("code-linker-stale", state === "stale");
      a.classList.toggle("code-linker-broken", state === "broken");
    }
  }
  // After an index rebuild, refresh stale marks in both render modes: the CM6 effect for
  // Live Preview, and a re-scan of rendered anchors for Reading view (its post-processor
  // doesn't re-run on its own).
  refreshStale() {
    actualize.refreshStaleLinks(this.app);
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (view && view.getViewType && view.getViewType() === "markdown" && view.containerEl) {
        this.markStaleAnchors(view.containerEl);
      }
    });
  }
  hoverEnabled() {
    return this.settings.hoverPreview;
  }
  // Pointer tracking that mirrors a real page preview. Rendered (Reading view) links
  // preview on plain hover; the editor (Live Preview) needs the modifier — same split
  // as native page preview. Idle in the editor (nothing shown, no modifier, not over a
  // rendered link) does no work beyond storing the position. While a preview is up it
  // follows the pointer so it stays until you leave the link (entering it keeps it).
  onHoverMove(evt) {
    this.lastX = evt.clientX;
    this.lastY = evt.clientY;
    if (!this.hoverEnabled())
      return;
    if (evt.buttons)
      return;
    const el = evt.target;
    if (this.hover.contains(el)) {
      this.hover.cancelHide();
      return;
    }
    const mod = evt.ctrlKey || evt.metaKey;
    const overAnchor = !!(el && el.closest && el.closest("a"));
    if (!this.hover.isVisible() && !this.hover.pendingKey && !mod && !overAnchor)
      return;
    const hit = this.entryAtPoint(el, evt.clientX, evt.clientY);
    if (hit && (!hit.requireMod || mod)) {
      this.hover.cancelHide();
      this.hover.schedule(hit.entry, evt.clientX, evt.clientY);
    } else if (this.hover.isVisible() || this.hover.pendingKey) {
      this.hover.leave();
    }
  }
  // Pressing the modifier while already hovering a link shows it — the other order
  // (modifier first, then move onto the link) is handled by onHoverMove.
  onHoverKey() {
    if (!this.hoverEnabled())
      return;
    const el = document.elementFromPoint(this.lastX, this.lastY);
    if (this.hover.contains(el))
      return;
    const hit = this.entryAtPoint(el, this.lastX, this.lastY);
    if (hit)
      this.hover.schedule(hit.entry, this.lastX, this.lastY);
  }
  // The code entry under a screen point as { entry, requireMod }, across both render
  // modes, or null. Reading view carries the URL on a rendered anchor and previews on
  // plain hover; Live Preview's CM6 link span has no href (recovered from the editor at
  // those coordinates) and requires the modifier, like a link in the editor natively.
  entryAtPoint(el, x, y) {
    if (!el || !el.closest)
      return null;
    const a = el.closest("a");
    if (a && !(a.classList && a.classList.contains("internal-link"))) {
      const entry = this.entryUnderPointer(a.textContent, a.getAttribute("href") || a.getAttribute("data-href") || "");
      if (entry)
        return { entry, requireMod: false };
    }
    if (el.closest(".cm-link")) {
      const view = typeof EditorView.findFromDOM === "function" ? EditorView.findFromDOM(el) : this.activeCm();
      const ref = view && this.codeRefAt(view, x, y);
      if (ref) {
        const entry = this.entryUnderPointer(ref.name, ref.target);
        if (entry)
          return { entry, requireMod: true };
      }
    }
    return null;
  }
  // The CM6 EditorView of the active Markdown editor, used as a fallback when
  // EditorView.findFromDOM isn't available to map a point to its editor.
  activeCm() {
    const mv = this.app.workspace.getActiveViewOfType(MarkdownView);
    return mv && mv.editor && mv.editor.cm;
  }
  // Resolve a hovered link's display name + target to an index entry, or null
  // (so non-code links — a wiki link, a web link, a custom Unity-scene link —
  // simply show nothing). The entry's relative path must appear in the target,
  // which every preset embeds via {path}/{abs}; that rejects unrelated links even
  // when their text matches a symbol name. Ties are broken by the line in the
  // target, preferring a declaration over the bare file entry.
  entryUnderPointer(name, target) {
    if (!name || !target)
      return null;
    const { dec, cand } = this.linkCandidates(name, target);
    if (cand.length <= 1)
      return cand[0] || null;
    const onLine = cand.find((e) => new RegExp("[:=]" + e.line + "(?:\\D|$)").test(dec));
    return onLine || cand.find((e) => e.kind !== "file") || cand[0];
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
  // The markdown link at screen coords in Live Preview, as { name, target }. The
  // rendered span has no href, so map the coords to a document position and read it.
  codeRefAt(view, x, y) {
    if (typeof view.posAtCoords !== "function")
      return null;
    const offset = view.posAtCoords({ x, y });
    if (offset == null)
      return null;
    const line = view.state.doc.lineAt(offset);
    const ch = offset - line.from;
    const re = linkRegex();
    let m;
    while (m = re.exec(line.text)) {
      if (ch < m.index || ch > m.index + m[0].length)
        continue;
      return { name: m[1], target: m[2].trim() };
    }
    return null;
  }
  // The link under the click resolved, if it carries a {root} token (else null,
  // so a plain link falls through to Obsidian's own opener).
  rootUriAt(evt, view) {
    const el = evt.target;
    if (!el || !el.closest || !el.closest(".cm-link"))
      return null;
    const ref = this.codeRefAt(view, evt.clientX, evt.clientY);
    if (!ref)
      return null;
    return /\{root\}|%7Broot%7D/i.test(ref.target) ? this.fillRoot(ref.target) : null;
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
      this.setIndex(this.flattenCache());
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
  // Set the index and its name lookup together. byName groups entries by lowercased
  // name so resolving a link/symbol scans only the same-named entries, not the whole
  // index (the hot paths — hover, stale marks, embeds — call this per event).
  setIndex(entries) {
    this.index = entries;
    this.byName = /* @__PURE__ */ new Map();
    this.kinds = /* @__PURE__ */ new Set();
    for (const e of entries) {
      const k = e.name.toLowerCase();
      const a = this.byName.get(k);
      if (a)
        a.push(e);
      else
        this.byName.set(k, [e]);
      this.kinds.add(e.kind);
    }
  }
  // Index entries whose (lowercased) name equals `name` — the candidate set a bare
  // symbol resolves against.
  entriesByName(name) {
    return this.byName.get(String(name).toLowerCase()) || [];
  }
  // An inline filter token as a language id: its id, an extension without the dot
  // (`py` -> `.py`), or its lower-cased name. Custom languages match for free.
  resolveLangToken(token) {
    const tok = String(token || "").toLowerCase();
    const l = tok && this.languages.find((l2) => l2.id === tok || l2.name.toLowerCase() === tok || l2.extensions.includes("." + tok));
    return l ? l.id : null;
  }
  parseQuery(raw) {
    return filter.parseQuery(raw, (t2) => this.resolveLangToken(t2), this.kinds);
  }
  // Whether an entry passes a parsed inline filter (the caller matches the name). A
  // container must be declared in the same file — its class name stands in for the path.
  entryPassesFilter(e, f) {
    if (f.lang && e.lang !== f.lang)
      return false;
    if (f.kind && e.kind !== f.kind)
      return false;
    if (f.container) {
      const v = this.fileCache.get(e.path);
      const lc = f.container.toLowerCase();
      if (!v || !v.entries.some((x) => x !== e && x.name.toLowerCase() === lc))
        return false;
    }
    return true;
  }
  // Decode a link target and return { dec, cand }: the decoded string and the entries
  // whose display name matches and whose path appears in it — the shared first step of
  // resolving a link. Callers apply their own tie-break (hover uses the stored line,
  // actualization must not).
  linkCandidates(name, target) {
    let dec = this.fillRoot(target);
    try {
      dec = decodeURIComponent(dec);
    } catch (e) {
    }
    dec = dec.split("\\").join("/");
    const named = this.entriesByName(name).filter((e) => e.name === name && pathInTarget(dec, e.path));
    const bestLen = named.reduce((mx, e) => Math.max(mx, e.path.length), 0);
    const cand = named.filter((e) => e.path.length === bestLen);
    return { dec, cand };
  }
  // The longest indexed file path a link target points at, or null — lets linkState tell a
  // broken link (file indexed, symbol gone) from an unrelated one. Only runs for links that
  // don't resolve, so the file scan stays off the hot path.
  targetIndexedFile(dec) {
    let best = null;
    for (const rel of this.fileCache.keys()) {
      if ((!best || rel.length > best.length) && pathInTarget(dec, rel))
        best = rel;
    }
    return best;
  }
  // The single entry a bare symbol resolves to (a declaration preferred over the file
  // entry), or null when the name spans several files (ambiguous) or is unknown.
  uniqueSymbolEntry(name) {
    const named = this.entriesByName(name);
    if (!named.length)
      return null;
    if (new Set(named.map((e) => e.path)).size > 1)
      return null;
    return named.find((e) => e.kind !== "file") || named[0];
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
    for (const r of this.scanFolders()) {
      const dir = nodePath.join(root, r);
      if (!fs.existsSync(dir))
        continue;
      try {
        const w = fs.watch(dir, { recursive: true }, (_evt, filename) => this.onWatchEvent(r, filename));
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
  // and files we don't index are dropped cheaply before scheduling. `r` is the scan
  // root the event came from, so the path can be resolved relative to the code root.
  onWatchEvent(r, filename) {
    if (filename) {
      const base = (r || "").split("\\").join("/").replace(/\/+$/, "");
      const rel = (base ? base + "/" : "") + String(filename).split("\\").join("/");
      if (underSkip(rel, parseSkip(this.settings.skipDirs)))
        return;
      const ext = nodePath.extname(rel).toLowerCase();
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
  // Write the starter languages file at the configured path (if it doesn't exist yet),
  // then load and index it. Backs the "Create file" button in settings.
  async createLanguagesFile() {
    const path = this.languagesFilePath();
    if (!path) {
      new Notice(t("notice.langFileNoPath"));
      return;
    }
    if (this.app.vault.getAbstractFileByPath(path)) {
      new Notice(t("notice.langFileExists"));
      return;
    }
    try {
      await this.app.vault.create(path, LANGUAGES_TEMPLATE);
    } catch (e) {
      new Notice(t("notice.langFileError", { error: e && e.message }));
      return;
    }
    await this.loadLanguagesFile();
    await this.rebuildIndex(false);
    new Notice(t("notice.langFileCreated", { path }));
  }
  // Open the languages file for editing. It's JSON, which Obsidian can't show in a leaf
  // (that opens a blank tab), so hand it to the OS default editor.
  openLanguagesFile() {
    const path = this.languagesFilePath();
    if (!path || !this.app.vault.getAbstractFileByPath(path))
      return;
    if (typeof this.app.openWithDefaultApp === "function") {
      this.app.openWithDefaultApp(path);
      return;
    }
    const adapter = this.app.vault.adapter;
    const base = adapter && typeof adapter.getBasePath === "function" ? adapter.getBasePath() : "";
    if (base)
      window.open("file:///" + encodeURI(nodePath.join(base, path).split(nodePath.sep).join("/")));
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
      const prism = typeof def.prism === "string" ? def.prism.trim() : "";
      out.push({ id: def.id, name: def.name || def.id, extensions, patterns, prism });
    }
    this.languages = out;
  }
  // The Prism grammar id for a language id: a custom language's own `prism` field
  // wins, then the built-in mapping, then the id itself (so e.g. "rust" works when
  // Prism has it). hover.js falls back to plain text / c-like when it doesn't.
  prismIdFor(langId) {
    const lang = this.languages.find((l) => l.id === langId);
    if (lang && lang.prism)
      return lang.prism;
    return PRISM_LANG[langId] || langId;
  }
  // Empty the index (nothing to scan) and persist, telling whoever's listening.
  async resetIndex(noticeKey, notify) {
    this.setIndex([]);
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
    const roots = this.scanFolders();
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
    const scan = { root, byExt, skip: parseSkip(this.settings.skipDirs), old, next: /* @__PURE__ */ new Map(), onFile };
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
    this.setIndex(this.flattenCache());
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
        const rel = nodePath.relative(scan.root, abs).split(nodePath.sep).join("/");
        if (!underSkip(rel, scan.skip))
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
  // An entry's absolute path on disk: the code root joined with its stored relative path.
  entryPath(e) {
    const root = this.codeRoot();
    return root ? nodePath.join(root, e.path) : e.path;
  }
  // {root} stays in the link for portability (resolved on render/click); call fillRoot()
  // when opening the URI directly. `template` overrides the default preset.
  buildUri(e, template) {
    const tpl = template || this.settings.uriTemplate;
    const absFs = this.entryPath(e);
    const absFwd = absFs.split(nodePath.sep).join("/");
    const line = String(e.line || 1);
    const project = (e.path.split("/")[0] || "").trim();
    const jb = this.settings.jetbrainsProduct;
    const product = jb && jb !== "ask" ? jb : "idea";
    const git = GIT_PLACEHOLDER.test(tpl) ? resolveGit(absFs) : null;
    const relPath = git ? nodePath.relative(git.repoRoot, absFs).split(nodePath.sep).join("/") : e.path;
    const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
    return tpl.replace(/{abs}/g, encodeURI(absFwd)).replace(/{path}/g, encPath(relPath)).replace(/{line}/g, line).replace(/{name}/g, encodeURIComponent(e.name)).replace(/{project}/g, encodeURIComponent(project)).replace(/{(?:jetbrainsProduct|product)}/g, product).replace(/{gitRemote}/g, git ? git.remote : "").replace(/{gitSha}/g, git ? git.sha : "").replace(/{gitBranch}/g, git ? git.branch || git.sha : "");
  }
  // True (and warns) when a permalink preset has no git repo to fill {remote}/{sha}.
  gitTemplateBlocked(e, template) {
    if (!GIT_PLACEHOLDER.test(template || this.settings.uriTemplate))
      return false;
    if (resolveGit(this.entryPath(e)))
      return false;
    new Notice(t("notice.noGit"));
    return true;
  }
  // The markdown link to insert. Inside a table cell a literal pipe splits the row.
  buildLink(e, inTable, template) {
    const link = `[${e.name}](${this.buildUri(e, template)})`;
    return inTable ? link.replace(/\|/g, "\\|") : link;
  }
  pickEntry(onChoose, query) {
    new CodeLinkModal(this.app, this, { onChoose, query }).open();
  }
  insertLink(editor, e, template) {
    if (this.gitTemplateBlocked(e, template))
      return;
    const inTable = inTableCell(editor.getValue(), editor.posToOffset(editor.getCursor("from")));
    editor.replaceSelection(this.buildLink(e, inTable, template));
  }
  // The ```code-link block bodies offered for an entry: a unique symbol embeds by name
  // (so it tracks the declaration as code moves), plus precise by-line and by-range forms.
  // A range shows a window of code; add a `context: N` line by hand to pad the others.
  embedFormats(e) {
    const line = e.line || 1;
    const unique = e.kind !== "file" && !!this.uniqueSymbolEntry(e.name);
    const out = [];
    if (unique)
      out.push({ label: t("embed.fmt.symbol"), body: e.name });
    out.push({ label: t("embed.fmt.line", { line }), body: e.path + ":" + line });
    out.push({ label: t("embed.fmt.range", { from: line, to: line + 10 }), body: e.path + ":" + line + "-" + (line + 10) });
    return out;
  }
  insertEmbed(editor, e) {
    const formats = this.embedFormats(e);
    new PresetPickerModal(this.app, formats, (f) => {
      editor.replaceSelection("```code-link\n" + f.body + "\n```\n");
    }, t("modal.embedPlaceholder")).open();
  }
  // The selectable presets — built-ins then the user's own — as { key, label, template },
  // where key is the value the settings dropdown stores ('u:<i>' for a user editor).
  editorPresets() {
    const out = [
      { key: "file", label: t("set.preset.file"), template: PRESETS.file, builtin: true },
      { key: "vscode", label: t("set.preset.vscode"), template: PRESETS.vscode, builtin: true },
      { key: "jetbrains", label: t("set.preset.jetbrains"), template: PRESETS.jetbrains, builtin: true },
      { key: "github", label: t("set.preset.github"), template: PRESETS.github, builtin: true },
      { key: "gitlab", label: t("set.preset.gitlab"), template: PRESETS.gitlab, builtin: true }
    ];
    (this.settings.editors || []).forEach((e, i) => out.push({ key: "u:" + i, label: e.name || `Editor ${i + 1}`, template: e.template, builtin: false }));
    return out;
  }
  // Presets offered in the pickers: the visible ones (hiding everything falls back to all),
  // most-recently-used first. Custom editors are always shown.
  visiblePresets() {
    const hidden = new Set(this.settings.hiddenPresets || []);
    const all = this.editorPresets();
    const shown = all.filter((p) => !hidden.has(p.key));
    const mru = this.settings.recentPresets || [];
    const rank = (p) => {
      const i = mru.indexOf(p.key);
      return i === -1 ? Infinity : i;
    };
    return (shown.length ? shown : all).map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p);
  }
  recordRecentPreset(key) {
    const mru = (this.settings.recentPresets || []).filter((k) => k !== key);
    mru.unshift(key);
    this.settings.recentPresets = mru.slice(0, 8);
    this.saveSettings();
  }
  // Runs once: GitHub/GitLab ship hidden and unhide only if the code root's remote is on
  // that host, so you don't scroll past a permalink preset for a service you don't use.
  initPresetVisibility() {
    if (this.settings.presetsInitialized)
      return;
    this.settings.presetsInitialized = true;
    const git = resolveGitDir(this.codeRoot());
    const host = git ? (git.remote.match(/^https:\/\/([^/]+)/) || [])[1] || "" : "";
    const hidden = new Set(this.settings.hiddenPresets || []);
    if (/github/i.test(host))
      hidden.delete("github");
    if (/gitlab/i.test(host))
      hidden.delete("gitlab");
    this.settings.hiddenPresets = [...hidden];
    this.saveSettings();
  }
  updateStatusBar() {
    const el = this.editorStatusEl;
    if (!el)
      return;
    if (!this.settings.showStatusBar) {
      el.hide();
      return;
    }
    const p = this.editorPresets().find((x) => x.template === this.settings.uriTemplate);
    const name = this.settings.askOnInsert ? t("set.preset.ask") : p ? p.label : this.settings.uriTemplate;
    el.show();
    el.setText(t("status.editor", { name }));
  }
  usesProduct(template) {
    return PRODUCT_PLACEHOLDER.test(template || "");
  }
  applyProduct(template, code) {
    return template.replace(/{(?:jetbrainsProduct|product)}/g, code);
  }
  productLabel(code) {
    if (code === "ask")
      return t("set.preset.ask");
    const p = JETBRAINS_PRODUCTS.find(([key]) => key === code);
    return p ? p[1] : code;
  }
  // Pick a JetBrains IDE, then done(code). `allowAsk` adds an "Always ask" choice, so a
  // fixed preset can be told to prompt for the IDE on every insert.
  pickProduct(allowAsk, done) {
    const items = JETBRAINS_PRODUCTS.map(([key, label]) => ({ key, label }));
    if (allowAsk)
      items.unshift({ key: "ask", label: t("set.preset.ask") });
    new PresetPickerModal(this.app, items, (p) => done(p.key), t("modal.productPlaceholder")).open();
  }
  // Pick a preset; one whose template has a product placeholder then picks the IDE. Calls
  // done(preset, code) — code is null without a product placeholder, else the IDE (or 'ask').
  pickPreset(items, placeholder, done, allowAsk) {
    new PresetPickerModal(this.app, items, (p) => {
      if (!this.usesProduct(p.template))
        return done(p, null);
      this.pickProduct(allowAsk, (code) => done(p, code));
    }, placeholder).open();
  }
  // Always-ask mode picks the format (and IDE) per insert; a fixed preset still prompts for
  // the IDE when the JetBrains-IDE setting is "Always ask".
  withFormat(ask, run) {
    if (ask) {
      this.pickPreset(this.visiblePresets(), t("modal.formatPlaceholder"), (p, code) => {
        this.recordRecentPreset(p.key);
        run(code ? this.applyProduct(p.template, code) : p.template);
      }, false);
      return;
    }
    const tpl = this.settings.uriTemplate;
    if (this.usesProduct(tpl) && this.settings.jetbrainsProduct === "ask") {
      this.pickProduct(false, (code) => run(this.applyProduct(tpl, code)));
      return;
    }
    run(void 0);
  }
  // Switch the default preset (or "Always ask") without opening settings; a product preset
  // also sets the JetBrains-IDE setting, which may itself be "Always ask".
  switchPreset() {
    const items = this.visiblePresets().concat({ key: "ask", label: t("set.preset.ask") });
    this.pickPreset(items, t("modal.switchPlaceholder"), async (p, code) => {
      this.settings.askOnInsert = p.key === "ask";
      if (p.key !== "ask") {
        this.settings.uriTemplate = p.template;
        if (code)
          this.settings.jetbrainsProduct = code;
        this.recordRecentPreset(p.key);
      }
      await this.saveSettings();
      new Notice(t("notice.editorSet", { name: code ? this.productLabel(code) : p.label }));
    }, true);
  }
  // Resolve {root} to the absolute code root: a copied link is usually pasted outside
  // the vault (a browser, a terminal), where the portable {root} token wouldn't resolve.
  // Inserted links keep {root} for note portability.
  copyLink(e, template) {
    if (this.gitTemplateBlocked(e, template))
      return;
    navigator.clipboard.writeText(this.fillRoot(this.buildLink(e, false, template)));
    new Notice(t("notice.copied"));
  }
  // fillRoot resolves the portable {root} token, since there's no note to render it.
  openEntry(e, template) {
    window.open(this.fillRoot(this.buildUri(e, template)));
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
  // The selection/word to act on, or null when it makes no sense there. Never inside an
  // existing link (both actions). For `write` (convert-to-link) also never inside code or
  // frontmatter, where inserting a link would corrupt the sample; opening code from there
  // is harmless, so read-only actions are allowed.
  selectionTarget(editor, write) {
    const target = this.selectionOrWord(editor);
    if (!target)
      return null;
    const text = editor.getValue();
    const off = editor.posToOffset(target.from);
    if (inLink(text, off))
      return null;
    if (write && inCode(text, off))
      return null;
    return target;
  }
  // The markdown link spanning the editor cursor, as { name, target, line, from, to }
  // (character offsets within the line), or null. Right-click puts the cursor on the
  // click, so this reads the link that was clicked.
  codeLinkAtCursor(editor) {
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line);
    const re = linkRegex();
    let m;
    while (m = re.exec(line)) {
      if (cur.ch >= m.index && cur.ch <= m.index + m[0].length) {
        return { name: m[1], target: m[2], line: cur.line, from: m.index, to: m.index + m[0].length };
      }
    }
    return null;
  }
  fixLinkAtCursor(editor, link) {
    const target = this.actualizedTarget(link.name, link.target);
    if (target == null) {
      new Notice(t("notice.linksUpdated", { n: 0 }));
      return;
    }
    editor.replaceRange("[" + link.name + "](" + target + ")", { line: link.line, ch: link.from }, { line: link.line, ch: link.to });
    new Notice(t("notice.linksUpdated", { n: 1 }));
  }
  // Whether a markdown link is one of ours (points at indexed code) rather than a wiki
  // or web link — true for current, drifted and broken code links alike, so the
  // right-click copy/fix items only show on links this plugin owns.
  isCodeLink(name, target) {
    return !!this.entryUnderPointer(name, target) || !!this.linkState(name, target);
  }
  // Copy the clicked link's own target ({root} filled in), keeping the scheme it was
  // saved with — unlike copyLink, which builds a fresh link from the default preset.
  copyLinkAtCursor(link) {
    navigator.clipboard.writeText(this.fillRoot(link.target));
    new Notice(t("notice.copied"));
  }
  // Run the selected (or under-cursor) token through the index: a single match runs
  // `action`, several open the picker, none notifies. `write` gates the protected-range
  // check (convert may not run in code; open may).
  resolveSelection(editor, action, write) {
    const target = this.selectionTarget(editor, write);
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
    this.resolveSelection(editor, (e, target) => this.withFormat(this.settings.askOnInsert, (template) => {
      const inTable = inTableCell(editor.getValue(), editor.posToOffset(target.from));
      editor.replaceRange(this.buildLink(e, inTable, template), target.from, target.to);
    }), true);
  }
  openSelection(editor) {
    this.resolveSelection(editor, (e) => this.withFormat(this.settings.askOnInsert, (template) => this.openEntry(e, template)), false);
  }
  // Folders to scan, relative to the code root; empty means the whole code root.
  scanFolders() {
    const roots = splitLines(this.settings.scanRoots);
    return roots.length ? roots : ["."];
  }
  scanRootStatus() {
    const root = this.codeRoot();
    return this.scanFolders().map((rel) => ({
      rel,
      exists: !!root && fs.existsSync(nodePath.join(root, rel))
    }));
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.updateStatusBar();
  }
};
Object.assign(CodeLinkerPlugin.prototype, api);
Object.assign(CodeLinkerPlugin.prototype, actualize.methods);
module.exports = CodeLinkerPlugin;
