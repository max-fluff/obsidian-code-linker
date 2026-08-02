'use strict';

// The inline filter grammar: "py:def:Foo.bar" narrows by language, by kind and to a symbol
// declared beside Foo. The prefixes come from the shared facet grammar, the trailing container
// from here — it is a suffix of the name, not a prefix of the query.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs } = require('../src/shared/testing/stubs');

installStubs();

const ENTRIES = [
  { name: 'Player', kind: 'class', lang: 'csharp', path: 'game/Player.cs', line: 1 },
  { name: 'Move', kind: 'method', lang: 'csharp', path: 'game/Player.cs', line: 20 },
  { name: 'move', kind: 'def', lang: 'python', path: 'tools/move.py', line: 3 },
  { name: 'def', kind: 'class', lang: 'python', path: 'tools/odd.py', line: 7 },
];

const load = async () => {
  const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
  const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'code-linker' });
  await plugin.onload();
  plugin.languages = [
    { id: 'csharp', name: 'C#', extensions: ['.cs'] },
    { id: 'python', name: 'Python', extensions: ['.py'] },
  ];
  plugin.fileCache = new Map();
  for (const e of ENTRIES) {
    if (!plugin.fileCache.has(e.path)) plugin.fileCache.set(e.path, { entries: [] });
    plugin.fileCache.get(e.path).entries.push(e);
  }
  plugin.setIndex(ENTRIES);
  return plugin;
};

const kept = (plugin, raw) => {
  const f = plugin.parseQuery(raw);
  return plugin.index.filter((e) => plugin.entryPassesFilter(e, f)).map((e) => e.name);
};

describe('inline filters', () => {
  it('narrows by language, named by its extension', async () => {
    const plugin = await load();
    assert.deepStrictEqual(kept(plugin, 'py:'), ['move', 'def']);
  });

  it('narrows by kind', async () => {
    const plugin = await load();
    assert.deepStrictEqual(kept(plugin, 'class:'), ['Player', 'def']);
  });

  it('combines language and kind', async () => {
    const plugin = await load();
    assert.deepStrictEqual(kept(plugin, 'py:class:'), ['def']);
  });

  it('leaves the name alone when a prefix is not a filter', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.parseQuery('nope:Move').name, 'nope:Move');
  });

  it('names a language by its id and by its display name, not only its extension', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.parseQuery('python:x').values.lang, 'python');
    assert.strictEqual(plugin.parseQuery('c#:x').values.lang, 'csharp');
  });
});

describe('the container suffix', () => {
  it('keeps only symbols declared in the same file as the container', async () => {
    const plugin = await load();
    assert.deepStrictEqual(kept(plugin, 'Player.Move'), ['Move']);
  });

  it('reads the name and the container apart', async () => {
    const plugin = await load();
    const f = await plugin.parseQuery('Player.Move');
    assert.strictEqual(f.name, 'Move');
    assert.strictEqual(f.container, 'Player');
  });

  it('is no container at all when the name carries no dot', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.parseQuery('Move').container, null);
  });

  // The filter only decides co-location; matching the name against what was typed is the
  // suggest's half. So this keeps every symbol sharing a file with a Player declaration —
  // which is neither Player itself nor anything in another file.
  it('keeps only what is declared beside the container', async () => {
    const plugin = await load();
    assert.deepStrictEqual(kept(plugin, 'Player.x'), ['Move']);
  });
});

// A symbol may be named the same as a filter token, and then the bare query cannot ask for it.
describe('sym:', () => {
  it('asks for a symbol whose name is itself a kind token', async () => {
    const plugin = await load();
    const f = plugin.parseQuery('sym:def');
    assert.strictEqual(f.name, 'def');
    assert.strictEqual(f.field, 'sym');
    assert.deepStrictEqual(f.values, {});
  });

  it('matches against the symbol name, as the bare query does', async () => {
    const plugin = await load();
    const f = plugin.parseQuery('sym:Mov');
    const e = plugin.index.find((x) => x.name === 'Move');
    assert.strictEqual(plugin.matchTextFor(e, f), 'Move');
  });
});
