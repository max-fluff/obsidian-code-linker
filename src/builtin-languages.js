'use strict';

// The built-in language definitions live as JSON in languages/ and are bundled
// into main.js at build time. To add a built-in, drop a <id>.json in languages/
// (see languages/README.md) and list it here, then rebuild.
//
// Each language is { id, name, extensions, patterns }. A pattern's regex captures
// a declaration via either kindGroup + nameGroup (kind read from the match) or
// kind (a fixed label) + nameGroup (defaults to group 1).
const BUILTIN_LANGUAGES = [
  require('../languages/csharp.json'),
  require('../languages/typescript.json'),
  require('../languages/javascript.json'),
  require('../languages/python.json'),
  require('../languages/java.json'),
  require('../languages/cpp.json'),
  require('../languages/php.json'),
  require('../languages/go.json'),
  require('../languages/rust.json'),
];

module.exports = { BUILTIN_LANGUAGES };
