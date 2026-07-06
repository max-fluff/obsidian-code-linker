'use strict';
// Code Linker — autocomplete references to source-code files and types.
//
// Type the trigger (default "@@") followed by a class/file name; pick a match
// to insert a markdown link whose URL opens the file at its line in your editor.
//
// The plugin scans the configured folders itself (Node fs, desktop only) and
// keeps the index in memory — no external build step or index file.

const { Plugin, Notice, normalizePath, MarkdownView } = require('obsidian');
const { EditorView } = require('@codemirror/view');
const { Prec } = require('@codemirror/state');
const fs = require('fs');
const fsp = fs.promises;
const readline = require('readline');
const nodePath = require('path');

const { PRESETS, PRISM_LANG, JETBRAINS_PRODUCTS, DEFAULT_SETTINGS, LANGUAGES_TEMPLATE, splitLines, parseSkip, underSkip, pathInTarget, inTableCell, inCode, inLink, linkRegex } = require('./constants');

// A declaration line is never this wide; the cap bounds backtracking from a
// greedy user regex on a minified file so indexing can't hang.
const MAX_PARSE_LINE_LENGTH = 2000;
const { BUILTIN_LANGUAGES } = require('./builtin-languages');
const { CodeIndexSuggest } = require('./suggest');
const { HoverPreview } = require('./hover');
const { registerEmbed } = require('./embed');
const actualize = require('./actualize');
const { CodeLinkModal, PresetPickerModal } = require('./modal');
const { CodeLinkerSettingTab } = require('./settings-tab');
const { initI18n, t, plural } = require('./i18n');
const api = require('./api');

class CodeLinkerPlugin extends Plugin {
  async onload() {
    initI18n();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.setIndex([]);
    this.languages = [];
    this.languageErrors = [];
    this.customRaw = '';
    this.watchers = [];
    this.fileCache = new Map();
    this.cacheSignature = '';
    this._indexListeners = new Set(); // API onChange subscribers; needed before the first rebuild
    await this.loadLanguagesFile();
    this.migrateSettings();
    await this.loadCache();
    this.api = this.buildApi(); // app.plugins.plugins['code-linker'].api
    this.hover = new HoverPreview(this);

    this.registerEditorSuggest(new CodeIndexSuggest(this.app, this));
    // Links keep a portable {root} token in the note; the absolute code root is
    // filled in only when the link is shown or opened, so notes stay portable.
    // Reading view: rewrite the rendered href so Obsidian opens the real file.
    this.registerMarkdownPostProcessor((el) => this.resolveRootLinks(el));
    // Live Preview renders links in CM6 as <span class="cm-link"> with no href, so
    // the post-processor can't reach them and Obsidian would open the literal
    // {root} URL. A high-precedence CM6 handler suppresses that and re-opens the
    // resolved URL through Obsidian's own window.open path — same native prompt as
    // any other external link. Suppress on mousedown (where Obsidian acts) and
    // open on click/auxclick, like a normal link.
    this.registerEditorExtension(
      Prec.highest(
        EditorView.domEventHandlers({
          mousedown: (evt, view) => this.onEditorLink(evt, view, false),
          click: (evt, view) => this.onEditorLink(evt, view, true),
          auxclick: (evt, view) => this.onEditorLink(evt, view, true),
        })
      )
    );
    // Inline ```code-link embeds, and the Live Preview underline for drifted links.
    registerEmbed(this);
    this.registerEditorExtension(actualize.staleLinksExtension(this));
    // Re-scan open editors' stale marks when the index rebuilds (embeds re-render via
    // their own onIndexChange subscription).
    this.register(this.onIndexChange(() => this.refreshStale()));
    this.lastX = 0;
    this.lastY = 0;
    this.registerDomEvent(document, 'mousemove', (evt) => this.onHoverMove(evt));
    this.registerDomEvent(document, 'keydown', (evt) => {
      if (evt.key === 'Control' || evt.key === 'Meta') this.onHoverKey();
    });
    // Scrolling inside the popover must not dismiss it; only scrolls elsewhere do.
    this.registerDomEvent(document, 'scroll', (evt) => {
      if (!this.hover.contains(evt.target)) this.hover.hide();
    }, { capture: true });
    this.registerDomEvent(window, 'blur', () => this.hover.hide());
    this.registerDomEvent(document, 'keyup', (evt) => { if (evt.key === 'Escape') this.hover.hide(); });
    this.addSettingTab(new CodeLinkerSettingTab(this.app, this));
    this.statusEl = this.addStatusBarItem();
    this.editorStatusEl = this.addStatusBarItem();
    this.editorStatusEl.addClass('mod-clickable');
    this.editorStatusEl.setAttribute('aria-label', t('status.editorTooltip'));
    this.registerDomEvent(this.editorStatusEl, 'click', () => this.switchPreset());
    this.updateStatusBar();
    this.addCommand({ id: 'rebuild-code-index', name: t('cmd.rebuildIndex'), callback: () => this.rebuildIndex(true) });
    this.addCommand({ id: 'insert-code-link', name: t('cmd.insertLink'), editorCallback: (editor) => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.insertLink(editor, e, tpl))) });
    this.addCommand({ id: 'insert-code-link-as', name: t('cmd.insertLinkAs'), editorCallback: (editor) => this.pickEntry((e) => this.withFormat(true, (tpl) => this.insertLink(editor, e, tpl))) });
    this.addCommand({ id: 'switch-editor-preset', name: t('cmd.switchPreset'), callback: () => this.switchPreset() });
    this.addCommand({ id: 'open-code-file', name: t('cmd.openFile'), callback: () => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.openEntry(e, tpl))) });
    this.addCommand({ id: 'copy-code-link', name: t('cmd.copyLink'), callback: () => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.copyLink(e, tpl))) });
    this.addCommand({ id: 'convert-selection-to-link', name: t('cmd.convertSelection'), editorCallback: (editor) => this.convertSelection(editor) });
    this.addCommand({ id: 'open-selected-code', name: t('cmd.openSelection'), editorCallback: (editor) => this.openSelection(editor) });
    this.addCommand({ id: 'insert-code-embed', name: t('cmd.insertEmbed'), editorCallback: (editor) => this.pickEntry((e) => this.insertEmbed(editor, e)) });
    this.addCommand({ id: 'update-links-note', name: t('cmd.updateLinksNote'), callback: () => this.updateLinksInActiveNote() });
    this.addCommand({ id: 'update-links-vault', name: t('cmd.updateLinksVault'), callback: () => this.updateLinksInVault() });

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        if (!this.settings.contextMenu) return;
        // Convert writes a link, so it's offered only where that's safe (not in a link,
        // code, or frontmatter); open is read-only, so it's offered anywhere but a link.
        if (this.selectionTarget(editor, true)) {
          menu.addItem((item) => item.setTitle(t('menu.convert')).setIcon('link').onClick(() => this.convertSelection(editor)));
        }
        if (this.selectionTarget(editor, false)) {
          menu.addItem((item) => item.setTitle(t('cmd.openSelection')).setIcon('file-search').onClick(() => this.openSelection(editor)));
        }
        // Right-clicking a drifted code link offers to fix just that link.
        const link = this.codeLinkAtCursor(editor);
        if (link && this.isLinkStale(link.name, link.target)) {
          menu.addItem((item) => item.setTitle(t('menu.fixLink')).setIcon('wrench').onClick(() => this.fixLinkAtCursor(editor, link)));
        }
      })
    );

    // Recompile + rebuild when the languages file is edited.
    this.registerEvent(
      this.app.vault.on('modify', async (f) => {
        if (f && f.path === this.languagesFilePath()) {
          await this.loadLanguagesFile();
          this.rebuildIndex(false);
        }
      })
    );

    // The disk cache (loaded above) gives an instant index on startup; this
    // background rebuild validates it against the filesystem and refreshes.
    this.app.workspace.onLayoutReady(() => this.rebuildIndex(false));
  }

  onunload() {
    this.stopWatchers();
    clearTimeout(this.watchTimer);
    if (this.hover) this.hover.destroy();
  }

  migrateSettings() {
    if (this.settings.enabledLanguages == null) {
      this.settings.enabledLanguages = this.languages.map((l) => l.id);
    }
    // Old skip lists were comma-separated; normalize to one-per-line (matches scan folders).
    this.settings.skipDirs = (this.settings.skipDirs || '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).join('\n');
    // The file preset used to inline an absolute path; switch old saves to the portable form.
    if (this.settings.uriTemplate === 'file:///{abs}') this.settings.uriTemplate = PRESETS.file;
    // The "Custom" preset is gone; preserve a custom template as a named editor so it stays selectable.
    const tpl = this.settings.uriTemplate;
    const editors = this.settings.editors || (this.settings.editors = []);
    const known = Object.values(PRESETS).includes(tpl) || editors.some((e) => e.template === tpl);
    if (!known) editors.push({ name: 'Custom', template: tpl });
  }

  // Obsidian URL-encodes the braces in a rendered href, so match both forms.
  fillRoot(v) {
    const root = encodeURI(this.codeRoot().split(nodePath.sep).join('/'));
    return v.replace(/\{root\}|%7Broot%7D/gi, root);
  }

  resolveRootLinks(el) {
    const links = el.querySelectorAll ? el.querySelectorAll('a') : [];
    for (const a of links) {
      for (const attr of ['href', 'data-href']) {
        const v = a.getAttribute(attr);
        if (!v) continue;
        const out = this.fillRoot(v);
        if (out !== v) a.setAttribute(attr, out);
      }
    }
    this.markStaleAnchors(el);
  }

  // Toggle the drifted/broken-link underline on every rendered anchor in `el`. toggle (not
  // add) so re-running after an index rebuild also clears links that are now current.
  markStaleAnchors(el) {
    const links = el.querySelectorAll ? el.querySelectorAll('a') : [];
    for (const a of links) {
      const state = this.settings.markStaleLinks ? this.linkState(a.textContent, a.getAttribute('href') || '') : null;
      a.classList.toggle('code-linker-stale', state === 'stale');
      a.classList.toggle('code-linker-broken', state === 'broken');
    }
  }

  // After an index rebuild, refresh stale marks in both render modes: the CM6 effect for
  // Live Preview, and a re-scan of rendered anchors for Reading view (its post-processor
  // doesn't re-run on its own).
  refreshStale() {
    actualize.refreshStaleLinks(this.app);
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (view && view.getViewType && view.getViewType() === 'markdown' && view.containerEl) {
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
    if (!this.hoverEnabled()) return;
    if (evt.buttons) return;
    // evt.target is already the element under the pointer for a mousemove; using it
    // avoids elementFromPoint's synchronous layout flush on every pointer move.
    const el = evt.target;
    if (this.hover.contains(el)) { this.hover.cancelHide(); return; }
    const mod = evt.ctrlKey || evt.metaKey;
    // A rendered anchor can preview without the modifier, so we must resolve over one
    // even when idle; the editor's modifier-gated links don't, so skip the work there.
    const overAnchor = !!(el && el.closest && el.closest('a'));
    if (!this.hover.isVisible() && !this.hover.pendingKey && !mod && !overAnchor) return;
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
    if (!this.hoverEnabled()) return;
    const el = document.elementFromPoint(this.lastX, this.lastY);
    if (this.hover.contains(el)) return;
    const hit = this.entryAtPoint(el, this.lastX, this.lastY);
    if (hit) this.hover.schedule(hit.entry, this.lastX, this.lastY);
  }

  // The code entry under a screen point as { entry, requireMod }, across both render
  // modes, or null. Reading view carries the URL on a rendered anchor and previews on
  // plain hover; Live Preview's CM6 link span has no href (recovered from the editor at
  // those coordinates) and requires the modifier, like a link in the editor natively.
  entryAtPoint(el, x, y) {
    if (!el || !el.closest) return null;
    const a = el.closest('a');
    if (a && !(a.classList && a.classList.contains('internal-link'))) {
      const entry = this.entryUnderPointer(a.textContent, a.getAttribute('href') || a.getAttribute('data-href') || '');
      if (entry) return { entry, requireMod: false };
    }
    if (el.closest('.cm-link')) {
      const view = typeof EditorView.findFromDOM === 'function' ? EditorView.findFromDOM(el) : this.activeCm();
      const ref = view && this.codeRefAt(view, x, y);
      if (ref) {
        const entry = this.entryUnderPointer(ref.name, ref.target);
        if (entry) return { entry, requireMod: true };
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
    if (!name || !target) return null;
    const { dec, cand } = this.linkCandidates(name, target);
    if (cand.length <= 1) return cand[0] || null;
    const onLine = cand.find((e) => new RegExp('[:=]' + e.line + '(?:\\D|$)').test(dec));
    return onLine || cand.find((e) => e.kind !== 'file') || cand[0];
  }

  // CM6 link handler for Live Preview. Suppresses Obsidian's open of the literal
  // {root} URL; opens the resolved one on click/auxclick. Returns true when handled.
  onEditorLink(evt, view, open) {
    if (evt.button !== 0 && evt.button !== 1) return false; // left/middle only; keep right-click menu
    const uri = this.rootUriAt(evt, view);
    if (!uri) return false;
    // return true only prevents CM6's default; stopPropagation keeps the event from
    // reaching Obsidian's document-level opener (which would open the literal URL).
    evt.preventDefault();
    evt.stopPropagation();
    // window.open routes through Obsidian's handler, so the user gets the same native
    // confirmation as any other external link — for editor schemes and file:// alike.
    if (open) window.open(uri);
    return true;
  }

  // The markdown link at screen coords in Live Preview, as { name, target }. The
  // rendered span has no href, so map the coords to a document position and read it.
  codeRefAt(view, x, y) {
    if (typeof view.posAtCoords !== 'function') return null;
    const offset = view.posAtCoords({ x, y });
    if (offset == null) return null;
    const line = view.state.doc.lineAt(offset);
    const ch = offset - line.from;
    const re = linkRegex();
    let m;
    while ((m = re.exec(line.text))) {
      if (ch < m.index || ch > m.index + m[0].length) continue;
      return { name: m[1], target: m[2].trim() };
    }
    return null;
  }

  // The link under the click resolved, if it carries a {root} token (else null,
  // so a plain link falls through to Obsidian's own opener).
  rootUriAt(evt, view) {
    const el = evt.target;
    if (!el || !el.closest || !el.closest('.cm-link')) return null;
    const ref = this.codeRefAt(view, evt.clientX, evt.clientY);
    if (!ref) return null;
    return /\{root\}|%7Broot%7D/i.test(ref.target) ? this.fillRoot(ref.target) : null;
  }

  // Absolute base folder the scan paths are resolved against.
  codeRoot() {
    if (this.settings.codeRoot) return this.settings.codeRoot;
    const adapter = this.app.vault.adapter;
    const base = adapter && typeof adapter.getBasePath === 'function' ? adapter.getBasePath() : '';
    return base ? nodePath.dirname(base) : '';
  }

  // Vault-relative, normalized path of the custom languages file (or "" if unset).
  languagesFilePath() {
    const raw = (this.settings.languagesFile || '').trim();
    return raw ? normalizePath(raw) : '';
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
      if (!enabled.has(lang.id)) continue;
      const pats = lang.patterns.map((p) => [p.regex.source, p.regex.flags, p.kind, p.kindGroup, p.nameGroup]);
      parts.push([lang.id, lang.extensions, pats]);
    }
    // The size limit gates parsing too, so changing it must invalidate the cache.
    return JSON.stringify([this.settings.maxFileSizeKb, parts]);
  }

  async loadCache() {
    try {
      const p = this.cacheFilePath();
      if (!(await this.app.vault.adapter.exists(p))) return;
      const data = JSON.parse(await this.app.vault.adapter.read(p));
      if (!data || data.version !== 1 || !data.files) return;
      this.cacheSignature = data.signature || '';
      this.fileCache = new Map(Object.entries(data.files));
      this.setIndex(this.flattenCache());
    } catch {
      /* corrupt cache: ignore, the rebuild will repopulate it */
    }
  }

  async saveCache() {
    try {
      const files = {};
      for (const [rel, v] of this.fileCache.entries()) files[rel] = v;
      const data = { version: 1, signature: this.cacheSignature, files };
      await this.app.vault.adapter.write(this.cacheFilePath(), JSON.stringify(data));
    } catch {
      /* best-effort: a missing cache only costs a slower next startup */
    }
  }

  flattenCache() {
    const out = [];
    for (const v of this.fileCache.values()) for (const e of v.entries) out.push(e);
    out.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
    return out;
  }

  // Set the index and its name lookup together. byName groups entries by lowercased
  // name so resolving a link/symbol scans only the same-named entries, not the whole
  // index (the hot paths — hover, stale marks, embeds — call this per event).
  setIndex(entries) {
    this.index = entries;
    this.byName = new Map();
    for (const e of entries) {
      const k = e.name.toLowerCase();
      const a = this.byName.get(k);
      if (a) a.push(e); else this.byName.set(k, [e]);
    }
  }

  // Index entries whose (lowercased) name equals `name` — the candidate set a bare
  // symbol resolves against.
  entriesByName(name) {
    return this.byName.get(String(name).toLowerCase()) || [];
  }

  // Decode a link target and return { dec, cand }: the decoded string and the entries
  // whose display name matches and whose path appears in it — the shared first step of
  // resolving a link. Callers apply their own tie-break (hover uses the stored line,
  // actualization must not).
  linkCandidates(name, target) {
    let dec = this.fillRoot(target);
    try { dec = decodeURIComponent(dec); } catch { /* malformed escape: match on the raw form */ }
    dec = dec.split('\\').join('/');
    const named = this.entriesByName(name).filter((e) => e.name === name && pathInTarget(dec, e.path));
    // A shorter path can be a boundary-tail of the real one (Foo.cs inside src/Foo.cs);
    // the longest matching path is the file the link actually points at.
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
      if ((!best || rel.length > best.length) && pathInTarget(dec, rel)) best = rel;
    }
    return best;
  }

  // The single entry a bare symbol resolves to (a declaration preferred over the file
  // entry), or null when the name spans several files (ambiguous) or is unknown.
  uniqueSymbolEntry(name) {
    const named = this.entriesByName(name);
    if (!named.length) return null;
    if (new Set(named.map((e) => e.path)).size > 1) return null;
    return named.find((e) => e.kind !== 'file') || named[0];
  }

  // Extensions of currently enabled languages, used to filter watch events.
  watchedExts() {
    const enabled = new Set(this.settings.enabledLanguages || []);
    const exts = new Set();
    for (const lang of this.languages) {
      if (enabled.has(lang.id)) for (const e of lang.extensions) exts.add(e);
    }
    return exts;
  }

  startWatchers() {
    this.stopWatchers();
    this.watchUnsupported = false;
    if (!this.settings.autoRefresh) return;
    const root = this.codeRoot();
    if (!root) return;
    for (const r of this.scanFolders()) {
      const dir = nodePath.join(root, r);
      if (!fs.existsSync(dir)) continue;
      try {
        const w = fs.watch(dir, { recursive: true }, (_evt, filename) => this.onWatchEvent(r, filename));
        this.watchers.push(w);
      } catch (e) {
        // Recursive watching isn't available on Linux — auto-refresh can't work there.
        if (e && e.code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM') this.watchUnsupported = true;
        /* else: transient FS issue; a manual rebuild re-arms the watchers */
      }
    }
    if (this.watchUnsupported && !this.watchUnsupportedNotified) {
      this.watchUnsupportedNotified = true;
      new Notice(t('notice.watchUnsupported'));
    }
  }

  stopWatchers() {
    for (const w of this.watchers) {
      try {
        w.close();
      } catch {
        /* already closed */
      }
    }
    this.watchers = [];
  }

  // Debounce a background rebuild on file changes. Skip-dir noise (node_modules)
  // and files we don't index are dropped cheaply before scheduling. `r` is the scan
  // root the event came from, so the path can be resolved relative to the code root.
  onWatchEvent(r, filename) {
    if (filename) {
      const base = (r || '').split('\\').join('/').replace(/\/+$/, '');
      const rel = (base ? base + '/' : '') + String(filename).split('\\').join('/');
      if (underSkip(rel, parseSkip(this.settings.skipDirs))) return;
      const ext = nodePath.extname(rel).toLowerCase();
      if (ext && !this.watchedExts().has(ext)) return;
    }
    clearTimeout(this.watchTimer);
    this.watchTimer = setTimeout(() => this.rebuildIndex(false), 1500);
  }

  async loadLanguagesFile() {
    const path = this.languagesFilePath();
    this.customRaw = '';
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

  // Write the starter languages file at the configured path (if it doesn't exist yet),
  // then load and index it. Backs the "Create file" button in settings.
  async createLanguagesFile() {
    const path = this.languagesFilePath();
    if (!path) { new Notice(t('notice.langFileNoPath')); return; }
    if (this.app.vault.getAbstractFileByPath(path)) { new Notice(t('notice.langFileExists')); return; }
    try {
      await this.app.vault.create(path, LANGUAGES_TEMPLATE);
    } catch (e) {
      new Notice(t('notice.langFileError', { error: e && e.message }));
      return;
    }
    await this.loadLanguagesFile();
    await this.rebuildIndex(false);
    new Notice(t('notice.langFileCreated', { path }));
  }

  // Open the languages file for editing. It's JSON, which Obsidian can't show in a leaf
  // (that opens a blank tab), so hand it to the OS default editor.
  openLanguagesFile() {
    const path = this.languagesFilePath();
    if (!path || !this.app.vault.getAbstractFileByPath(path)) return;
    if (typeof this.app.openWithDefaultApp === 'function') { this.app.openWithDefaultApp(path); return; }
    const adapter = this.app.vault.adapter;
    const base = adapter && typeof adapter.getBasePath === 'function' ? adapter.getBasePath() : '';
    if (base) window.open('file:///' + encodeURI(nodePath.join(base, path).split(nodePath.sep).join('/')));
  }

  // Merge built-ins with the languages file, compile every regex.
  compileLanguages() {
    const merged = new Map();
    for (const l of BUILTIN_LANGUAGES) merged.set(l.id, l);
    this.languageErrors = [];

    const raw = (this.customRaw || '').trim();
    if (raw) {
      let arr = null;
      try {
        arr = JSON.parse(raw);
      } catch (e) {
        this.languageErrors.push({ id: '(languages file)', error: 'invalid JSON: ' + e.message });
      }
      if (Array.isArray(arr)) {
        for (const def of arr) {
          if (!def || typeof def.id !== 'string') {
            this.languageErrors.push({ id: (def && def.id) || '(unknown)', error: 'missing string id' });
            continue;
          }
          merged.set(def.id, def);
        }
      } else if (arr != null) {
        this.languageErrors.push({ id: '(languages file)', error: 'expected a JSON array' });
      }
    }

    const out = [];
    for (const def of merged.values()) {
      const extensions = Array.isArray(def.extensions) ? def.extensions.map((e) => String(e).toLowerCase()) : [];
      const patterns = [];
      for (const p of def.patterns || []) {
        try {
          patterns.push({
            regex: new RegExp(p.re, p.flags || ''),
            kind: p.kind,
            kindGroup: p.kindGroup,
            nameGroup: p.nameGroup,
          });
        } catch (e) {
          this.languageErrors.push({ id: def.id, error: `bad regex: ${e.message}` });
        }
      }
      // Optional: the Prism grammar id used to highlight this language in hover
      // previews (e.g. "rust"). Built-ins are mapped by PRISM_LANG instead.
      const prism = typeof def.prism === 'string' ? def.prism.trim() : '';
      out.push({ id: def.id, name: def.name || def.id, extensions, patterns, prism });
    }
    this.languages = out;
  }

  // The Prism grammar id for a language id: a custom language's own `prism` field
  // wins, then the built-in mapping, then the id itself (so e.g. "rust" works when
  // Prism has it). hover.js falls back to plain text / c-like when it doesn't.
  prismIdFor(langId) {
    const lang = this.languages.find((l) => l.id === langId);
    if (lang && lang.prism) return lang.prism;
    return PRISM_LANG[langId] || langId;
  }

  // Empty the index (nothing to scan) and persist, telling whoever's listening.
  async resetIndex(noticeKey, notify) {
    this.setIndex([]);
    this.fileCache = new Map();
    await this.saveCache();
    this.notifyIndexChange();
    if (notify) new Notice(t(noticeKey));
  }

  async rebuildIndex(notify) {
    this.stopWatchers();
    const root = this.codeRoot();
    if (!root) {
      if (notify) new Notice(t('notice.noCodeRoot'));
      return;
    }
    const roots = this.scanFolders();

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
      await this.resetIndex('notice.noLanguages', notify);
      return;
    }

    // Reuse cached entries only while the config fingerprint matches; otherwise
    // every file is re-parsed (file mtimes don't move when patterns change).
    const signature = this.indexSignature();
    const old = signature === this.cacheSignature ? this.fileCache : new Map();
    // Update the status bar every 200th file, not every file, to spare layout.
    let seen = 0;
    const onFile = () => { if (++seen % 200 === 0) this.statusEl.setText(t('status.indexing', { n: seen })); };
    const scan = { root, byExt, skip: parseSkip(this.settings.skipDirs), old, next: new Map(), onFile };
    try {
      for (const r of roots) {
        await this.walk(nodePath.join(root, r), scan);
      }
    } catch (err) {
      this.statusEl.setText('');
      if (notify) new Notice(t('notice.scanFailed', { error: err && err.message }));
      return;
    }
    this.statusEl.setText('');

    this.fileCache = scan.next;
    this.cacheSignature = signature;
    this.setIndex(this.flattenCache());
    await this.saveCache();
    this.notifyIndexChange();
    this.startWatchers();
    if (notify) {
      const missing = this.scanRootStatus().filter((st) => !st.exists).map((st) => st.rel);
      if (missing.length) new Notice(t('notice.missingFolders', { folders: missing.join(', ') }));
      else new Notice(t('notice.indexed', { entries: plural('entry', this.index.length) }));
    }
  }

  async walk(absDir, scan) {
    let items;
    try {
      items = await fsp.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const it of items) {
      const abs = nodePath.join(absDir, it.name);
      if (it.isDirectory()) {
        const rel = nodePath.relative(scan.root, abs).split(nodePath.sep).join('/');
        if (!underSkip(rel, scan.skip)) await this.walk(abs, scan);
      } else if (it.isFile()) {
        const langs = scan.byExt.get(nodePath.extname(it.name).toLowerCase());
        if (langs) await this.indexFile(abs, langs, scan);
      }
    }
  }

  async indexFile(abs, langs, scan) {
    const rel = nodePath.relative(scan.root, abs).split(nodePath.sep).join('/');
    let stat;
    try {
      stat = await fsp.stat(abs);
    } catch {
      return;
    }
    if (scan.onFile) scan.onFile();
    const cached = scan.old.get(rel);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      scan.next.set(rel, cached);
      return;
    }

    const base = nodePath.basename(abs).replace(/\.[^.]+$/, '');
    const entries = [{ name: base, kind: 'file', lang: langs[0].id, path: rel, line: 1 }];

    // Oversized files keep only the file-level entry — findable, but not read into
    // memory. maxFileSizeKb === 0 means no limit.
    const maxBytes = Math.max(0, this.settings.maxFileSizeKb || 0) * 1024;
    if (!maxBytes || stat.size <= maxBytes) {
      try {
        await this.parseLines(abs, langs, rel, entries);
      } catch {
        /* unreadable: keep the file-level entry alone */
      }
    }
    scan.next.set(rel, { mtimeMs: stat.mtimeMs, entries });
  }

  // Stream line by line so we never hold the whole file plus a lines[] array at
  // once; appends each declaration it finds to `entries`.
  parseLines(abs, langs, rel, entries) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(abs, { encoding: 'utf8' });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      let i = 0;
      rl.on('line', (line) => {
        i++;
        if (line.length > MAX_PARSE_LINE_LENGTH) return;
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
              kind = p.kind || 'type';
              name = m[p.nameGroup != null ? p.nameGroup : 1];
            }
            if (name) entries.push({ name, kind, lang: lang.id, path: rel, line: i });
          }
        }
      });
      rl.on('close', resolve);
      stream.on('error', reject);
    });
  }

  // {root} stays in the link for portability (resolved on render/click); call
  // fillRoot() on the result when opening the URI directly, with no note involved.
  // `template` overrides the default preset (used by "Always ask"/"Insert as…").
  buildUri(e, template) {
    const root = this.codeRoot();
    const absFs = root ? nodePath.join(root, e.path) : e.path;
    const absFwd = absFs.split(nodePath.sep).join('/');
    const line = String(e.line || 1);
    // First path segment is a reasonable default for IDE "project" placeholders.
    const project = (e.path.split('/')[0] || '').trim();
    const product = this.settings.jetbrainsProduct || 'idea';
    // Encode names from disk so a #, ?, & or space can't rewrite the URL (e.g.
    // JetBrains' ?project=&path= query). {abs} keeps encodeURI for the drive
    // colon (C:); path segments use encodeURIComponent, which has no colon.
    const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');
    return (template || this.settings.uriTemplate)
      .replace(/{abs}/g, encodeURI(absFwd))
      .replace(/{path}/g, encPath(e.path))
      .replace(/{line}/g, line)
      .replace(/{name}/g, encodeURIComponent(e.name))
      .replace(/{project}/g, encodeURIComponent(project))
      .replace(/{product}/g, product);
  }

  // The markdown link to insert. Inside a table cell a literal pipe splits the row.
  buildLink(e, inTable, template) {
    const link = `[${e.name}](${this.buildUri(e, template)})`;
    return inTable ? link.replace(/\|/g, '\\|') : link;
  }

  pickEntry(onChoose, query) {
    new CodeLinkModal(this.app, this, { onChoose, query }).open();
  }

  insertLink(editor, e, template) {
    const inTable = inTableCell(editor.getValue(), editor.posToOffset(editor.getCursor('from')));
    editor.replaceSelection(this.buildLink(e, inTable, template));
  }

  // The ```code-link block bodies offered for an entry: a unique symbol embeds by name
  // (so it tracks the declaration as code moves), plus precise by-line and by-range forms.
  // A range shows a window of code; add a `context: N` line by hand to pad the others.
  embedFormats(e) {
    const line = e.line || 1;
    // A symbol embed is safe only when the name resolves to one file (a file + its own
    // same-named declaration aren't ambiguous — uniqueSymbolEntry handles that).
    const unique = e.kind !== 'file' && !!this.uniqueSymbolEntry(e.name);
    const out = [];
    if (unique) out.push({ label: t('embed.fmt.symbol'), body: e.name });
    out.push({ label: t('embed.fmt.line', { line }), body: e.path + ':' + line });
    out.push({ label: t('embed.fmt.range', { from: line, to: line + 10 }), body: e.path + ':' + line + '-' + (line + 10) });
    return out;
  }

  insertEmbed(editor, e) {
    const formats = this.embedFormats(e);
    new PresetPickerModal(this.app, formats, (f) => {
      editor.replaceSelection('```code-link\n' + f.body + '\n```\n');
    }, t('modal.embedPlaceholder')).open();
  }

  // The selectable presets — built-ins then the user's own — as { key, label, template },
  // where key is the value the settings dropdown stores ('u:<i>' for a user editor).
  editorPresets() {
    const out = [
      { key: 'file', label: t('set.preset.file'), template: PRESETS.file },
      { key: 'vscode', label: t('set.preset.vscode'), template: PRESETS.vscode },
      { key: 'jetbrains', label: t('set.preset.jetbrains'), template: PRESETS.jetbrains },
    ];
    (this.settings.editors || []).forEach((e, i) =>
      out.push({ key: 'u:' + i, label: e.name || `Editor ${i + 1}`, template: e.template }));
    return out;
  }

  updateStatusBar() {
    const el = this.editorStatusEl;
    if (!el) return;
    if (!this.settings.showStatusBar) { el.hide(); return; }
    const p = this.editorPresets().find((x) => x.template === this.settings.uriTemplate);
    const name = this.settings.askOnInsert ? t('set.preset.ask') : (p ? p.label : this.settings.uriTemplate);
    el.show();
    el.setText(t('status.editor', { name }));
  }

  // Pick a preset from `items`; when JetBrains is chosen, follow with the IDE picker.
  // Calls done(preset, ide) — ide is { key, label } for JetBrains, else null.
  pickPreset(items, placeholder, done) {
    new PresetPickerModal(this.app, items, (p) => {
      if (p.key !== 'jetbrains') return done(p, null);
      const ides = JETBRAINS_PRODUCTS.map(([key, label]) => ({ key, label }));
      new PresetPickerModal(this.app, ides, (ide) => done(p, ide), t('modal.productPlaceholder')).open();
    }, placeholder).open();
  }

  // Run `run(template)` for a link action, prompting for the format only when `ask`
  // is set (always-ask mode or the "…as" command); a JetBrains IDE bakes into the template.
  withFormat(ask, run) {
    if (!ask) { run(undefined); return; }
    this.pickPreset(this.editorPresets(), t('modal.formatPlaceholder'), (p, ide) =>
      run(ide ? p.template.replace('{product}', ide.key) : p.template));
  }

  // Switch the default preset (or "Always ask") without opening settings; a chosen
  // JetBrains IDE also updates the JetBrains IDE setting.
  switchPreset() {
    const items = this.editorPresets().concat({ key: 'ask', label: t('set.preset.ask') });
    this.pickPreset(items, t('modal.switchPlaceholder'), async (p, ide) => {
      this.settings.askOnInsert = p.key === 'ask';
      if (p.key !== 'ask') {
        this.settings.uriTemplate = p.template;
        if (ide) this.settings.jetbrainsProduct = ide.key;
      }
      await this.saveSettings();
      new Notice(t('notice.editorSet', { name: ide ? ide.label : p.label }));
    });
  }

  copyLink(e, template) {
    navigator.clipboard.writeText(this.buildLink(e, false, template));
    new Notice(t('notice.copied'));
  }

  // fillRoot resolves the portable {root} token, since there's no note to render it.
  openEntry(e, template) {
    window.open(this.fillRoot(this.buildUri(e, template)));
  }

  // Entries matched by name, or by path tail so a selected "Foo/Bar.cs" resolves too.
  lookup(text) {
    const q = text.trim();
    if (!q) return [];
    const lc = q.toLowerCase();
    const norm = lc.split('\\').join('/');
    const out = [];
    for (const e of this.index) {
      const p = e.path.toLowerCase();
      if (e.name.toLowerCase() === lc || p === norm || p.endsWith('/' + norm)) out.push(e);
    }
    return out;
  }

  selectionOrWord(editor) {
    const sel = editor.getSelection();
    if (sel) return { text: sel, from: editor.getCursor('from'), to: editor.getCursor('to') };
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line);
    const isWord = (ch) => ch && /[\w./\\-]/.test(ch);
    let s = cur.ch, en = cur.ch;
    while (s > 0 && isWord(line[s - 1])) s--;
    while (en < line.length && isWord(line[en])) en++;
    const text = line.slice(s, en);
    return text ? { text, from: { line: cur.line, ch: s }, to: { line: cur.line, ch: en } } : null;
  }

  // The selection/word to act on, or null when it makes no sense there. Never inside an
  // existing link (both actions). For `write` (convert-to-link) also never inside code or
  // frontmatter, where inserting a link would corrupt the sample; opening code from there
  // is harmless, so read-only actions are allowed.
  selectionTarget(editor, write) {
    const target = this.selectionOrWord(editor);
    if (!target) return null;
    const text = editor.getValue();
    const off = editor.posToOffset(target.from);
    if (inLink(text, off)) return null;
    if (write && inCode(text, off)) return null;
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
    while ((m = re.exec(line))) {
      if (cur.ch >= m.index && cur.ch <= m.index + m[0].length) {
        return { name: m[1], target: m[2], line: cur.line, from: m.index, to: m.index + m[0].length };
      }
    }
    return null;
  }

  fixLinkAtCursor(editor, link) {
    const target = this.actualizedTarget(link.name, link.target);
    if (target == null) { new Notice(t('notice.linksUpdated', { n: 0 })); return; }
    editor.replaceRange('[' + link.name + '](' + target + ')', { line: link.line, ch: link.from }, { line: link.line, ch: link.to });
    new Notice(t('notice.linksUpdated', { n: 1 }));
  }

  // Run the selected (or under-cursor) token through the index: a single match runs
  // `action`, several open the picker, none notifies. `write` gates the protected-range
  // check (convert may not run in code; open may).
  resolveSelection(editor, action, write) {
    const target = this.selectionTarget(editor, write);
    if (!target) { new Notice(t('notice.noSelection')); return; }
    const matches = this.lookup(target.text);
    if (!matches.length) { new Notice(t('notice.noMatch', { query: target.text })); return; }
    const run = (e) => action(e, target);
    if (matches.length === 1) run(matches[0]);
    else this.pickEntry(run, target.text);
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
    return roots.length ? roots : ['.'];
  }

  scanRootStatus() {
    const root = this.codeRoot();
    return this.scanFolders().map((rel) => ({
      rel,
      exists: !!root && fs.existsSync(nodePath.join(root, rel)),
    }));
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateStatusBar();
  }
}

Object.assign(CodeLinkerPlugin.prototype, api);
Object.assign(CodeLinkerPlugin.prototype, actualize.methods);

module.exports = CodeLinkerPlugin;
