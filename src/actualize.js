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
const { LINE_RE, parseBinding, formatBinding } = require('./shared/binding');
const { t } = require('./shared/i18n');

// CM6 syntax-node names for contexts where a link is example text, not a live link.
const SKIP_NODE = /code|comment|frontmatter/i;
const EMBED_LANG = 'code-link';

const updateLinksInText = (plugin, text) => {
  const links = rewriteLinks(text, (name, target) => {
    const fixed = plugin.actualizedTarget(target);
    return fixed == null ? null : '[' + name + '](' + fixed + ')';
  });
  const embeds = rewriteFences(links.text, EMBED_LANG, (body) => plugin.actualizedEmbed(body));
  return { text: embeds.text, count: links.count + embeds.count };
};

// Pin every unpinned link to the symbol on its line — how notes written before pinning
// existed get their tracking back, in one go. A link that already carries a title is left
// alone: it's either pinned, or a tooltip that's none of our business.
const pinLinksInText = (plugin, text) => rewriteLinks(text, (name, target) => {
  const { url, title } = splitTarget(target);
  if (title) return null;
  const site = plugin.linkSite(target);
  const decl = site && plugin.declAtSite(site);
  return decl ? '[' + name + '](' + withTitle(url, formatBinding({ sym: decl.name })) + ')' : null;
});

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
    return withTitle(url.replace(LINE_RE, ':' + r.line), title);
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

  updateLinksInActiveNote() { return this.rewriteActiveNote(updateLinksInText, 'notice.linksUpdated'); },
  updateLinksInVault() { return this.rewriteVault(updateLinksInText, 'notice.linksUpdatedVault'); },
  pinLinksInActiveNote() { return this.rewriteActiveNote(pinLinksInText, 'notice.linksPinned'); },
  pinLinksInVault() { return this.rewriteVault(pinLinksInText, 'notice.linksPinnedVault'); },
};

module.exports = { methods, staleLinksExtension, refreshStaleLinks };
