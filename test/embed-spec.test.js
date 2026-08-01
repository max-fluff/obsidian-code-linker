'use strict';

// What a code-link block can say about itself beyond its target.

const { describe, it, assert } = require('../src/shared/testing/harness');
const { installStubs } = require('../src/shared/testing/stubs');

installStubs();
const { parseSpec, numbered } = require('../src/embed');

describe('line numbers', () => {
  it('are shown unless the block says otherwise', () => {
    assert.strictEqual(numbered(parseSpec('src/Player.cs:9')), true);
    assert.strictEqual(numbered(parseSpec('src/Player.cs:9\nnumbers: on')), true);
  });

  it('are dropped for the words that mean no', () => {
    for (const no of ['off', 'no', 'false', 'hide', 'none', 'Off', ' off ']) {
      assert.strictEqual(numbered(parseSpec('a.ts:1\nnumbers: ' + no)), false, no);
    }
  });

  it('read a word that means nothing as a reader meaning yes', () => {
    // A block is prose first: a typo in a modifier must not silently take a feature away.
    assert.strictEqual(numbered(parseSpec('a.ts:1\nnumbers: maybe')), true);
  });
});
