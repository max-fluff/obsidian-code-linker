"use strict";

const PRESETS = {
  vscode: "vscode://file/{abs}:{line}",
  rider: "jetbrains://rider/navigate/reference?project={project}&path={path}:{line}",
  file: "file:///{abs}",
};

const DEFAULTS = {
  trigger: "@@",
  uriTemplate: PRESETS.vscode,
  codeRoot: "", // empty => parent folder of the vault
  scanRoots: "", // one path per line, relative to codeRoot
  skipDirs: "obj, bin, .git, Library, Temp, node_modules",
  enabledLanguages: ["csharp"],
  languagesFile: "code-languages.json", // vault-relative JSON of extra/override languages
  disabledKinds: [], // entity kinds hidden from suggestions (query-time filter)
  minChars: 1,
  maxResults: 12,
};

const splitLines = (s) =>
  (s || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const splitList = (s) =>
  (s || "")
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

module.exports = { PRESETS, DEFAULTS, splitLines, splitList };
