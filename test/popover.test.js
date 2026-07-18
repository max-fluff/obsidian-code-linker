'use strict';

// The popover shell: when it shows, when it refuses to, and where it lands. Three previews
// sit on top of this — code snippets, PDF pages, the duplicate list — so a mistake here is
// a mistake in all of them.

const { describe, it, assert } = require('../src/shared/testing/harness');
const { Popover } = require('../src/shared/popover');

// A DOM barely rich enough for the shell: classes, inline styles, and a box to measure.
function installDom({ width = 1000, height = 800, box = { width: 200, height: 100 } } = {}) {
  const makeEl = () => {
    const el = {
      classes: new Set(),
      style: {},
      children: [],
      listeners: {},
      classList: { contains: (c) => el.classes.has(c) },
      addClass(c) { for (const p of String(c).split(' ')) el.classes.add(p); },
      removeClass(c) { for (const p of String(c).split(' ')) el.classes.delete(p); },
      empty() { el.children.length = 0; },
      remove() { el.removed = true; },
      contains: () => false,
      addEventListener(name, fn) { el.listeners[name] = fn; },
      createDiv(o) { const c = makeEl(); if (o && o.cls) c.addClass(o.cls); el.children.push(c); return c; },
      createEl() { const c = makeEl(); el.children.push(c); return c; },
      getBoundingClientRect: () => ({ width: box.width, height: box.height }),
    };
    return el;
  };
  // Merge rather than replace: installStubs already put localStorage on window and the
  // element helpers on document, and a plugin loaded by a later test file still needs them.
  global.window = Object.assign(global.window || {}, { innerWidth: width, innerHeight: height });
  global.document = Object.assign(global.document || {}, { body: makeEl() });
  return global.document.body;
}

const tick = () => new Promise((r) => setTimeout(r, 5));

const makePopover = (opts = {}) => new Popover(Object.assign({ cls: 'x-hover', hiddenCls: 'x-hidden', showDelay: 0 }, opts));

describe('popover shell', () => {
  it('shows what was scheduled', async () => {
    installDom();
    const pop = makePopover();
    let built = 0;
    pop.schedule('a', 10, 10, (el) => { built++; el.createDiv({ cls: 'body' }); });
    await tick();
    assert.strictEqual(built, 1);
    assert.ok(pop.isVisible(), 'stayed hidden after a successful build');
  });

  it('does not rebuild what is already on screen', async () => {
    // Otherwise every mouse move over the same link restarts the whole cycle.
    installDom();
    const pop = makePopover();
    let built = 0;
    const build = () => { built++; };
    pop.schedule('a', 10, 10, build);
    await tick();
    pop.schedule('a', 12, 12, build);
    await tick();
    assert.strictEqual(built, 1);
  });

  it('stays hidden when the build declines', async () => {
    // A target with nothing to preview must leave no empty box behind.
    installDom();
    const pop = makePopover();
    pop.schedule('a', 10, 10, () => false);
    await tick();
    assert.ok(!pop.isVisible());
  });

  it('tells a build that it has been superseded', async () => {
    installDom();
    const pop = makePopover();
    let sawStale = false;
    pop.schedule('slow', 10, 10, async (el, ctx) => {
      await tick();
      if (!ctx.isCurrent()) { sawStale = true; return false; }
      return undefined;
    });
    await tick();
    pop.hide();
    await tick();
    await tick();
    assert.ok(sawStale, 'the build was never told it had been superseded');
  });

  it('refuses to reveal a superseded render even if the build does not check', async () => {
    // The shell owns the token: a build that forgets to check it must still be unable to
    // reveal a superseded render.
    installDom();
    const pop = makePopover();
    pop.schedule('slow', 10, 10, async () => { await tick(); });
    await tick();
    pop.hide();
    await tick();
    await tick();
    assert.ok(!pop.isVisible(), 'a stale render revealed itself');
  });

  it('places itself past the cursor when there is room', async () => {
    installDom();
    const pop = makePopover();
    pop.schedule('a', 100, 100, () => {});
    await tick();
    assert.strictEqual(pop.el.style.left, '112px');
    assert.strictEqual(pop.el.style.top, '112px');
  });

  it('flips to the other side at the edge of the window', async () => {
    installDom({ width: 300, height: 200, box: { width: 200, height: 100 } });
    const pop = makePopover();
    pop.schedule('a', 250, 180, () => {});
    await tick();
    // 250 + 12 + 200 would run off a 300px window, so it goes to the left of the cursor.
    assert.strictEqual(pop.el.style.left, '38px');
    assert.strictEqual(pop.el.style.top, '68px');
  });

  it('runs the after-reveal step before measuring', async () => {
    // Where a scroll-into-view belongs: it needs the element laid out, but the size it
    // produces has to be the size the placement uses.
    installDom();
    const pop = makePopover();
    const order = [];
    pop.schedule('a', 10, 10, () => {
      order.push('build');
      return () => order.push('after');
    });
    await tick();
    assert.deepStrictEqual(order, ['build', 'after']);
    assert.strictEqual(pop.el.style.visibility, 'visible');
  });
});
