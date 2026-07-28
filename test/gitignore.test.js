'use strict';

const { describe, it, assert } = require('../src/shared/testing/harness');
const { compileGitignore, isIgnored } = require('../src/gitignore');

// Compile one .gitignore's text at a base and ask whether a code-root-relative path is
// ignored — the two calls the walk makes, without the filesystem in between.
const ign = (text, rel, isDir = false, base = '') => isIgnored(compileGitignore(text, base), rel, isDir);

describe('gitignore: bare names', () => {
  it('matches a file at any depth', () => {
    assert.strictEqual(ign('*.log', 'a/b/app.log'), true);
    assert.strictEqual(ign('*.log', 'app.log'), true);
  });

  it('matches a directory at any depth', () => {
    assert.strictEqual(ign('dist', 'src/dist', true), true);
    assert.strictEqual(ign('dist', 'dist', true), true);
  });

  it('leaves an unmatched path alone', () => {
    assert.strictEqual(ign('*.log', 'src/app.ts'), false);
  });
});

describe('gitignore: leading slash anchors to the base', () => {
  it('matches only at the root, not nested', () => {
    assert.strictEqual(ign('/build', 'build', true), true);
    assert.strictEqual(ign('/build', 'src/build', true), false);
  });

  it('an interior slash anchors too', () => {
    assert.strictEqual(ign('src/generated', 'src/generated', true), true);
    assert.strictEqual(ign('src/generated', 'app/src/generated', true), false);
  });
});

describe('gitignore: directory-only patterns', () => {
  it('ignores the directory but not a like-named file', () => {
    assert.strictEqual(ign('build/', 'x/build', true), true);
    assert.strictEqual(ign('build/', 'x/build', false), false);
  });
});

describe('gitignore: negation re-includes', () => {
  it('a later ! rescues a file an earlier line ignored', () => {
    const text = '*.log\n!keep.log';
    assert.strictEqual(ign(text, 'keep.log'), false);
    assert.strictEqual(ign(text, 'other.log'), true);
  });

  it('order matters — a re-ignore after the negation wins', () => {
    assert.strictEqual(ign('*.log\n!keep.log\nkeep.log', 'keep.log'), true);
  });
});

describe('gitignore: wildcards', () => {
  it('* stops at a separator', () => {
    assert.strictEqual(ign('/a/*.ts', 'a/x.ts'), true);
    assert.strictEqual(ign('/a/*.ts', 'a/b/x.ts'), false);
  });

  it('** crosses separators', () => {
    assert.strictEqual(ign('a/**/x.ts', 'a/x.ts'), true);
    assert.strictEqual(ign('a/**/x.ts', 'a/b/c/x.ts'), true);
  });

  it('a leading **/ matches at any depth', () => {
    assert.strictEqual(ign('**/node_modules', 'a/b/node_modules', true), true);
  });

  it('? matches a single non-separator character', () => {
    assert.strictEqual(ign('/file?.ts', 'file1.ts'), true);
    assert.strictEqual(ign('/file?.ts', 'file.ts'), false);
    assert.strictEqual(ign('/file?.ts', 'file12.ts'), false);
  });

  it('a bracket class matches a set', () => {
    assert.strictEqual(ign('/v[0-9].ts', 'v3.ts'), true);
    assert.strictEqual(ign('/v[0-9].ts', 'vx.ts'), false);
  });
});

describe('gitignore: comments and blanks', () => {
  it('ignores # lines and empty lines', () => {
    assert.strictEqual(compileGitignore('# a comment\n\n   \n', '').length, 0);
  });

  it('an escaped \\# is a literal hash name', () => {
    assert.strictEqual(ign('\\#notes.ts', '#notes.ts'), true);
  });
});

describe('gitignore: a rule only reaches paths under its base', () => {
  it('a nested .gitignore does not touch a sibling subtree', () => {
    const rules = compileGitignore('*.ts', 'src/app');
    assert.strictEqual(isIgnored(rules, 'src/app/x.ts', false), true);
    assert.strictEqual(isIgnored(rules, 'src/lib/x.ts', false), false);
    assert.strictEqual(isIgnored(rules, 'x.ts', false), false);
  });

  it('stacked shallow and deep rules resolve last-match-wins', () => {
    // A parent ignores every log; a deeper .gitignore un-ignores one under its own folder.
    const rules = [
      ...compileGitignore('*.log', ''),
      ...compileGitignore('!keep.log', 'src'),
    ];
    assert.strictEqual(isIgnored(rules, 'src/keep.log', false), false);
    assert.strictEqual(isIgnored(rules, 'src/other.log', false), true);
    assert.strictEqual(isIgnored(rules, 'keep.log', false), true);
  });
});
