'use strict';

// The panel says two things: what the scan found, and which links no longer land. The first is
// free — the index is already in memory. The second reads every note, so it must never happen
// on its own, and it must never write.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs, elLike } = require('../src/shared/testing/stubs');

installStubs();

const { CodeIndexView } = require('../src/index-view');

const ENTRIES = [
  { name: 'Player', kind: 'class', lang: 'csharp', path: 'game/Player.cs', line: 1 },
  { name: 'Move', kind: 'method', lang: 'csharp', path: 'game/Player.cs', line: 20 },
  { name: 'main', kind: 'def', lang: 'python', path: 'tools/run.py', line: 3 },
];

// Records what the panel drew: elLike swallows everything, so the tree is captured here.
function recordingEl() {
  const el = {
    texts: [],
    classes: [],
    empty() { this.texts.length = 0; this.classes.length = 0; },
    addClass(c) { this.classes.push(c); },
    createDiv(o) { return this.child(o); },
    createSpan(o) { return this.child(o); },
    createEl(tag, o) { return this.child(o); },
    child(o) {
      const opts = o || {};
      if (opts.text != null) this.texts.push(String(opts.text));
      const kid = recordingEl();
      kid.texts = this.texts;
      kid.classes = this.classes;
      return Object.assign(kid, { value: '', oninput: null, onclick: null });
    },
  };
  return el;
}

const load = async (over) => {
  const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
  const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'code-linker' });
  await plugin.onload();
  plugin.languages = [
    { id: 'csharp', name: 'C#', extensions: ['.cs'] },
    { id: 'python', name: 'Python', extensions: ['.py'] },
  ];
  plugin.setIndex((over && over.entries) || ENTRIES);
  const view = new CodeIndexView({}, plugin);
  view.contentEl = recordingEl();
  view.app = fakeApp;
  return view;
};

const drawn = (view) => { view.render(); return view.contentEl.texts.join('\n'); };

describe('the index half', () => {
  it('counts the whole index and each language in it', async () => {
    const view = await load();
    const out = drawn(view);
    assert.ok(out.includes('Indexed (3)'), out);
    assert.ok(out.includes('C#'), out);
    assert.ok(out.includes('Python'), out);
  });

  it('shows the kinds inside a language only once it is opened', async () => {
    const view = await load();
    assert.ok(!drawn(view).includes('method'));
    view.openLangs.add('csharp');
    assert.ok(drawn(view).includes('method'));
  });

  // A language may be switched off after the index was built; its id beats an empty row.
  it('falls back to the language id when nothing names it', async () => {
    const view = await load();
    view.plugin.languages = [];
    assert.ok(drawn(view).includes('csharp'));
  });

  // Obsidian swallows a throw out of onOpen and leaves the leaf blank, which reads as "nothing
  // found" rather than "it broke" — the panel has to say which.
  it('says so when it cannot draw itself, rather than going blank', async () => {
    const view = await load();
    view.renderIndex = () => { throw new Error('boom'); };
    const out = drawn(view);
    assert.ok(out.includes('boom'), out);
  });

  it('says the index is empty rather than drawing nothing', async () => {
    const view = await load({ entries: [] });
    assert.ok(drawn(view).includes('The index is empty'), drawn(view));
  });

  it('lists what a search matches, and says when nothing does', async () => {
    const view = await load();
    view.query = 'mov';
    assert.ok(drawn(view).includes('Move'));
    view.query = 'zzz';
    assert.ok(drawn(view).includes('Nothing in the index'));
  });
});

describe('the links half', () => {
  it('does not read the vault until it is asked to', async () => {
    const view = await load();
    let read = 0;
    view.plugin.app = Object.assign({}, fakeApp, {
      vault: Object.assign({}, fakeApp.vault, { getMarkdownFiles: () => { read++; return []; } }),
    });
    drawn(view);
    assert.strictEqual(read, 0, 'the panel walked the vault on its own');
    assert.ok(view.contentEl.texts.join('\n').includes('runs when you ask'));
  });

  it('says so when every link still lands', async () => {
    const view = await load();
    view.plugin.app = Object.assign({}, fakeApp, {
      vault: Object.assign({}, fakeApp.vault, { getMarkdownFiles: () => [], read: () => Promise.resolve('') }),
    });
    await view.scan();
    assert.ok(view.contentEl.texts.join('\n').includes('still lands'));
  });

  // The scan is a dry run of the same rewrite the update preview applies. If it ever wrote,
  // opening a panel would edit the vault.
  it('never writes while scanning', async () => {
    const view = await load();
    const note = { path: 'a.md' };
    let wrote = 0;
    view.plugin.app = Object.assign({}, fakeApp, {
      vault: Object.assign({}, fakeApp.vault, {
        getMarkdownFiles: () => [note],
        read: () => Promise.resolve('[x](file:///{code-root}/game/Player.cs:99 "sym:Move")'),
        modify: () => { wrote++; return Promise.resolve(); },
        process: () => { wrote++; return Promise.resolve(); },
      }),
    });
    view.plugin.fileCache = new Map([['game/Player.cs', { entries: ENTRIES.slice(0, 2) }]]);
    await view.scan();
    assert.strictEqual(wrote, 0, 'the panel wrote to the vault while only looking');
    assert.ok(Array.isArray(view.notes));
  });
});
