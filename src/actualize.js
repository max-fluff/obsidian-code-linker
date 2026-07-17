'use strict';

// Keeping stored links current with the code. A link freezes a line at insert time; as
// code moves, that line drifts. These helpers re-resolve a link against the live index,
// mark the drifted ones, and (on an explicit command) rewrite the line. Nothing is
// rewritten automatically.
//
// Only a pinned link is tracked: its title says what it holds on to (see shared/binding).
// An unpinned one is left alone — never marked, never rewritten. Nothing is inferred from
// the link's text, which is the reader's prose.

const { Notice, MarkdownView } = require('obsidian');
const { ViewPlugin, Decoration } = require('@codemirror/view');
const { RangeSetBuilder, StateEffect } = require('@codemirror/state');
const { syntaxTree } = require('@codemirror/language');
const { linkRegex, splitTarget, withTitle, rewriteLinks, rewriteFences } = require('./shared/markdown');
const { LINE_RE, parseBinding } = require('./shared/binding');
const { parseSpec, setBindLine } = require('./embed');
const { UpdatePreviewModal } = require('./modal');
const { t } = require('./shared/i18n');

// CM6 syntax-node names for contexts where a link is example text, not a live link.
const SKIP_NODE = /code|comment|frontmatter/i;
const EMBED_LANG = 'code-link';

// One pass over a note's links and embeds. `selected` null is a dry run: apply every fix to
// build the preview and record each change under a key (its order of appearance). A set of
// keys applies only those — same walk, same order, so keys line up as long as the note is
// unchanged (the write guard ensures it). Broken items are collected in the dry run only.
const rewriteUpdates = (plugin, text, selected) => {
  const lineOf = (t) => { const m = LINE_RE.exec(t); return m ? m[1] : ''; };
  const collect = selected == null;
  const changes = [];
  const broken = [];
  let key = 0;
  const links = rewriteLinks(text, (name, target) => {
    const r = bindStateOf(plugin, target);
    if (r && r.state === 'stale') {
      const k = key++;
      // lineOf reads the url only: a line:<hash> title can carry digits that would fool the
      // line pattern if the whole target were scanned.
      const { url, title } = splitTarget(target);
      if (collect) {
        const row = { key: k, label: name, from: lineOf(url), to: String(r.line) };
        if (r.move) { row.fromPath = r.move.from; row.toPath = r.move.to; }
        changes.push(row);
      }
      if (!collect && !selected.has(k)) return null;
      const fixedUrl = r.url != null ? r.url : url.replace(LINE_RE, ':' + r.line);
      return '[' + name + '](' + withTitle(fixedUrl, title) + ')';
    }
    if (collect && r && r.state === 'broken') broken.push(name);
    return null;
  });
  const embeds = rewriteFences(links.text, EMBED_LANG, (body) => {
    const d = plugin.embedDrift(body);
    if (!d) return null;
    if (d.state === 'broken') { if (collect) broken.push(d.path); return null; }
    const k = key++;
    if (collect) changes.push({ key: k, label: d.path, from: d.from, to: d.to });
    if (!collect && !selected.has(k)) return null;
    return d.out;
  });
  return { newText: embeds.text, count: links.count + embeds.count, changes, broken };
};

// Pin every unpinned link and embed to the chosen anchors on its line — how notes written
// before pinning existed get their tracking back, in one go. A link that already carries a
// title, or an embed that already has a bind: line, is left alone: it's either pinned, or a
// tooltip that's none of our business.
const pinLinksInText = (anchors) => (plugin, text) => {
  const links = rewriteLinks(text, (name, target) => {
    const { url, title } = splitTarget(target);
    if (title) return null;
    const bind = plugin.buildPinTitle(plugin.linkSite(target), anchors);
    return bind ? '[' + name + '](' + withTitle(url, bind) + ')' : null;
  });
  const embeds = rewriteFences(links.text, EMBED_LANG, (body) => {
    const spec = parseSpec(body.join('\n'));
    if (spec.bind) return null;
    const bind = plugin.buildPinTitle(plugin.embedSite(spec), anchors);
    return bind ? setBindLine(body, bind) : null;
  });
  return { text: embeds.text, count: links.count + embeds.count };
};

// A CM6 refresh signal, dispatched when the index changes so Live Preview re-scans stale
// marks without waiting for the next edit or scroll.
const refreshEffect = StateEffect.define();

function refreshStaleLinks(app) {
  app.workspace.iterateAllLeaves((leaf) => {
    const cm = leaf.view && leaf.view.editor && leaf.view.editor.cm;
    if (cm) cm.dispatch({ effects: refreshEffect.of(null) });
  });
}

// Live Preview underline for drifted links. Links inside code are skipped via the syntax
// tree — they're example text, so the commands won't touch them and marking them would
// only mislead.
function staleLinksExtension(plugin) {
  const marks = {
    stale: Decoration.mark({ class: 'code-linker-stale' }),
    broken: Decoration.mark({ class: 'code-linker-broken' }),
  };
  const build = (view) => {
    const builder = new RangeSetBuilder();
    if (plugin.settings.markStaleLinks) {
      const tree = syntaxTree(view.state);
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        const re = linkRegex();
        let m;
        while ((m = re.exec(text))) {
          const start = from + m.index;
          const end = start + m[0].length;
          let inCodeNode = false;
          tree.iterate({ from: start, to: end, enter: (n) => { if (SKIP_NODE.test(n.type.name)) inCodeNode = true; } });
          const state = inCodeNode ? null : plugin.linkState(m[2]);
          if (state) builder.add(start, end, marks[state]);
        }
      }
    }
    return builder.finish();
  };
  return ViewPlugin.fromClass(
    class {
      constructor(view) { this.decorations = build(view); }
      update(u) {
        const refresh = u.transactions.some((tr) => tr.effects.some((e) => e.is(refreshEffect)));
        if (u.docChanged || u.viewportChanged || refresh) this.decorations = build(u.view);
      }
    },
    { decorations: (v) => v.decorations }
  );
}

// What a link's binding says about where it points, or null when there's nothing to
// judge: no line, or no binding to judge it against.
function bindStateOf(plugin, target) {
  const { url, title } = splitTarget(target);
  const m = url && LINE_RE.exec(url);
  const b = parseBinding(title);
  return m && b ? plugin.urlBindState(url, b, parseInt(m[1], 10)) : null;
}

// Mixed into the plugin prototype (like api.js); `this` is the plugin.
const methods = {
  linkState(target) {
    const r = bindStateOf(this, target);
    return r ? r.state : null;
  },

  isLinkStale(target) {
    return this.linkState(target) === 'stale';
  },

  // The link target with its line corrected, or null when there's nothing to fix. Shared
  // by the note/vault commands and the right-click fix.
  actualizedTarget(target) {
    const r = bindStateOf(this, target);
    if (!r || r.state !== 'stale') return null;
    const { url, title } = splitTarget(target);
    // A move already carries its fully rewritten url (path and line); a drift within the
    // file only needs the line swapped.
    return withTitle(r.url != null ? r.url : url.replace(LINE_RE, ':' + r.line), title);
  },

  // An open editor keeps cursor and undo; in reading view there's none, so the active
  // file is rewritten through the vault.
  async rewriteActiveNote(transform, noticeKey) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view && view.editor;
    if (editor) {
      const { text, count } = transform(this, editor.getValue());
      if (count) { const cur = editor.getCursor(); editor.setValue(text); editor.setCursor(cur); }
      new Notice(t(noticeKey, { n: count }));
      return;
    }
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice(t(noticeKey, { n: 0 })); return; }
    const { text, count } = transform(this, await this.app.vault.read(file));
    if (count) await this.app.vault.modify(file, text);
    new Notice(t(noticeKey, { n: count }));
  },

  async rewriteVault(transform, noticeKey) {
    let files = 0, total = 0;
    for (const f of this.app.vault.getMarkdownFiles()) {
      const { text, count } = transform(this, await this.app.vault.read(f));
      if (count) { await this.app.vault.modify(f, text); files++; total += count; }
    }
    new Notice(t(noticeKey, { n: total, files }));
  },

  // Both update commands preview first: an open editor is previewed and written through the
  // editor (cursor and undo survive), everything else through the vault.
  async updateLinksInActiveNote() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view && view.editor;
    const file = this.app.workspace.getActiveFile();
    if (editor) {
      const original = editor.getValue();
      const c = rewriteUpdates(this, original, null);
      this.openUpdatePreview([{ editor, label: (file && file.path) || t('label.thisNote'), original, changes: c.changes, broken: c.broken }]);
      return;
    }
    if (!file) { new Notice(t('notice.linksUpdated', { n: 0 })); return; }
    const original = await this.app.vault.read(file);
    const c = rewriteUpdates(this, original, null);
    this.openUpdatePreview([{ file, label: file.path, original, changes: c.changes, broken: c.broken }]);
  },

  async updateLinksInVault() {
    const entries = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      const original = await this.app.vault.read(f);
      const c = rewriteUpdates(this, original, null);
      if (c.changes.length || c.broken.length) entries.push({ file: f, label: f.path, original, changes: c.changes, broken: c.broken });
    }
    this.openUpdatePreview(entries);
  },

  openUpdatePreview(entries) {
    new UpdatePreviewModal(this.app, entries, (chosen) => this.applyUpdates(chosen)).open();
  },

  // Apply the changes the user kept, note by note: each note is rebuilt from just its
  // selected keys and written under a guard, so a note edited since the preview is skipped,
  // not clobbered. process reads and writes as one, so the guard can't race.
  async applyUpdates(entries) {
    let files = 0, total = 0, skipped = 0;
    for (const e of entries) {
      const keys = new Set(e.changes.filter((c) => c.selected).map((c) => c.key));
      if (!keys.size) continue;
      if (e.editor) {
        if (e.editor.getValue() !== e.original) { skipped++; continue; }
        const { newText, count } = rewriteUpdates(this, e.original, keys);
        const cur = e.editor.getCursor();
        e.editor.setValue(newText);
        e.editor.setCursor(cur);
        files++; total += count;
      } else {
        let count = 0;
        await this.app.vault.process(e.file, (data) => {
          if (data !== e.original) return data;
          const out = rewriteUpdates(this, data, keys);
          count = out.count;
          return out.newText;
        });
        if (count) { files++; total += count; } else skipped++;
      }
    }
    let msg = t('notice.linksUpdatedVault', { n: total, files });
    if (skipped) msg += ' ' + t('notice.updateSkipped', { n: skipped });
    new Notice(msg);
  },

  pinLinksInActiveNote(anchors) { return this.rewriteActiveNote(pinLinksInText(anchors), 'notice.linksPinned'); },
  pinLinksInVault(anchors) { return this.rewriteVault(pinLinksInText(anchors), 'notice.linksPinnedVault'); },
};

module.exports = { methods, staleLinksExtension, refreshStaleLinks };
