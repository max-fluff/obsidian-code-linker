'use strict';

// A subset of .gitignore matching, enough to prune a source scan: bare names, anchored
// paths, directory-only patterns, negation, and the *, ?, ** wildcards. Rules carry the
// base directory of the file they came from (the scan root is ''); the walk stacks them.

const RE_SPECIAL = new Set('.^$+{}()|\\');

// One .gitignore line's glob (no leading '/', no trailing '/') to a regex over the path
// relative to the rule's base. '*' stops at a separator, '**' crosses them, '?' is one
// non-separator character; a [...] class is passed through, its leading '!' folded to '^'.
function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') { re += '(?:.*/)?'; i++; } else re += '.*';
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '[') {
      let cls = '[';
      i++;
      if (glob[i] === '!') { cls += '^'; i++; }
      while (i < glob.length && glob[i] !== ']') { cls += glob[i] === '\\' ? '\\\\' : glob[i]; i++; }
      re += cls + ']';
    } else {
      re += RE_SPECIAL.has(c) ? '\\' + c : c;
    }
  }
  return re;
}

function compileLine(raw, base) {
  // Trailing whitespace is insignificant; a blank or #-comment line is nothing.
  let line = raw.replace(/\r$/, '').replace(/\s+$/, '');
  if (!line || line[0] === '#') return null;
  let negate = false;
  if (line[0] === '!') { negate = true; line = line.slice(1); }
  if (line[0] === '\\' && (line[1] === '#' || line[1] === '!')) line = line.slice(1);
  let dirOnly = false;
  if (line.endsWith('/')) { dirOnly = true; line = line.slice(0, -1); }
  if (!line) return null;
  // A leading or interior separator anchors the pattern to the base; a bare name matches
  // at any depth under it.
  const hadLeading = line[0] === '/';
  const core = hadLeading ? line.slice(1) : line;
  const anchored = hadLeading || core.includes('/');
  const body = globToRegex(core);
  const prefix = anchored ? '^' : '^(?:.*/)?';
  return { negate, dirOnly, base, re: new RegExp(prefix + body + '$') };
}

// Compile a .gitignore file's text into rules, in line order.
function compileGitignore(text, base) {
  const rules = [];
  for (const raw of String(text || '').split('\n')) {
    const rule = compileLine(raw, base);
    if (rule) rules.push(rule);
  }
  return rules;
}

// The path relative to a rule's base, or null when the path isn't under it.
function relToBase(rel, base) {
  if (!base) return rel;
  if (rel === base) return '';
  return rel.startsWith(base + '/') ? rel.slice(base.length + 1) : null;
}

// Whether a code-root-relative path is ignored by the stacked rules. Directory-only rules
// are consulted only for directories; the last matching rule decides, so negation works.
function isIgnored(rules, rel, isDir) {
  let ignored = false;
  for (const rule of rules) {
    if (rule.dirOnly && !isDir) continue;
    const sub = relToBase(rel, rule.base);
    if (sub === null || sub === '') continue;
    if (rule.re.test(sub)) ignored = !rule.negate;
  }
  return ignored;
}

module.exports = { compileGitignore, isIgnored };
