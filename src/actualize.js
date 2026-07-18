'use strict';

// Keeping stored links current with the code. A link freezes a line at insert time; as
// code moves, that line drifts. These helpers re-resolve a link against the live index,
// mark the drifted ones, and (on an explicit command) rewrite the line. Nothing is
// rewritten automatically.
//
// Only a pinned link is tracked: its title says what it holds on to (see shared/binding).
// An unpinned one is left alone — never marked, never rewritten. Nothing is inferred from
// the link's text, which is the reader's prose.

const { splitTarget, withTitle, rewriteLinks, rewriteFences } = require('./shared/markdown');
const { LINE_RE, parseBinding, ownsBinding } = require('./shared/binding');
const shared = require('./shared/actualize');

// Which bindings are this plugin's, as the shared module names them.
const OWNER = 'code';
const { parseSpec, setBindLine } = require('./embed');
const preview = require('./shared/update-preview');
const { t } = require('./shared/i18n');

// Prefix for the preview modal's own classes, kept per plugin so two installed linkers
// never style each other's dialog.
const PREVIEW_CLASS = 'code-linker-preview';

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

const { refreshStaleLinks } = shared;
const staleLinksExtension = (plugin) => shared.staleLinksExtension(plugin, { stale: 'code-linker-stale', broken: 'code-linker-broken' });

// What a link's binding says about where it points, or null when there's nothing to
// judge: no line, or no binding of ours to judge it against.
//
// The ownership check is explicit rather than left to the anchor lookups downstream. A
// document binding would find no symbol here and read as a link gone broken, which is how
// two installed plugins ended up marking each other's links.
function bindStateOf(plugin, target) {
  const { url, title } = splitTarget(target);
  const m = url && LINE_RE.exec(url);
  const b = ownsBinding(title, OWNER) ? parseBinding(title) : null;
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

  rewriteActiveNote(transform, noticeKey) { return shared.rewriteActiveNote(this, transform, noticeKey); },
  rewriteVault(transform, noticeKey) { return shared.rewriteVault(this, transform, noticeKey); },

  updateLinksInActiveNote() { return preview.updateInActiveNote(this, rewriteUpdates, PREVIEW_CLASS); },
  updateLinksInVault() { return preview.updateInVault(this, rewriteUpdates, PREVIEW_CLASS); },

  pinLinksInActiveNote(anchors) { return this.rewriteActiveNote(pinLinksInText(anchors), 'notice.linksPinned'); },
  pinLinksInVault(anchors) { return this.rewriteVault(pinLinksInText(anchors), 'notice.linksPinnedVault'); },
};

module.exports = { methods, staleLinksExtension, refreshStaleLinks };
