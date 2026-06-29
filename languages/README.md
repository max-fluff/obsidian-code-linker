# Built-in languages

Each file here is one built-in language, bundled into `main.js` at build time
(see [`src/builtin-languages.js`](../src/builtin-languages.js)). The format is the
same one users put in their vault's languages file, so any of these doubles as an
example.

```json
{
  "id": "go",
  "name": "Go",
  "extensions": [".go"],
  "patterns": [
    { "re": "^\\s*type\\s+([A-Za-z_]\\w*)\\s+(?:struct|interface)", "kind": "type", "nameGroup": 1 },
    { "re": "^\\s*func\\s+(?:\\([^)]*\\)\\s*)?([A-Za-z_]\\w*)", "kind": "func", "nameGroup": 1 }
  ]
}
```

- `id` — unique key; a vault override with the same `id` replaces the built-in.
- `name` — label shown in settings.
- `extensions` — which files are read.
- `patterns` — each captures a declaration with either `kindGroup` + `nameGroup`
  (the kind is read from the match) or `kind` (a fixed label) + `nameGroup`
  (defaults to group 1). `flags` is optional. Backslashes are double-escaped
  because it's JSON.

To add one: drop `<id>.json` here, list it in
[`src/builtin-languages.js`](../src/builtin-languages.js), then `npm run build`.
