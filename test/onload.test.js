'use strict';

// The plugin must survive being constructed and loaded.
//
// This exists because in a sibling plugin it didn't: a helper was deleted while a call to it
// stayed behind, and the plugin threw in onload and refused to load at all. esbuild bundles
// an undefined identifier happily, and no other test reaches the event wiring — so "it builds
// and the tests pass" said nothing about whether the plugin runs. This runs it.

const { describe, it, assert } = require('./harness');
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
    // The whole point of the graded claim: our index may well hold this file, but the
    // author already said what the link is, and it is not a code link.
    const plugin = await load();
    const claim = plugin.api.linker.claim('file:///x/Spec.pdf', 'sec:Overview');
    assert.strictEqual(claim, null);
  });

  it('builds the editor menu without throwing', async () => {
    // The handler itself, not just the registration. Everything the reader sees in the
    // right-click menu is built in here, and nothing else in the suite runs a line of it —
    // which is how a call to a deleted helper survived a green test run once already.
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
    // The mechanism worth testing: two plugins with no shared memory have to land in the
    // same submenu, which they do by parking it on the menu object they were both handed.
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
    // The duplication this was written for: `sec:` makes the link a reference link, but a
    // pdf sitting under a scanned code root is in our index too, so we recognised it as ours
    // and the reader got two Copy items and two Unpins with nothing to tell them apart.
    const plugin = await load();
    const link = { target: 'file:///x/Spec.pdf "sec:Overview"' };
    // We do recognise it as a link of the family — which is exactly why ownership, not
    // recognition, has to be what gates the menu items.
    assert.strictEqual(plugin.isCodeLink(link.target), true, 'precondition: we do recognise it');

    fakeApp.plugins.plugins = {
      'code-linker': plugin,
      'reference-linker': { api: { linker: { apiVersion: 1, id: 'reference-linker', kind: 'sigil', precedence: 10, claim: () => 'binding' } } },
    };
    assert.strictEqual(plugin.ownsLinkAtCursor(link), false, 'both plugins would act on one link');

    // And still not ours with the sibling uninstalled. The anchor says what the link is; a
    // section-pinned link does not become a code link just because nothing else is there to
    // claim it, and offering Unpin on it would rewrite a binding we do not understand.
    fakeApp.plugins.plugins = { 'code-linker': plugin };
    assert.strictEqual(plugin.ownsLinkAtCursor(link), false);
    fakeApp.plugins.plugins = {};
  });
});
