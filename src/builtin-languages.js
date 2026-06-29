"use strict";

// The built-in language definitions live as JSON in languages/ and are bundled
// into main.js at build time. To add a built-in, drop a <id>.json in languages/
// (see languages/README.md) and list it here, then rebuild.
//
// Each language is { id, name, extensions, patterns }. A pattern's regex captures
// a declaration via either kindGroup + nameGroup (kind read from the match) or
// kind (a fixed label) + nameGroup (defaults to group 1).
const BUILTIN_LANGUAGES = [
  require("../languages/csharp.json"),
  require("../languages/typescript.json"),
  require("../languages/javascript.json"),
  require("../languages/python.json"),
  require("../languages/cpp.json"),
  require("../languages/go.json"),
];

// Starter written into the vault's languages file (user extras/overrides). Kept
// as a string so the example shows the JSON double-escaping users must do.
const LANGUAGES_TEMPLATE = `[
  {
    "id": "rust",
    "name": "Rust",
    "extensions": [".rs"],
    "patterns": [
      { "re": "^\\\\s*(?:pub\\\\s+)?(struct|enum|trait)\\\\s+([A-Za-z_]\\\\w*)", "kindGroup": 1, "nameGroup": 2 },
      { "re": "^\\\\s*(?:pub\\\\s+)?fn\\\\s+([A-Za-z_]\\\\w*)", "kind": "fn", "nameGroup": 1 }
    ]
  }
]
`;

module.exports = { BUILTIN_LANGUAGES, LANGUAGES_TEMPLATE };
