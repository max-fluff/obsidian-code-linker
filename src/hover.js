'use strict';

// Our own popover, not Obsidian's HoverPopover (which hides as soon as the pointer
// leaves the link), so you can scroll and select inside the preview.
//
// The shell — timing, placement, the stale-render guard — is shared/popover.js. What is
// ours is the snippet: the lines around the target, syntax-highlighted, scrolled so the
// line the link points at sits in the middle.

const nodePath = require('path');
const { readLines, renderCode } = require('./render');
const { Popover } = require('./shared/popover');

const keyOf = (e) => e.path + ':' + e.line;

class HoverPreview {
  constructor(plugin) {
    this.plugin = plugin;
    this.pop = new Popover({ cls: 'code-linker-hover code-linker-code', hiddenCls: 'code-linker-hidden' });
  }

  // Read from onHoverMove to tell "nothing scheduled" from "waiting to show".
  get pendingKey() { return this.pop.pendingKey; }

  isVisible() { return this.pop.isVisible(); }
  contains(node) { return this.pop.contains(node); }
  cancelHide() { this.pop.cancelHide(); }
  leave() { this.pop.leave(); }
  hide() { this.pop.hide(); }
  destroy() { this.pop.destroy(); }

  schedule(entry, x, y) {
    this.pop.schedule(keyOf(entry), x, y, (el, ctx) => this.build(entry, el, ctx));
  }

  async build(entry, el, ctx) {
    const s = this.plugin.settings;
    const root = this.plugin.codeRoot();
    const abs = root ? nodePath.join(root, entry.path) : entry.path;
    const line = entry.line || 1;
    // Negative means no limit in that direction — read to the file edge.
    const before = s.hoverBefore < 0 ? Infinity : Math.max(0, s.hoverBefore | 0);
    const after = s.hoverAfter < 0 ? Infinity : Math.max(0, s.hoverAfter | 0);
    const snippet = await readLines(abs, line - before, line + after);
    if (!snippet || !ctx.isCurrent()) return false;

    el.createDiv({ cls: 'code-linker-hover-header', text: keyOf(entry) });
    const body = el.createDiv({ cls: 'code-linker-hover-body' });

    const idx = Math.min(Math.max(0, line - snippet.startLine), snippet.lines.length - 1);
    const band = body.createDiv({ cls: 'code-linker-hover-band' });
    band.style.top = 'calc(var(--cl-lh) * ' + idx + ')';

    await renderCode(body, snippet.lines.join('\n'), this.plugin.prismIdFor(entry.lang));
    if (!ctx.isCurrent()) return false;

    // Centring the target line needs the element laid out, so it runs once the shell has
    // revealed it and before it is measured for placement.
    return () => {
      body.scrollTop = Math.max(0, band.offsetTop - (body.clientHeight - band.offsetHeight) / 2);
    };
  }
}

module.exports = { HoverPreview };
