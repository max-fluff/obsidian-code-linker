'use strict';

// Pinning writes into the link's title what the link should keep pointing at. Anchors are
// requirements that add up, so pinning a symbol and then its kind narrows the same spot rather
// than replacing it — and a pin that would change nothing is not offered at all.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs } = require('../src/shared/testing/stubs');
const { hashLine } = require('../src/shared/binding');

installStubs();

const REL = 'game/Player.cs';
const LINES = { 10: 'class Player', 20: '    public void Move()', 30: '   ' };

const load = async () => {
  const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
  const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'code-linker' });
  await plugin.onload();
  plugin.settings.codeRoot = '/code';
  plugin.fileCache = new Map([[REL, {
    entries: [
      { name: 'Player', kind: 'class', lang: 'csharp', path: REL, line: 10 },
      { name: 'Move', kind: 'method', lang: 'csharp', path: REL, line: 20 },
    ],
  }]]);
  plugin.setIndex(plugin.fileCache.get(REL).entries);
  plugin.lineTextAt = (rel, line) => (rel === REL && LINES[line] != null ? LINES[line] : null);
  return plugin;
};

const site = (line) => ({ rel: REL, line, text: LINES[line] });

describe('pinOption', () => {
  it('pins to the symbol declared on the line', async () => {
    const plugin = await load();
    assert.deepStrictEqual(
      (({ title, value }) => ({ title, value }))(plugin.pinOption(site(20), '', 'sym')),
      { title: 'sym:Move', value: 'Move' },
    );
  });

  it('pins to the kind of that declaration', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.pinOption(site(20), '', 'kind').title, 'kind:method');
  });

  it('pins to the line by the text on it, and shows the number', async () => {
    const plugin = await load();
    const opt = plugin.pinOption(site(20), '', 'line');
    assert.strictEqual(opt.title, 'line:' + hashLine(LINES[20]));
    assert.strictEqual(opt.value, '20');
  });

  it('adds an anchor to the ones already there', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.pinOption(site(20), 'sym:Move', 'kind').title, 'sym:Move kind:method');
  });

  it('offers nothing when the pin would change nothing', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.pinOption(site(20), 'sym:Move', 'sym'), null);
  });

  it('offers nothing where no declaration sits', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.pinOption(site(30), '', 'sym'), null);
  });

  it('offers nothing without a site to pin to', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.pinOption(null, '', 'sym'), null);
  });
});

describe('buildPinTitle', () => {
  it('writes only the anchors that were asked for', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.buildPinTitle(site(20), { sym: true }), 'sym:Move');
  });

  it('intersects a symbol with its line, so a same-named one elsewhere is not repinned', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.buildPinTitle(site(20), { sym: true, line: true }), 'sym:Move line:' + hashLine(LINES[20]));
  });

  // A blank line hashes to nothing the index keeps, so that pin would be broken at birth.
  it('refuses a line anchor on a blank line', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.buildPinTitle(site(30), { line: true }), null);
  });

  it('refuses a symbol anchor where nothing is declared', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.buildPinTitle(site(30), { sym: true }), null);
  });

  it('writes nothing when no anchor was asked for', async () => {
    const plugin = await load();
    assert.strictEqual(plugin.buildPinTitle(site(20), {}), null);
  });
});
