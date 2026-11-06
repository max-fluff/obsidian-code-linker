'use strict';

// A code-link block's path comes from note text, and notes travel: whatever a block names,
// it must not render a file outside the code root (issue #2). The containment rule itself is
// tested in shared; this checks the embed actually goes through it.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it, assert } = require('../src/shared/testing/harness');
const { installStubs } = require('../src/shared/testing/stubs');

installStubs();
const { resolve, parseSpec } = require('../src/embed');
const { containedPath } = require('../src/shared/contained-path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-linker-embed-'));
const root = path.join(tmp, 'root');
fs.mkdirSync(path.join(root, 'src'), { recursive: true });
fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'one\ntwo\n');
fs.writeFileSync(path.join(tmp, 'secret.txt'), 'secret\n');

// The plugin surface resolve() touches, with codePath wired the way main.js wires it.
const plugin = {
  codeRoot: () => root,
  codePath: (rel) => containedPath(root, rel, false),
  lookup: () => [],
  languages: [],
  prismIdFor: () => '',
};

describe('code-link embed paths', () => {
  it('render a file under the code root', () => {
    const res = resolve(plugin, parseSpec('src/a.ts:1-2'));
    assert.ok(!res.error, res.error);
    assert.strictEqual(res.absPath, path.join(root, 'src', 'a.ts'));
  });

  it('refuse a path that climbs out of it', () => {
    for (const spec of ['../secret.txt:1', '../secret.txt', 'src/../../secret.txt:1-5']) {
      const res = resolve(plugin, parseSpec(spec));
      assert.ok(res.error, spec);
      assert.ok(!res.absPath, spec);
    }
  });
});
