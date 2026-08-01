'use strict';

// Inline code embed: a ```code-link fenced block that renders a snippet of a source
// file in the note. The target is a symbol name (resolved through the index, so it
// tracks the declaration as code moves) or an explicit path with a line/range. The
// block re-renders on every index change, so an open embed follows edits on disk.

const { Notice } = require('obsidian');
const nodePath = require('path');
const { readLines, renderCode } = require('./render');
const { parseBinding } = require('./shared/binding');
const frame = require('./shared/embed-frame');
const { t, plural } = require('./shared/i18n');

const EMBED_LANG = 'code-link';
const MAX_EMBED_LINES = 400; // bound how much a single embed can pour into the note
const MORE_STEP = 10; // the most one "show more" opens up

const SPEC_KEYS = ['context', 'lines', 'title', 'bind', 'numbers'];
const parseSpec = (source) => frame.parseSpec(source, SPEC_KEYS);

const numbered = (spec) => !/^(off|no|false|hide|none)$/i.test((spec.numbers || '').trim());

const baseName = (p) => nodePath.basename(p).replace(/\.[^.]+$/, '');
const intOr = (v, def) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; };

// "<from>-<to>" or "<from>" -> { from, to } (from <= to), or null.
function splitRange(v) {
  const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec((v || '').trim());
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = m[2] ? parseInt(m[2], 10) : a;
  return { from: Math.min(a, b), to: Math.max(a, b) };
}

// "<path>:<from>[-<to>]" -> { path, from, to, single }, or null. Relative code paths
// don't contain colons, so the last :<digits> is unambiguously the line.
function splitPathRange(t) {
  const m = /^(.+?):(\d+)(?:-(\d+))?$/.exec(t);
  if (!m) return null;
  const from = parseInt(m[2], 10);
  const to = m[3] ? parseInt(m[3], 10) : from;
  return { path: m[1], from: Math.min(from, to), to: Math.max(from, to), single: !m[3] };
}

const looksLikePath = (s) => s.includes('/') || s.includes('\\') || /\.[a-z0-9]+$/i.test(s);

function langForPath(plugin, relPath) {
  const ext = nodePath.extname(relPath).toLowerCase();
  const lang = plugin.languages.find((l) => l.extensions.includes(ext));
  return lang ? lang.id : '';
}

// Resolve a path spec to a code-root-relative path. An indexed file is matched by its
// tail through lookup(), so "http-client.ts" or "code-samples/http-client.ts" both work
// regardless of the scan-root prefix. A path that isn't indexed is kept as given, so
// out-of-index files still resolve under the root.
function resolvePath(plugin, relPath) {
  const norm = relPath.split('\\').join('/').replace(/^\.?\//, '');
  const hit = plugin.lookup(norm)[0];
  return hit ? hit.path : norm;
}

function build(plugin, relPath, langId, from, to, targetLine, name) {
  const root = plugin.codeRoot();
  const absPath = root ? nodePath.join(root, relPath) : relPath;
  const requestedTo = to;
  to = Math.min(to, from + MAX_EMBED_LINES - 1);
  return {
    absPath, relPath, from, to, targetLine,
    truncated: to < requestedTo,
    prismId: langId ? plugin.prismIdFor(langId) : '',
    entry: { name: name || baseName(relPath), path: relPath, line: targetLine || from },
  };
}

function fromPath(plugin, spec, relPath, from, to, targetLine) {
  relPath = resolvePath(plugin, relPath);
  const ctx = intOr(spec.context, 0);
  const lr = splitRange(spec.lines);
  if (lr) { from = lr.from; to = lr.to; targetLine = null; } // lines: overrides the range
  if (from == null) { from = 1; to = MAX_EMBED_LINES; }      // bare path: whole file (capped)
  // context grows the shown window symmetrically around the line or range.
  from = Math.max(1, from - ctx);
  to = to + ctx;
  return build(plugin, relPath, langForPath(plugin, relPath), from, to, targetLine, null);
}

// A bind: line says what an embed's window was pinned to, so drift can be reported the
// same way a link's is. Only an explicit path:line spec can drift — a symbol target
// re-resolves on every render, and a "lines:" override means the reader took the wheel.
function withDrift(plugin, spec, res, pinnedLine) {
  const b = parseBinding(spec.bind);
  if (b && res.relPath && !spec.lines) res.drift = plugin.bindState(res.relPath, b, pinnedLine);
  return res;
}

// Resolve a parsed spec to a render target, or { error } for the inline notice.
function resolve(plugin, spec) {
  const target = spec.target;
  if (!target) return { error: t('embed.empty') };

  const pr = splitPathRange(target);
  if (pr) return withDrift(plugin, spec, fromPath(plugin, spec, pr.path, pr.from, pr.to, pr.single ? pr.from : null), pr.from);
  if (looksLikePath(target)) return fromPath(plugin, spec, target, null, null, null);

  // A "py:"/"def:" filter narrows a name that collides across files (a dotted "Foo.bar"
  // is a path here — looksLikePath owns the dot — so class scope is suggestion-only).
  const f = plugin.parseQuery(target);
  const matches = plugin.entriesByName(f.name).filter((m) => plugin.entryPassesFilter(m, f));
  if (!matches.length) return { error: t('embed.notFound', { query: target }) };
  const paths = new Set(matches.map((m) => m.path));
  if (paths.size > 1) return { error: t('embed.ambiguous', { n: paths.size, query: target }) };
  const e = matches.find((m) => m.kind !== 'file') || matches[0]; // declaration over file entry
  const ctx = intOr(spec.context, 0);
  const lr = splitRange(spec.lines);
  const from = Math.max(1, (lr ? lr.from : e.line) - ctx);
  const to = (lr ? lr.to : e.line) + ctx;
  return build(plugin, e.path, e.lang, from, to, lr ? null : e.line, e.name);
}

class CodeEmbed extends frame.EmbedFrame {
  constructor(containerEl, plugin, spec, ctx) {
    super(containerEl, plugin, spec, ctx, 'code-linker');
    containerEl.addClass('code-linker-code');
    // Lines opened up above and below the block's own window, for this reading only.
    this.above = 0;
    this.below = 0;
    this.wrapped = false;
  }

  resolve() {
    const res = resolve(this.plugin, this.spec);
    if (res.error || !(this.above || this.below)) return res;
    res.from = Math.max(1, res.from - this.above);
    const to = res.to + this.below;
    res.to = Math.min(to, res.from + MAX_EMBED_LINES - 1);
    res.truncated = res.truncated || res.to < to;
    return res;
  }

  refresh() {
    this.above = 0;
    this.below = 0;
    return this.render(true);
  }

  // Without an mtime there is nothing to compare a rebuild against, so nothing is skipped.
  sig(res) {
    const cached = res.relPath && this.plugin.fileCache.get(res.relPath);
    const mtime = cached ? cached.mtimeMs : null;
    if (mtime == null) return null;
    const drift = res.drift ? res.drift.state + (res.drift.line || '') : '';
    return res.absPath + '|' + res.from + '|' + res.to + '|' + res.targetLine + '|' + mtime + '|' + drift;
  }

  headerText(res) { return this.spec.title || res.relPath; }

  unreadable(res) { return t('embed.unreadable', { path: res.relPath }); }

  tools(row) {
    row.empty();
    const wrap = this.button(row, 'wrap-text', t('embed.tool.wrap'), () => this.toggleWrap(wrap));
    wrap.toggleClass('is-active', this.wrapped);
    this.button(row, 'copy', t('embed.tool.copy'), () => this.copy());
  }

  toggleWrap(button) {
    this.wrapped = !this.wrapped;
    button.toggleClass('is-active', this.wrapped);
    this.chrome.body.toggleClass('is-wrapped', this.wrapped);
    this.measureWrap();
  }

  measureWrap() {
    const code = this.chrome && this.chrome.body.querySelector('.code-linker-embed-code');
    const pre = code && code.querySelector('pre');
    if (!pre) return;
    const lh = parseFloat(getComputedStyle(pre).lineHeight);
    const rows = this.lineCount || 0;
    code.toggleClass('has-wrapped-lines', !!(lh > 0 && rows && pre.scrollHeight > lh * rows + 1));
  }

  // Offered only where there is file left, and for as much of it as there is.
  strip(body, side, n) {
    if (n < 1) return;
    const label = plural('embedMore', n);
    const button = this.button(body, side === 'above' ? 'chevron-up' : 'chevron-down', label, () => {
      this[side] += n;
      this.render(true);
    });
    button.addClass('code-linker-embed-more');
    button.createSpan({ text: label });
  }

  copy() {
    if (!this.text || !navigator.clipboard) return;
    navigator.clipboard.writeText(this.text).then(() => new Notice(t('notice.snippetCopied')), () => {});
  }

  async renderBody(body, res, isCurrent) {
    // Read before clearing, so a refresh keeps the old snippet up until the new one is ready. A
    // step past the window says how much file is left below; a control character in that step
    // makes readLines call the whole read binary, so it is retried at the window itself.
    const read = await readLines(res.absPath, res.from, res.to + MORE_STEP)
      || await readLines(res.absPath, res.from, res.to);
    if (!isCurrent()) return true;
    if (!read) return false;

    const start = read.startLine;
    const snippet = { lines: read.lines.slice(0, res.to - res.from + 1) };
    const below = read.lines.length - snippet.lines.length;
    const end = start + snippet.lines.length - 1;
    this.setHeader(this.spec.title || res.relPath + ':' + (start === end ? start : start + '-' + end));
    // The window is frozen where the spec says, so a drifted embed is showing the wrong code —
    // mark the header the way a drifted link is marked, and say what to do.
    for (const state of ['stale', 'broken']) {
      this.chrome.header.toggleClass('code-linker-embed-' + state, !!res.drift && res.drift.state === state);
    }

    body.empty();
    body.toggleClass('is-wrapped', this.wrapped);
    // Past the cap the window cannot grow, and a strip offering lines it would clamp away is a
    // dead click.
    const room = MAX_EMBED_LINES - (res.to - res.from + 1);
    this.strip(body, 'above', Math.min(MORE_STEP, start - 1, room));

    const code = body.createDiv({ cls: 'code-linker-embed-code' });
    const marked = res.targetLine != null ? res.targetLine - start : -1;
    if (marked >= 0 && marked < snippet.lines.length) {
      const band = code.createDiv({ cls: 'code-linker-embed-band' });
      band.style.top = 'calc(var(--cl-lh) * ' + marked + ')';
    }
    if (numbered(this.spec)) {
      const gutter = code.createDiv({ cls: 'code-linker-embed-numbers' });
      // The gutter is opaque and sits over the band, so the marked number carries it instead.
      snippet.lines.forEach((_, i) => gutter.createDiv({
        cls: i === marked ? 'code-linker-embed-marked' : '',
        text: String(start + i),
      }));
    }
    this.text = snippet.lines.join('\n');
    this.lineCount = snippet.lines.length;
    await renderCode(code, this.text, res.prismId);
    this.strip(body, 'below', Math.min(below, room));
    this.measureWrap();
    this.notes(res);
    return true;
  }

  notes(res) {
    for (const note of Array.from(this.containerEl.querySelectorAll('.code-linker-embed-note'))) note.remove();
    if (res.drift) {
      this.containerEl.createDiv({
        cls: 'code-linker-embed-note code-linker-embed-' + res.drift.state,
        text: res.drift.state === 'stale' ? t('embed.stale', { line: res.drift.line }) : t('embed.broken'),
      });
    }
    if (res.truncated) this.containerEl.createDiv({ cls: 'code-linker-embed-note', text: t('embed.truncated', { max: MAX_EMBED_LINES }) });
  }

  menuItems(menu, res) {
    if (res.drift && res.drift.state === 'stale') {
      menu.addItem((i) => i.setTitle(t('menu.fixLink')).setIcon('wrench').onClick(() => this.fix()));
    }
    // The same pins a link gets: an embed frozen to a line drifts exactly like one.
    const p = this.plugin;
    const site = p.embedSite(this.spec);
    p.addPinItems(menu, (a) => p.pinOption(site, this.spec.bind, a), (a) => this.pin(a));
    if (parseBinding(this.spec.bind)) {
      menu.addItem((i) => i.setTitle(t('menu.unpin')).setIcon('pin-off').onClick(() => this.setBind('')));
    }
  }

  pin(anchor) {
    const o = this.plugin.pinOption(this.plugin.embedSite(this.spec), this.spec.bind, anchor);
    if (!o) { new Notice(t('notice.cantBind')); return; }
    this.setBind(o.title);
  }

  // Bring this embed's frozen line up to date — the fence-body twin of a link's Fix.
  async fix() {
    let fixed = false;
    const ok = await this.writeBody((body) => {
      const d = this.plugin.embedDrift(body);
      if (!d || d.state !== 'stale') return null;
      fixed = true;
      return d.out;
    });
    if (!fixed) { new Notice(t('notice.linksUpdated', { n: 0 })); return; }
    new Notice(ok ? t('notice.linksUpdated', { n: 1 }) : t('notice.embedMoved'));
  }

  async setBind(title) {
    const ok = await this.writeBody((body) => frame.setSpecLine(body, 'bind', title));
    if (!ok) { new Notice(t('notice.embedMoved')); return; }
    new Notice(title ? t('notice.bound', { line: this.res.from }) : t('notice.unbound'));
  }
}

function registerEmbed(plugin) {
  plugin.registerMarkdownCodeBlockProcessor(EMBED_LANG, (source, el, ctx) => {
    ctx.addChild(new CodeEmbed(el, plugin, parseSpec(source), ctx));
  });
}

module.exports = { registerEmbed, parseSpec, splitPathRange, resolvePath, numbered };
