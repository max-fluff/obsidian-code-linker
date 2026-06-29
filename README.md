# Code Linker

An Obsidian plugin that autocompletes references to your **source code** and
inserts a markdown link whose URL opens the file at the right line in your
editor (VS Code, Rider, …).

Type a trigger (default `@@`) followed by a class or file name, pick a match,
and get something like:

```markdown
[ServerSendInputsSystem](vscode://file/C:/Work/your-project/Assets/.../ServerSendInputsSystem.cs:6)
```

The plugin scans the folders you configure (using Node's filesystem API) and
keeps the index in memory — there is **no index file to commit and nothing to
generate**; the index is rebuilt on startup and on demand.

## Features

- `EditorSuggest` autocomplete on a configurable trigger.
- Indexes file names plus type declarations, with their line numbers.
- Per-language config: each language is a set of file extensions + regexes.
  Built-ins ship for C#, TypeScript, JavaScript, Python, C/C++ and Go; toggle
  them on/off and add your own in the settings.
- Configurable link target via a URI template with presets:
  - **VS Code** — `vscode://file/{abs}:{line}`
  - **Rider / JetBrains** — `jetbrains://rider/navigate/reference?project={project}&path={path}:{line}`
  - **file://** — open in the OS default app
  - **Custom** — anything, using the placeholders below.
- Rebuilds in the background on startup and on demand
  (command **“Code Linker: rebuild code index”**).

## Settings

| Setting | What it does |
| --- | --- |
| **Code root** | Base folder the scan paths resolve against. Empty = the folder containing the vault. |
| **Scan folders** | One path per line, relative to the code root. |
| **Skip folders** | Folder names never descended into (`obj`, `bin`, …). |
| **Trigger** | Text that starts a suggestion (default `@@`). |
| **Editor link preset** | VS Code / Rider / file:// / Custom. |
| **URI template** | Shown only for the *Custom* preset. |

### URI template placeholders

`{abs}` (absolute path, URL-encoded), `{path}` (relative to code root),
`{line}`, `{name}`, `{project}` (first path segment).

The inserted markdown is always `[name](uri)`.

## Install

This plugin is desktop-only (it reads the filesystem).

### Via BRAT (recommended)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2. BRAT → *Add Beta Plugin* → this repository's URL.
3. Enable **Code Linker**, then set **Scan folders** in its settings.

### Manual

Copy `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/code-linker/`, then enable the plugin.

## Languages

Only **enabled** languages are scanned: their extensions decide which files are
read, and their patterns decide which declarations become entries (files always
get a top-of-file entry). Enable/disable languages with the toggles in settings.

To add or override a language, point **Languages file** at a vault-relative JSON
file, click **Create template** for a starter, edit it, then **Reload &
rebuild** (it also reloads automatically when you save the file). An entry whose
`id` matches a built-in replaces it.

```json
[
  {
    "id": "rust",
    "name": "Rust",
    "extensions": [".rs"],
    "patterns": [
      { "re": "^\\s*(?:pub\\s+)?(struct|enum|trait)\\s+([A-Za-z_]\\w*)", "kindGroup": 1, "nameGroup": 2 },
      { "re": "^\\s*(?:pub\\s+)?fn\\s+([A-Za-z_]\\w*)", "kind": "fn", "nameGroup": 1 }
    ]
  }
]
```

Each pattern uses either `kindGroup` + `nameGroup` (the kind is read from the
match) or `kind` (a fixed label) + `nameGroup` (defaults to group 1). `flags`
is optional. Remember to double-escape backslashes inside JSON.

## Searchable entities

The index holds every entity (files plus each declaration kind). Under
**Searchable entities** you can hide a kind — e.g. files, or `struct` — from the
suggestions. This is a query-time filter: toggling it is instant and never
triggers a re-scan.

## Development

The plugin is written as small CommonJS modules in `src/` and bundled into
`main.js` by esbuild. `main.js` is generated — edit `src/` and rebuild rather
than editing it directly.

```sh
npm install      # once, installs esbuild
npm run build    # bundle src/ -> main.js
```

`src/` layout:

- `main.js` — the plugin: settings, language compilation, folder scan, link building.
- `suggest.js` — the `EditorSuggest` that drives autocomplete.
- `settings-tab.js` — the settings UI.
- `builtin-languages.js` — built-in language definitions and the languages-file template.
- `constants.js` — defaults, URI presets, small string helpers.

To deploy into a test vault on each build, create `esbuild.local.mjs` exporting
`deployTargets` (a list of plugin folders to copy the build into).
`node_modules/`, `package-lock.json` and `esbuild.local.mjs` are git-ignored.
