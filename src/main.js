'use strict';
// Code Linker — autocomplete references to source-code files and types.
//
// Type the trigger (default "@@") followed by a class/file name; pick a match
// to insert a markdown link whose URL opens the file at its line in your editor.
//
// The plugin scans the configured folders itself (Node fs, desktop only) and
// keeps the index in memory — no external build step or index file.

const { Plugin, Notice, normalizePath } = require('obsidian');
const { EditorView } = require('@codemirror/view');
const { Prec } = require('@codemirror/state');
const fs = require('fs');
const fsp = fs.promises;
const readline = require('readline');
const nodePath = require('path');

const { PRESETS, JETBRAINS_PRODUCTS, DEFAULT_SETTINGS, splitLines, inTableCell } = require('./constants');

// A declaration line is never this wide; the cap bounds backtracking from a
// greedy user regex on a minified file so indexing can't hang.
const MAX_PARSE_LINE_LENGTH = 2000;
const { BUILTIN_LANGUAGES } = require('./builtin-languages');
const { CodeIndexSuggest } = require('./suggest');
const { CodeLinkModal, PresetPickerModal } = require('./modal');
const { CodeLinkerSettingTab } = require('./settings-tab');
const { initI18n, t, plural } = require('./i18n');
const api = require('./api');

class CodeLinkerPlugin extends Plugin {
  async onload() {
    initI18n();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.index = [];
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
    this.addSettingTab(new CodeLinkerSettingTab(this.app, this));
    this.statusEl = this.addStatusBarItem();
    this.editorStatusEl = this.addStatusBarItem();
    this.editorStatusEl.addClass('mod-clickable');
    this.editorStatusEl.setAttribute('aria-label', t('status.editorTooltip'));
    this.editorStatusEl.addEventListener('click', () => this.switchPreset());
    this.updateStatusBar();
    this.addCommand({ id: 'rebuild-code-index', name: t('cmd.rebuildIndex'), callback: () => this.rebuildIndex(true) });
    this.addCommand({ id: 'insert-code-link', name: t('cmd.insertLink'), editorCallback: (editor) => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.insertLink(editor, e, tpl))) });
    this.addCommand({ id: 'insert-code-link-as', name: t('cmd.insertLinkAs'), editorCallback: (editor) => this.pickEntry((e) => this.withFormat(true, (tpl) => this.insertLink(editor, e, tpl))) });
    this.addCommand({ id: 'switch-editor-preset', name: t('cmd.switchPreset'), callback: () => this.switchPreset() });
    this.addCommand({ id: 'open-code-file', name: t('cmd.openFile'), callback: () => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.openEntry(e, tpl))) });
    this.addCommand({ id: 'copy-code-link', name: t('cmd.copyLink'), callback: () => this.pickEntry((e) => this.withFormat(this.settings.askOnInsert, (tpl) => this.copyLink(e, tpl))) });
    this.addCommand({ id: 'convert-selection-to-link', name: t('cmd.convertSelection'), editorCallback: (editor) => this.convertSelection(editor) });
    this.addCommand({ id: 'open-selected-code', name: t('cmd.openSelection'), editorCallback: (editor) => this.openSelection(editor) });

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        if (!this.settings.contextMenu || !this.selectionOrWord(editor)) return;
        menu.addItem((item) => item.setTitle(t('menu.convert')).setIcon('link').onClick(() => this.convertSelection(editor)));
        menu.addItem((item) => item.setTitle(t('cmd.openSelection')).setIcon('file-search').onClick(() => this.openSelection(editor)));
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

  // The markdown link under the click, if it carries a {root} token, resolved. The
  // rendered span has no href, so map the click to a document position and read it.
  rootUriAt(evt, view) {
    const el = evt.target;
    if (!el || !el.closest || !el.closest('.cm-link')) return null;
    if (typeof view.posAtCoords !== 'function') return null;
    const offset = view.posAtCoords({ x: evt.clientX, y: evt.clientY });
    if (offset == null) return null;
    const line = view.state.doc.lineAt(offset);
    const ch = offset - line.from;
    const re = /\[[^\]]*\]\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(line.text))) {
      if (ch < m.index || ch > m.index + m[0].length) continue;
      const tgt = m[1].trim();
      return /\{root\}|%7Broot%7D/i.test(tgt) ? this.fillRoot(tgt) : null;
    }
    return null;
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
      this.index = this.flattenCache();
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
    for (const r of splitLines(this.settings.scanRoots)) {
      const dir = nodePath.join(root, r);
      if (!fs.existsSync(dir)) continue;
      try {
        const w = fs.watch(dir, { recursive: true }, (_evt, filename) => this.onWatchEvent(filename));
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
  // and files we don't index are dropped cheaply before scheduling.
  onWatchEvent(filename) {
    if (filename) {
      const name = String(filename);
      const skip = new Set(splitLines(this.settings.skipDirs));
      if (name.split(/[\\/]/).some((s) => skip.has(s))) return;
      const ext = nodePath.extname(name).toLowerCase();
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
      out.push({ id: def.id, name: def.name || def.id, extensions, patterns });
    }
    this.languages = out;
  }

  // Empty the index (nothing to scan) and persist, telling whoever's listening.
  async resetIndex(noticeKey, notify) {
    this.index = [];
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
    const roots = splitLines(this.settings.scanRoots);
    if (!roots.length) {
      await this.resetIndex('notice.noScanFolders', notify);
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
    const scan = { root, byExt, skip: new Set(splitLines(this.settings.skipDirs)), old, next: new Map(), onFile };
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
    this.index = this.flattenCache();
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
        if (!scan.skip.has(it.name)) await this.walk(abs, scan);
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

  // Run the selected (or under-cursor) token through the index: a single match runs
  // `action`, several open the picker, none notifies.
  resolveSelection(editor, action) {
    const target = this.selectionOrWord(editor);
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
    }));
  }

  openSelection(editor) {
    this.resolveSelection(editor, (e) => this.withFormat(this.settings.askOnInsert, (template) => this.openEntry(e, template)));
  }

  scanRootStatus() {
    const root = this.codeRoot();
    return splitLines(this.settings.scanRoots).map((rel) => ({
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

module.exports = CodeLinkerPlugin;
