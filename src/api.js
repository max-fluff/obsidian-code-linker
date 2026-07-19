'use strict';

// Public API at `app.plugins.plugins['code-linker'].api`, so other plugins and
// DataviewJS can read the code index. Mixed into the plugin prototype; methods
// run with the plugin as `this`.

const { LINKER_API } = require('./shared/discover');
const { splitTarget } = require('./shared/markdown');
const { bindingOwner, ownsBinding } = require('./shared/binding');

const OWNER = 'code';

// A plain copy of an index entry, so a consumer can't mutate our live index.
const pick = (e) => ({ name: e.name, kind: e.kind, lang: e.lang, path: e.path, line: e.line });

module.exports = {
  buildApi() {
    const plugin = this;
    return {
      version: this.manifest.version,
      codeRoot: () => this.codeRoot(),

      // Every indexed entry: { name, kind, lang, path, line }.
      getEntries: () => this.index.map(pick),

      // One row per indexed file: { name, path, lang, entries }.
      getFiles: () => this.apiFiles(),

      // Totals: { files, entries, byLang, byKind }.
      getStats: () => this.apiStats(),

      // Enabled languages: { id, name, extensions }.
      getLanguages: () => this.apiLanguages(),

      // Entries matching a name or path tail (the same lookup the commands use).
      find: (text) => this.lookup(String(text || '')).map(pick),

      // Render helpers: a portable markdown link, or a ready-to-open absolute URI.
      linkFor: (entry) => this.buildLink(entry),
      uriFor: (entry) => this.fillRoot(this.buildUri(entry)),

      // Subscribe to index rebuilds; returns an unsubscribe function.
      onChange: (cb) => this.onIndexChange(cb),

      // The provider contract the sibling linkers read (consumed in shared/discover.js and
      // shared/link-owner.js).
      linker: {
        apiVersion: LINKER_API,
        id: 'code-linker',
        displayName: 'Code Linker',
        kind: 'sigil',
        get precedence() { return plugin.settings.linkPrecedence; },

        claim: (target, title) => {
          const split = splitTarget(String(target || ''));
          const ttl = title ? String(title) : split.title;
          if (ownsBinding(ttl, OWNER)) return 'binding';
          // Somebody else's anchor: the author already said what this link is.
          if (bindingOwner(ttl)) return null;
          return split.url && plugin.targetIndexedFile(plugin.decodeTarget(split.url)) ? 'index' : null;
        },

        // Both selection actions search on click, so the answer doesn't depend on the text —
        // only on whether our context menu is switched on at all.
        offers: (kind) => (kind === 'convert' || kind === 'open') && !!plugin.settings.contextMenu,
      },
    };
  },

  apiFiles() {
    const out = [];
    for (const v of this.fileCache.values()) {
      const f = v.entries[0]; // the file-level entry is always first
      if (f) out.push({ name: f.name, path: f.path, lang: f.lang, entries: v.entries.length });
    }
    out.sort((a, b) => a.path.localeCompare(b.path));
    return out;
  },

  apiStats() {
    const byLang = {}, byKind = {};
    for (const e of this.index) {
      byLang[e.lang] = (byLang[e.lang] || 0) + 1;
      byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    }
    return { files: this.fileCache.size, entries: this.index.length, byLang, byKind };
  },

  apiLanguages() {
    const enabled = new Set(this.settings.enabledLanguages || []);
    return this.languages.filter((l) => enabled.has(l.id)).map((l) => ({ id: l.id, name: l.name, extensions: l.extensions.slice() }));
  },
};
