'use strict';

// The plugin must survive being constructed and loaded. esbuild happily bundles a call to a
// deleted helper, so "it builds" says nothing about whether onload runs — this runs it.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs, recordingMenu, fakeEditor } = require('./stubs/app');

installStubs();

const load = async () => {
  const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
  const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'code-linker' });
  await plugin.onload();
  return plugin;
};

describe('onload', () => {
  it('constructs and loads without throwing', async () => {
    const plugin = await load();
    assert.ok(plugin, 'no plugin instance');
  });

  it('publishes the linker provider a sibling can find', async () => {
    const plugin = await load();
    const provider = plugin.api && plugin.api.linker;
    assert.ok(provider, 'api.linker missing — the reference linker would not see us at all');
    assert.strictEqual(provider.id, 'code-linker');
    assert.strictEqual(provider.kind, 'sigil');
    assert.strictEqual(typeof provider.claim, 'function');
    assert.strictEqual(typeof provider.offers, 'function');
    assert.strictEqual(typeof provider.precedence, 'number');
  });

  it('claims a link carrying one of our own binding anchors', async () => {
    const plugin = await load();
    const claim = plugin.api.linker.claim('file:///x/Player.cs', 'sym:Player');
    assert.strictEqual(claim, 'binding');
  });

  it('leaves a link carrying the reference linker’s anchor alone', async () => {
    const plugin = await load();
    const claim = plugin.api.linker.claim('file:///x/Spec.pdf', 'sec:Overview');
    assert.strictEqual(claim, null);
  });

  it('builds the editor menu without throwing', async () => {
    // The handler itself, not just the registration — nothing else in the suite runs it.
    const plugin = await load();
    const handler = fakeApp.handlers.get('editor-menu');
    assert.ok(handler, 'no editor-menu handler was registered');
    const menu = recordingMenu();
    handler(menu, fakeEditor('nothing here matches anything', 3));
    assert.ok(Array.isArray(menu.titles()));
  });

  it('keeps the selection verbs flat when no sibling offers them', async () => {
    const plugin = await load();
    fakeApp.plugins.plugins = { 'code-linker': plugin };
    const menu = recordingMenu();
    fakeApp.handlers.get('editor-menu')(menu, fakeEditor('Player', 3));
    assert.deepStrictEqual(menu.groups(), [], 'nested a lone item under a submenu');
    assert.ok(menu.titles().includes('Find and convert to code link'));
    assert.ok(menu.titles().includes('Find and open code'));
  });

  it('shares one entry per verb with the reference linker', async () => {
    // Two plugins with no shared memory land in the same submenu by parking it on the menu
    // object they were both handed.
    const plugin = await load();
    fakeApp.plugins.plugins = {
      'code-linker': plugin,
      'reference-linker': { api: { linker: { apiVersion: 1, id: 'reference-linker', displayName: 'Reference Linker', kind: 'sigil', precedence: 10, offers: () => true } } },
    };
    const menu = recordingMenu();
    fakeApp.handlers.get('editor-menu')(menu, fakeEditor('Player', 3));
    assert.deepStrictEqual(menu.groups().sort(), ['Find and convert to link', 'Find and open']);
    assert.ok(menu.titles().includes('Find and convert to link ▸ Code'));
    assert.ok(menu.titles().includes('Find and open ▸ Code'));
    fakeApp.plugins.plugins = {};
  });

  it('stands down on a link the reference linker has pinned to a section', async () => {
    const plugin = await load();
    const link = { target: 'file:///x/Spec.pdf "sec:Overview"' };
    // Ownership, not recognition, gates the menu items.
    assert.strictEqual(plugin.isCodeLink(link.target), true, 'precondition: we do recognise it');

    fakeApp.plugins.plugins = {
      'code-linker': plugin,
      'reference-linker': { api: { linker: { apiVersion: 1, id: 'reference-linker', kind: 'sigil', precedence: 10, claim: () => 'binding' } } },
    };
    assert.strictEqual(plugin.ownsLinkAtCursor(link), false, 'both plugins would act on one link');

    // Still not ours with the sibling uninstalled: a section-pinned link does not become a
    // code link just because nothing else is there to claim it.
    fakeApp.plugins.plugins = { 'code-linker': plugin };
    assert.strictEqual(plugin.ownsLinkAtCursor(link), false);
    fakeApp.plugins.plugins = {};
  });
});
