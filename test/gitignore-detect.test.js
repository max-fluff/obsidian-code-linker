'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { describe, it, assert } = require('../src/shared/testing/harness');
const { installStubs, fakeApp } = require('../src/shared/testing/stubs');

installStubs();
const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));

// A scan object with no languages, so walk recurses the tree but indexes nothing —
// isolating the .gitignore detection from the file parser.
const bareScan = (root, gitignore) => ({
  root, byExt: new Map(), skip: { names: new Set(), paths: new Set() },
  old: new Map(), next: new Map(), gitignore, ignores: [], sawGitignore: false,
});

function tree(spec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-gi-'));
  for (const [rel, body] of Object.entries(spec)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return dir;
}

describe('walk: .gitignore detection', () => {
  const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'code-linker' });

  it('flags a .gitignore sitting under the scan root', async () => {
    const dir = tree({ '.gitignore': 'dist\n', 'src/a.ts': '' });
    try {
      const scan = bareScan(dir, false);
      await plugin.walk(dir, scan);
      assert.strictEqual(scan.sawGitignore, true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('flags a .gitignore nested deeper in the tree', async () => {
    const dir = tree({ 'src/app/.gitignore': '*.log\n', 'src/app/a.ts': '' });
    try {
      const scan = bareScan(dir, false);
      await plugin.walk(dir, scan);
      assert.strictEqual(scan.sawGitignore, true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('leaves the flag false when the tree has none', async () => {
    const dir = tree({ 'src/a.ts': '', 'src/b.ts': '' });
    try {
      const scan = bareScan(dir, false);
      await plugin.walk(dir, scan);
      assert.strictEqual(scan.sawGitignore, false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('notices a .gitignore even with the setting off', async () => {
    // Detection must not depend on the toggle — that is what lets the setting appear.
    const dir = tree({ '.gitignore': 'dist\n', 'src/a.ts': '' });
    try {
      const scan = bareScan(dir, false);
      await plugin.walk(dir, scan);
      assert.strictEqual(scan.sawGitignore, true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
