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
keeps the index in memory — there is **no external build step and no index
file to commit**.

## Features

- `EditorSuggest` autocomplete on a configurable trigger.
- Indexes file names plus C# type declarations (`class` / `struct` /
  `interface` / `enum` / `record`) with their line numbers.
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
| **Extensions** | File extensions to index, e.g. `.cs .ts`. |
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

## Notes

Type detection is tuned for C#; file indexing works for any language. To index
other languages, add their extensions and (if you want type-level entries)
extend the declaration regex in `main.js`.
