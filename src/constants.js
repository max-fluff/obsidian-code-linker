'use strict';

const { splitLines } = require('./shared/markdown');

const PRESETS = {
  // {root} keeps the note portable: the file holds a relative path, the absolute
  // code root is filled in on render/click (same mechanism as the file preset).
  vscode: 'vscode://file/{root}/{path}:{line}',
  // {jetbrainsProduct} resolves to the chosen JetBrains IDE (the "JetBrains IDE" setting).
  jetbrains: 'jetbrains://{jetbrainsProduct}/navigate/reference?project={project}&path={path}:{line}',
  // {root} is left in the note and resolved to the absolute code root on click,
  // so the link text stays portable across machines.
  file: 'file:///{root}/{path}',
  // Web permalinks: {gitRemote}/{gitSha} come from the file's git repo at insert time,
  // pinning the link to that exact commit. GitLab serves blobs under /-/blob.
  github: '{gitRemote}/blob/{gitSha}/{path}#L{line}',
  gitlab: '{gitRemote}/-/blob/{gitSha}/{path}#L{line}',
};

// Our language ids -> Prism grammar ids, for hover-preview syntax highlighting.
// A custom language falls back to its own id (so `rust` works if Prism has it).
const PRISM_LANG = {
  csharp: 'csharp',
  typescript: 'typescript',
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  php: 'php',
  go: 'go',
  rust: 'rust',
};

// JetBrains IDEs offered for the {product} placeholder, as [code, label].
const JETBRAINS_PRODUCTS = [
  ['idea', 'IntelliJ IDEA'],
  ['pycharm', 'PyCharm'],
  ['webstorm', 'WebStorm'],
  ['phpstorm', 'PhpStorm'],
  ['rubymine', 'RubyMine'],
  ['clion', 'CLion'],
  ['goland', 'GoLand'],
  ['rider', 'Rider'],
  ['rustrover', 'RustRover'],
  ['datagrip', 'DataGrip'],
];

const DEFAULT_SETTINGS = {
  trigger: '@@',
  uriTemplate: PRESETS.file,
  jetbrainsProduct: 'idea', // IDE the JetBrains preset opens; {product} in the template
  codeRoot: '', // empty => parent folder of the vault
  scanRoots: '', // one path per line, relative to codeRoot
  skipDirs: 'obj\nbin\n.git\nLibrary\nTemp\nnode_modules', // one folder name per line
  editors: [], // user-defined editor presets, each { name, template }
  hiddenPresets: ['github', 'gitlab'], // presets kept out of the pickers; revealed on first run if the remote matches
  presetsInitialized: false, // whether the one-time preset reveal has run
  recentPresets: [], // preset keys, most-recent first, to float recent picks up the picker
  askOnInsert: true, // ask which editor format to use on every insert (vs. a fixed preset)
  showStatusBar: false, // show the active editor preset in the status bar, click to switch
  enabledLanguages: null, // null on first run => every built-in enabled
  languagesFile: 'code-languages.json', // vault-relative JSON of extra/override languages
  disabledKinds: [], // "<langId>:<kind>" keys hidden from suggestions (query-time filter)
  autoRefresh: true, // watch scan folders and rebuild the index when code changes
  hoverPreview: true, // show the file-snippet popover when hovering a code link
  hoverBefore: 3, // preview lines shown above the target line
  hoverAfter: 20, // preview lines shown below the target line
  markStaleLinks: true, // underline links whose stored line has drifted from the code
  minChars: 1,
  maxResults: 12,
  maxFileSizeKb: 2048, // 0 = no limit; larger files are indexed by name only, not parsed
  contextMenu: true, // the "Convert"/"Find and open" items in the editor right-click menu
};

// Split the skip list into two matchers: bare names (skipped at any depth) and
// code-root-relative paths with a slash (that exact folder only).
function parseSkip(skipDirs) {
  const names = new Set();
  const paths = new Set();
  for (const raw of splitLines(skipDirs)) {
    const s = raw.split('\\').join('/').replace(/^\.?\//, '').replace(/\/+$/, '');
    if (!s) continue;
    if (s.includes('/')) paths.add(s); else names.add(s);
  }
  return { names, paths };
}

// Whether a code-root-relative path is under the skip list: any path segment is a
// skipped name, or the path (or an ancestor) is a skipped path.
function underSkip(rel, skip) {
  const segs = rel.split('/').filter(Boolean);
  for (const s of segs) if (skip.names.has(s)) return true;
  if (skip.paths.size) {
    let acc = '';
    for (const seg of segs) { acc = acc ? acc + '/' + seg : seg; if (skip.paths.has(acc)) return true; }
  }
  return false;
}

// Starter written by the "Create file" button in settings — a valid languages file
// with one example (Rust) the user can edit. Matches the format in languages/README.md.
const LANGUAGES_TEMPLATE = `[
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

// Whether a relative path appears in a (decoded, forward-slashed) link target at a
// segment boundary — so "Foo.cs" doesn't falsely match the tail of "src/Foo.cs".
// A boundary is anything a path segment can't contain: templates put {path} after a
// slash, but also after "=" (JetBrains' "path={path}", a custom "file={abs}").
const PATH_CHAR = /[A-Za-z0-9_.-]/;
function pathInTarget(dec, p) {
  let from = 0, i;
  while ((i = dec.indexOf(p, from)) !== -1) {
    if (i === 0 || !PATH_CHAR.test(dec[i - 1])) return true;
    from = i + 1;
  }
  return false;
}

module.exports = { PRESETS, PRISM_LANG, JETBRAINS_PRODUCTS, DEFAULT_SETTINGS, LANGUAGES_TEMPLATE, parseSkip, underSkip, pathInTarget };
