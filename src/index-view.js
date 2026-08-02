'use strict';

const { ItemView, Notice } = require('obsidian');
const { t, plural } = require('./shared/i18n');
const { scanVault } = require('./shared/update-preview');
const { rewriteUpdates } = require('./actualize');

const INDEX_VIEW_TYPE = 'code-index';

// Right-sidebar panel: what the scan found, and which links in the vault no longer land. The
// index half is free — it is already in memory. The links half reads every note, so it only
// runs when asked.
class CodeIndexView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.query = '';
    this.open = new Set();
    this.notes = null; // null until the first scan, so "none" and "not looked" read apart
  }

  getViewType() { return INDEX_VIEW_TYPE; }
  getDisplayText() { return t('view.index.title'); }
  getIcon() { return 'file-code'; }

  async onOpen() {
    this.contentEl.addClass('code-linker-index');
    this.unsubscribe = this.plugin.onIndexChange(() => this.render());
    this.render();
  }

  async onClose() {
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    const root = this.contentEl;
    root.empty();
    this.renderSearch(root);
    this.renderIndex(root);
    this.renderLinks(root);
  }

  head(el, label, count) {
    const h = el.createDiv({ cls: 'code-linker-index-head' });
    h.createSpan({ text: count == null ? label : `${label} (${count})` });
    return h;
  }

  renderSearch(root) {
    const bar = root.createDiv({ cls: 'code-linker-index-bar' });
    const input = bar.createEl('input', { type: 'search', placeholder: t('view.index.search') });
    input.value = this.query;
    input.oninput = () => { this.query = input.value; this.renderMatches(); };
    bar.createEl('button', { text: t('view.index.rebuild') }).onclick = () => this.plugin.rebuildIndex(true);
    this.matchesEl = root.createDiv();
    this.renderMatches();
  }

  // Matching is by name, not by the inline filter grammar: a panel is for looking, and the
  // trigger in a note is where a query belongs.
  renderMatches() {
    if (!this.matchesEl) return;
    const el = this.matchesEl;
    el.empty();
    const q = this.query.trim().toLowerCase();
    if (!q) return;
    const hits = this.plugin.index.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 50);
    this.head(el, t('view.index.matches'), hits.length);
    if (!hits.length) { el.createDiv({ cls: 'code-linker-index-empty', text: t('view.index.noMatches') }); return; }
    for (const e of hits) this.entryRow(el, e);
  }

  entryRow(el, e) {
    const row = el.createDiv({ cls: 'code-linker-index-row' });
    const name = row.createSpan({ cls: 'code-linker-index-name is-link', text: e.name });
    name.onclick = () => this.plugin.withFormat(this.plugin.settings.askOnInsert, (tpl) => this.plugin.openEntry(e, tpl));
    row.createSpan({ cls: 'code-linker-index-kind', text: e.kind });
    row.createSpan({ cls: 'code-linker-index-path', text: e.path });
    const copy = row.createSpan({ cls: 'code-linker-index-act is-link', text: t('view.index.copy') });
    copy.onclick = () => this.plugin.withFormat(this.plugin.settings.askOnInsert, (tpl) => this.plugin.copyLink(e, tpl));
  }

  // Languages, and the kinds inside each. Counting is over the whole index rather than the
  // enabled kinds: what was scanned is the question here, not what a query would offer.
  renderIndex(root) {
    const el = root.createDiv();
    const byLang = new Map();
    for (const e of this.plugin.index) {
      const kinds = byLang.get(e.lang) || new Map();
      kinds.set(e.kind, (kinds.get(e.kind) || 0) + 1);
      byLang.set(e.lang, kinds);
    }
    this.head(el, t('view.index.index'), this.plugin.index.length);
    if (!byLang.size) { el.createDiv({ cls: 'code-linker-index-empty', text: t('view.index.empty') }); return; }
    const langs = [...byLang.keys()].sort();
    for (const lang of langs) {
      const kinds = byLang.get(lang);
      const total = [...kinds.values()].reduce((a, b) => a + b, 0);
      const open = this.open.has(lang);
      const row = el.createDiv({ cls: 'code-linker-index-row is-toggle' });
      row.createSpan({ cls: 'code-linker-index-caret', text: open ? '▾' : '▸' });
      row.createSpan({ cls: 'code-linker-index-name', text: this.languageName(lang) });
      row.createSpan({ cls: 'code-linker-index-count', text: String(total) });
      row.onclick = () => { if (open) this.open.delete(lang); else this.open.add(lang); this.render(); };
      if (!open) continue;
      for (const kind of [...kinds.keys()].sort()) {
        const sub = el.createDiv({ cls: 'code-linker-index-row is-sub' });
        sub.createSpan({ cls: 'code-linker-index-name', text: kind });
        sub.createSpan({ cls: 'code-linker-index-count', text: String(kinds.get(kind)) });
      }
    }
  }

  renderLinks(root) {
    const el = root.createDiv();
    const h = this.head(el, t('view.index.links'), this.notes ? this.notes.length : null);
    h.createEl('button', { text: t('view.index.scan') }).onclick = () => this.scan();
    if (!this.notes) { el.createDiv({ cls: 'code-linker-index-empty', text: t('view.index.notScanned') }); return; }
    if (!this.notes.length) { el.createDiv({ cls: 'code-linker-index-empty', text: t('view.index.allWell') }); return; }

    const stale = this.notes.reduce((n, x) => n + x.changes.length, 0);
    const broken = this.notes.reduce((n, x) => n + x.broken.length, 0);
    const sum = el.createDiv({ cls: 'code-linker-index-summary' });
    sum.createSpan({ text: t('view.index.found', { stale: plural('staleLink', stale), broken: plural('brokenLink', broken) }) });
    if (stale) {
      sum.createEl('button', { text: t('view.index.fixAll'), cls: 'mod-cta' }).onclick = () => this.plugin.updateLinksInVault();
    }
    for (const n of this.notes) {
      const row = el.createDiv({ cls: 'code-linker-index-row' });
      const name = row.createSpan({ cls: 'code-linker-index-name is-link', text: n.label });
      name.onclick = () => this.app.workspace.openLinkText(n.file.path, '', false);
      if (n.changes.length) row.createSpan({ cls: 'code-linker-index-count', text: plural('staleLink', n.changes.length) });
      if (n.broken.length) row.createSpan({ cls: 'code-linker-index-count is-broken', text: plural('brokenLink', n.broken.length) });
    }
  }

  // A language the index carries may have been switched off since; its id is still better than
  // nothing, so it stands in rather than the row vanishing.
  languageName(id) {
    const l = (this.plugin.languages || []).find((x) => x.id === id);
    return (l && l.name) || id;
  }

  // The walk reads every note, so one unreadable or concurrently deleted file must not leave
  // the button doing nothing and a rejection in the console. A failed scan stays "not scanned"
  // rather than empty: an empty result reads as "every link lands", which it did not prove.
  async scan() {
    try {
      this.notes = await scanVault(this.plugin, rewriteUpdates);
    } catch {
      this.notes = null;
      new Notice(t('view.index.scanFailed'));
    }
    this.render();
  }
}

module.exports = { CodeIndexView, INDEX_VIEW_TYPE };
