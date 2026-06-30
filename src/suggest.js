'use strict';

const { EditorSuggest, prepareFuzzySearch } = require('obsidian');
const { isProtected, inTableCell } = require('./constants');

class CodeIndexSuggest extends EditorSuggest {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onTrigger(cursor, editor) {
    const s = this.plugin.settings;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const i = before.lastIndexOf(s.trigger);
    if (i === -1) return null;
    const query = before.slice(i + s.trigger.length);
    // Stop once the typed text is no longer an identifier (space, etc.).
    if (!/^[\w.]*$/.test(query)) return null;
    if (query.length < Math.max(0, s.minChars)) return null;
    // Don't suggest inside code, frontmatter or an existing link. Tables stay live.
    const off = editor.posToOffset(cursor);
    if (isProtected(editor.getValue(), off)) return null;
    return { start: { line: cursor.line, ch: i }, end: cursor, query };
  }

  getSuggestions(ctx) {
    const idx = this.plugin.index;
    if (!idx || !idx.length) return [];
    const max = this.plugin.settings.maxResults;
    const hidden = new Set(this.plugin.settings.disabledKinds || []);

    if (!ctx.query) {
      const out = [];
      for (const e of idx) {
        if (hidden.has(e.lang + ':' + e.kind)) continue;
        out.push(e);
        if (out.length >= max) break;
      }
      return out;
    }

    // Fuzzy/subsequence match ranks camelCase abbreviations (ssis -> ServerSendInputsSystem).
    const match = prepareFuzzySearch(ctx.query);
    const scored = [];
    for (const e of idx) {
      if (hidden.has(e.lang + ':' + e.kind)) continue;
      const r = match(e.name);
      if (r) scored.push({ e, score: r.score });
    }
    scored.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));
    return scored.slice(0, max).map((s) => s.e);
  }

  renderSuggestion(e, el) {
    el.addClass('code-linker-suggestion');
    el.createSpan({ cls: 'code-linker-name', text: e.name });
    el.createSpan({ cls: 'code-linker-kind', text: e.kind });
    el.createSpan({ cls: 'code-linker-path', text: e.path });
  }

  selectSuggestion(e) {
    const ctx = this.context;
    if (!ctx) return;
    const inTable = inTableCell(ctx.editor.getValue(), ctx.editor.posToOffset(ctx.start));
    const link = this.plugin.buildLink(e, inTable);
    ctx.editor.replaceRange(link, ctx.start, ctx.end);
    const pos = ctx.editor.posToOffset(ctx.start) + link.length;
    ctx.editor.setCursor(ctx.editor.offsetToPos(pos));
  }
}

module.exports = { CodeIndexSuggest };
