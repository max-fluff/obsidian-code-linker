'use strict';

const PRESETS = {
  // {root} keeps the note portable: the file holds a relative path, the absolute
  // code root is filled in on render/click (same mechanism as the file preset).
  vscode: 'vscode://file/{root}/{path}:{line}',
  // {product} resolves to the chosen JetBrains IDE (the "JetBrains IDE" setting).
  jetbrains: 'jetbrains://{product}/navigate/reference?project={project}&path={path}:{line}',
  // {root} is left in the note and resolved to the absolute code root on click,
  // so the link text stays portable across machines.
  file: 'file:///{root}/{path}',
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
  enabledLanguages: null, // null on first run => every built-in enabled
  languagesFile: 'code-languages.json', // vault-relative JSON of extra/override languages
  disabledKinds: [], // "<langId>:<kind>" keys hidden from suggestions (query-time filter)
  autoRefresh: true, // watch scan folders and rebuild the index when code changes
  minChars: 1,
  maxResults: 12,
  maxFileSizeKb: 2048, // 0 = no limit; larger files are indexed by name only, not parsed
  contextMenu: true, // the "Convert"/"Find and open" items in the editor right-click menu
};

const splitLines = (s) => (s || '').split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);

// Character ranges in raw markdown where a suggestion must not fire: frontmatter,
// fenced/inline code, and existing markdown links. Tables and headings are left
// out on purpose — a code link is valid inside both.
function protectedRanges(text) {
  const ranges = [];
  const push = (re) => { let m; while ((m = re.exec(text)) !== null) ranges.push([m.index, m.index + m[0].length]); };
  if (/^---\r?\n/.test(text)) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) ranges.push([0, end + 4]);
  }
  push(/```[\s\S]*?```/g);
  push(/~~~[\s\S]*?~~~/g);
  push(/`[^`\n]+`/g);
  push(/\[[^\]]*\]\([^)]*\)/g);
  return ranges.sort((a, b) => a[0] - b[0]);
}

const overlapsProtected = (ranges, s, e) => {
  for (const [rs, re] of ranges) {
    if (rs >= e) break;
    if (re > s) return true;
  }
  return false;
};

// Whether pos sits in a real GFM table cell. A lone pipe in prose doesn't count —
// the block of non-blank lines around pos must hold a delimiter row like "| --- |".
function inTableCell(text, pos) {
  const lines = text.split('\n');
  const lineIdx = (text.slice(0, pos).match(/\n/g) || []).length;
  if (!lines[lineIdx] || !lines[lineIdx].includes('|')) return false;
  const isDelimiter = (l) => l.includes('|') && l.includes('-') && /^[\s|:-]+$/.test(l);
  let top = lineIdx, bot = lineIdx;
  while (top > 0 && lines[top - 1].trim() !== '') top--;
  while (bot < lines.length - 1 && lines[bot + 1].trim() !== '') bot++;
  for (let i = top; i <= bot; i++) if (isDelimiter(lines[i])) return true;
  return false;
}

module.exports = { PRESETS, JETBRAINS_PRODUCTS, DEFAULT_SETTINGS, splitLines, protectedRanges, overlapsProtected, inTableCell };
