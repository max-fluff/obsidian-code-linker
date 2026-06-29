"use strict";

const { EditorSuggest } = require("obsidian");

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
    return { start: { line: cursor.line, ch: i }, end: cursor, query };
  }

  getSuggestions(ctx) {
    const idx = this.plugin.index;
    if (!idx || !idx.length) return [];
    const q = ctx.query.toLowerCase();
    const max = this.plugin.settings.maxResults;
    const hidden = new Set(this.plugin.settings.disabledKinds || []);
    const starts = [];
    const contains = [];
    for (const e of idx) {
      if (hidden.has(e.kind)) continue;
      const n = e.name.toLowerCase();
      if (n.startsWith(q)) {
        starts.push(e);
        if (starts.length >= max) break;
      } else if (q && n.includes(q) && contains.length < max) {
        contains.push(e);
      }
    }
    return starts.concat(contains).slice(0, max);
  }

  renderSuggestion(e, el) {
    el.addClass("code-linker-suggestion");
    el.createSpan({ cls: "code-linker-name", text: e.name });
    el.createSpan({ cls: "code-linker-kind", text: e.kind });
    el.createSpan({ cls: "code-linker-path", text: e.path });
  }

  selectSuggestion(e) {
    const ctx = this.context;
    if (!ctx) return;
    const link = this.plugin.buildLink(e);
    ctx.editor.replaceRange(link, ctx.start, ctx.end);
    const pos = ctx.editor.posToOffset(ctx.start) + link.length;
    ctx.editor.setCursor(ctx.editor.offsetToPos(pos));
  }
}

module.exports = { CodeIndexSuggest };
