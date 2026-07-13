'use strict';

// Git info for the permalink presets, read straight from .git (no git binary). Both entry
// points return { remote, sha, branch, repoRoot }, or null when there's no repo/HEAD/remote.

const fs = require('fs');
const nodePath = require('path');

function resolveGit(absFile) {
  return repoFrom(nodePath.dirname(absFile));
}

function resolveGitDir(dir) {
  return repoFrom(dir);
}

function repoFrom(startDir) {
  const found = findGitDir(startDir);
  if (!found) return null;
  const head = readHead(found.gitDir);
  if (!head) return null;
  const remote = readRemote(found.gitDir);
  if (!remote) return null;
  return { remote, sha: head.sha, branch: head.branch, repoRoot: found.repoRoot };
}

// Walk up to the nearest repo, so a vault spanning several repos links each file to its
// own. `.git` is a folder in a clone; a "gitdir: <path>" file in a worktree or submodule.
function findGitDir(startDir) {
  let dir = startDir;
  for (;;) {
    const dotGit = nodePath.join(dir, '.git');
    let st;
    try { st = fs.statSync(dotGit); } catch { st = null; }
    if (st && st.isDirectory()) return { repoRoot: dir, gitDir: dotGit };
    if (st) {
      const m = readText(dotGit).match(/^gitdir:\s*(.+)$/m);
      if (m) {
        const p = m[1].trim();
        return { repoRoot: dir, gitDir: nodePath.isAbsolute(p) ? p : nodePath.resolve(dir, p) };
      }
    }
    const parent = nodePath.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Branch + commit from HEAD: a symbolic ref names a branch; a detached HEAD is a bare sha.
function readHead(gitDir) {
  const head = readText(nodePath.join(gitDir, 'HEAD')).trim();
  const ref = head.match(/^ref:\s*(.+)$/);
  if (!ref) return /^[0-9a-f]{40}$/i.test(head) ? { sha: head, branch: null } : null;
  const refName = ref[1].trim();
  const sha = readRef(gitDir, refName);
  if (!sha) return null;
  return { sha, branch: refName.startsWith('refs/heads/') ? refName.slice('refs/heads/'.length) : null };
}

// A ref's commit: the loose ref file, else packed-refs. Worktrees keep refs in the
// shared commondir, so check there too.
function readRef(gitDir, refName) {
  const dirs = [gitDir];
  const common = readText(nodePath.join(gitDir, 'commondir')).trim();
  if (common) dirs.push(nodePath.resolve(gitDir, common));
  for (const d of dirs) {
    const loose = readText(nodePath.join(d, refName)).trim();
    if (/^[0-9a-f]{40}$/i.test(loose)) return loose;
    for (const line of readText(nodePath.join(d, 'packed-refs')).split('\n')) {
      const m = line.match(/^([0-9a-f]{40})\s+(.+)$/);
      if (m && m[2].trim() === refName) return m[1];
    }
  }
  return null;
}

// The remote's URL, origin preferred, else the first one found.
function readRemote(gitDir) {
  const config = readText(nodePath.join(gitDir, 'config'));
  let section = '', origin = '', fallback = '';
  for (const raw of config.split('\n')) {
    const line = raw.trim();
    const sec = line.match(/^\[(.+?)\]$/);
    if (sec) { section = sec[1].trim(); continue; }
    const kv = line.match(/^url\s*=\s*(.+)$/);
    if (!kv || !/^remote\b/.test(section)) continue;
    if (/^remote\s+"origin"$/.test(section)) origin = kv[1].trim();
    else if (!fallback) fallback = kv[1].trim();
  }
  return normalizeRemote(origin || fallback);
}

// git@host:org/repo.git, ssh://git@host/org/repo.git and https://user@host/org/repo.git
// all collapse to https://host/org/repo.
function normalizeRemote(url) {
  let s = (url || '').trim();
  if (!s) return null;
  const scp = s.match(/^[^/@]+@([^:]+):(.+)$/); // user@host:path
  if (scp) s = 'https://' + scp[1] + '/' + scp[2];
  else s = s.replace(/^(?:ssh|git|http):\/\//i, 'https://');
  s = s.replace(/^(https:\/\/)[^/@]+@/i, '$1'); // strip userinfo
  s = s.replace(/\.git$/i, '').replace(/\/+$/, '');
  return /^https:\/\/[^/]+\/.+/.test(s) ? s : null;
}

function readText(path) {
  try { return fs.readFileSync(path, 'utf8'); } catch { return ''; }
}

module.exports = { resolveGit, resolveGitDir, normalizeRemote };
