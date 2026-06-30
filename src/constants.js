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

const splitLines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);

// Whether a suggestion must not fire at `pos`: inside frontmatter, fenced/inline
// code, or an existing link. Tables and headings are allowed on purpose. Tests the
// single position rather than scanning the whole document, so it's cheap per keystroke.
function isProtected(text, pos) {
  if (/^---\r?\n/.test(text)) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1 && pos <= end + 4) return true;
  }
  const lines = text.split('\n');
  let lineStart = 0, lineIdx = 0;
  for (; lineIdx < lines.length; lineIdx++) {
    if (pos <= lineStart + lines[lineIdx].length) break;
    lineStart += lines[lineIdx].length + 1;
  }
  // A fence count up to the cursor line tells us whether we're inside a block.
  let fenced = false;
  for (let i = 0; i < lineIdx; i++) {
    const s = lines[i].trimStart();
    if (s.startsWith('```') || s.startsWith('~~~')) fenced = !fenced;
  }
  if (fenced) return true;
  // Inline code and links are line-local, so only the cursor's line matters.
  const col = pos - lineStart;
  const line = lines[lineIdx] || '';
  return inMatch(line, col, /`[^`\n]+`/g) || inMatch(line, col, /\[[^\]]*\]\([^)]*\)/g);
}

function inMatch(line, col, re) {
  let m;
  while ((m = re.exec(line)) !== null) {
    if (col > m.index && col < m.index + m[0].length) return true;
  }
  return false;
}

// Real GFM table only — the surrounding block must hold a delimiter row like "| --- |".
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

module.exports = { PRESETS, JETBRAINS_PRODUCTS, DEFAULT_SETTINGS, splitLines, isProtected, inTableCell };
