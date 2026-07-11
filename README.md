<p align="center">
  <img src="docs/images/banner.svg" alt="Code Linker — autocomplete code references, jump to the exact line" width="760">
</p>

# Code Linker

An Obsidian plugin that autocompletes references to your **source code** and inserts a markdown link whose URL opens the file at the right line in your editor (VS Code, Rider, …).

<p align="center">
  <img src="docs/images/hero.png" alt="A note with a code reference autocompleted and turned into a deep-link" width="700">
</p>

Type a trigger (default `@@`) followed by a class or file name, pick a match, and get something like:

```markdown
[HttpClient](vscode://file/{root}/src/http-client.ts:5)
```

The note keeps the literal `{root}` and a relative path, so it stays portable; `{root}` is filled with your **Code root** when the link is opened (see [Portable `{root}` links](#portable-root-links)).

The plugin ships as `main.js`, `manifest.json` and `styles.css`. The built-in languages live as [`languages/*.json`](languages) and are baked into `main.js` at build time, so it works the moment you install it. The plugin scans the folders you configure (using Node's filesystem API) and keeps the index in memory — there is **no index file to commit and nothing to generate**; the index is rebuilt on startup and on demand. `main.js` is built from `src/` with esbuild (see [Development](#development)).

## Contents

- [What it does](#what-it-does)
  - [Autocomplete as you type](#autocomplete-as-you-type)
  - [Picker commands](#picker-commands)
  - [Selection commands and the context menu](#selection-commands-and-the-context-menu)
  - [Portable `{root}` links](#portable-root-links)
  - [Hover preview](#hover-preview)
  - [Inline embeds](#inline-embeds)
  - [Keeping links current](#keeping-links-current)
- [Languages](#languages)
- [Searchable entities](#searchable-entities)
- [Settings](#settings)
- [Link targets and URI templates](#link-targets-and-uri-templates)
- [Skipped contexts](#skipped-contexts)
- [Public API](#public-api)
- [Development](#development)
- [Installation](#installation)
- [Compatibility](#compatibility)
- [Related plugins](#related-plugins)

## What it does

### Autocomplete as you type

An `EditorSuggest` autocomplete on a configurable trigger, with fuzzy / camelCase matching — `hc` finds `HttpClient`. It indexes file names plus type declarations, with their line numbers, so a suggestion drops you on the exact line. Suggestions are suppressed inside code blocks, inline code, frontmatter and existing links; table cells stay live (a pipe in the link is escaped automatically).

<p align="center">
  <img src="docs/images/suggest.png" alt="The autocomplete dropdown after typing the trigger and a fuzzy query" width="560">
</p>

### Picker commands

A full-screen picker you can bind to hotkeys, in three flavors:

- **Insert code link** — insert a markdown link at the cursor.
- **Insert code link as…** — same, but pick the editor for this one link without changing the default.
- **Open code file** — open the picked file in your editor, without inserting.
- **Copy code link** — copy the markdown link to the clipboard, with `{root}` resolved to the absolute path (a copied link is usually pasted outside the vault, where the portable token wouldn't resolve).

**Switch editor preset** lists your presets (and **Always ask**) so you can change the default without opening settings; picking JetBrains then asks which IDE. The same switcher is in the status bar when **Show editor in status bar** is on.

<p align="center">
  <img src="docs/images/picker-1.png" alt="The command palette filtered to the Code Linker commands" width="560">
  <br><sub>The commands in the palette.</sub>
</p>

<p align="center">
  <img src="docs/images/picker-2.png" alt="The full-screen fuzzy picker listing indexed files and types" width="560">
  <br><sub>The picker, matching files and type declarations.</sub>
</p>

### Selection commands and the context menu

Selection-driven commands resolve the selected name or path (or the token under the cursor) against the index, then act; a single match runs directly, several open the picker. Both are also in the editor's right-click menu:

- **Find and convert to link** — replace the selection with a link.
- **Find and open code** — open the matching file in your editor.

Right-clicking an existing code link (rather than a plain selection) adds link-specific items: **Copy code link** copies that link's resolved target to the clipboard (`{root}` filled in), and **Update this code link** appears when its stored line has drifted (see [Keeping links current](#keeping-links-current)).

<p align="center">
  <img src="docs/images/context-menu-1.png" alt="The editor right-click menu showing Find and convert to link and Find and open code" width="420">
</p>

<p align="center">
  <img src="docs/images/context-menu-2.png" alt="The selected name turned into a portable code link" width="560">
  <br><sub>The selection becomes a portable link.</sub>
</p>

### Portable `{root}` links

`{root}` is **not** expanded when the link is inserted — the note keeps the literal text `{root}`, and the absolute code root is filled in only when the link is rendered (reading view) or opened (live preview). That keeps notes portable: the file on disk holds a relative path, and the machine-specific base comes from your current **Code root** setting. Use it (e.g. `file:///{root}/{path}`) when you don't want absolute paths baked into your notes.

### Hover preview

Hover a code link — in live preview or reading view — to preview the file around the target line, with that line highlighted and Prism syntax colours. The snippet is read straight from disk as a small window (3 lines before, 20 after by default, both configurable), so even a huge file previews instantly; links that don't point at a known code entry just show nothing. Toggle it with **Code preview on hover** in settings; in live preview hold Ctrl/Cmd to show it (like a note preview), while in reading view a plain hover is enough.

### Inline embeds

A fenced `code-link` block renders a snippet of a source file **inline** in the note, so the code lives next to your notes without being copied into them. The first line of the block is the target:

````markdown
```code-link
HttpClient
```
````

- **A symbol name** (`HttpClient`) is resolved through the index to its declaration and shown with that line highlighted. Because it resolves on every render, it tracks the declaration as the code moves — the embed stays correct without you touching it.
- **A path with a line range** (`code-samples/http-client.ts:5-20`) shows exactly those lines.
- **A path with a single line** (`code-samples/http-client.ts:42`) shows that line (add `context: N` to pad it).
- **A bare path** (`code-samples/http-client.ts`) shows the file from the top (capped).

The command **Insert code embed** picks an entry, then offers the embed formats — by symbol, by declaration line, or a line range — and inserts the block. Optional `key: value` lines after the target tune it: `context: N` (grows the window by N lines on each side — around a symbol, a single line, or a range), `lines: 5-20` (override the range), and `title: …` (header label). The header is clickable and opens the file in your editor; right-click an embed for **Open code file** / **Refresh embed**.

Embeds re-render whenever the index rebuilds, so with **Auto-refresh index** on, an open embed updates after you edit the file on disk. A symbol embed re-resolves its line; a range embed re-reads the file's current contents (the line range itself stays fixed).

### Keeping links current

An inserted link stores the declaration's line at the moment you inserted it. As the code moves, that line drifts. Two things help:

- **Mark stale links** (on by default) underlines code links that need attention, in both reading view and live preview: a **warning-coloured** underline when the stored line has drifted from the declaration, and an **error-coloured** one when the link's file is still indexed but the symbol is gone — renamed or removed (a drift the line-fix can't repair; you update the link text yourself).
- **Update code links in this note** / **Update code links in the whole vault** re-resolve each link by its symbol name and path and rewrite the drifted line number. Only links that resolve to a single index entry are touched; anything ambiguous or unrelated is left exactly as it was. Links without a line (the `file://` preset) have nothing to update.
- Right-click a drifted link in the editor and choose **Update this code link** to fix just that one.

## Languages

All built-in languages are enabled by default. Only **enabled** languages are scanned: their extensions decide which files are read, and their patterns decide which declarations become entries (files always get a top-of-file entry). Built-ins ship for C#, TypeScript, JavaScript, Python, Java, C/C++, PHP, Go and Rust; toggle them on/off with the toggles in settings. The built-ins live as [`languages/*.json`](languages) and are bundled into `main.js` at build time.

<p align="center">
  <img src="docs/images/languages-1.png" alt="The Languages setting: each language with its file extensions and an enable toggle" width="680">
</p>

To add or override a language, set **Custom languages → Languages file** to a path in your vault and press **Create file** to write a starter template (the example below). Edit and save it — the plugin reloads on save (or click **Reload & rebuild**). An entry whose `id` matches a built-in replaces it.

```json
[
  {
    "id": "kotlin",
    "name": "Kotlin",
    "extensions": [".kt", ".kts"],
    "prism": "kotlin",
    "patterns": [
      { "re": "^\\s*(?:(?:public|private|internal|open|abstract|sealed|data)\\s+)*(class|interface|object)\\s+([A-Za-z_]\\w*)", "kindGroup": 1, "nameGroup": 2 },
      { "re": "^\\s*(?:(?:public|private|internal|override|suspend|inline)\\s+)*fun\\s+([A-Za-z_]\\w*)", "kind": "fn", "nameGroup": 1 }
    ]
  }
]
```

Each pattern uses either `kindGroup` + `nameGroup` (the kind is read from the match) or `kind` (a fixed label) + `nameGroup` (defaults to group 1). `flags` is optional. Remember to double-escape backslashes inside JSON.

The optional `prism` field is the [Prism](https://prismjs.com/#supported-languages) language id used to syntax-highlight this language in the [hover preview](#hover-preview) (e.g. `"kotlin"`, `"swift"`, `"lua"`). Without it the preview falls back to a generic c-like highlight. Obsidian loads Prism grammars on demand, so a language is reliably coloured once any code block of it has been rendered in a note.

The languages file is your own trusted config: its patterns are compiled and run as-is, with no safety validation. Anchor them (`^…`) and avoid nested quantifiers so a greedy regex can't bog down indexing. Lines longer than 2000 characters are skipped during parsing.

## Searchable entities

Each enabled language lists the entity kinds it actually put in the index (e.g. `class`, `struct`, `file`) right under its toggle in settings. Turn a kind off to hide just that language's entities of that kind from suggestions — so you can keep C# `class` while hiding Go `func`. This is a query-time filter: toggling it is instant and never triggers a re-scan.

<p align="center">
  <img src="docs/images/languages-2.png" alt="A language expanded to show its entity kinds, each with a count and an enable toggle" width="680">
</p>

## Settings

| Setting | What it does |
| --- | --- |
| **Code root** | Base folder the scan paths resolve against. Empty = the folder containing the vault. |
| **Scan folders** | One path per line, relative to the code root. Empty = scan the whole code root. Folders that don't exist are flagged here and in a notice on rebuild. |
| **Max file size (KB)** | Files larger than this are indexed by name only, not parsed for declarations (`0` = no limit, default 2048). |
| **Skip folders** | One per line. A bare name (`node_modules`) is skipped at any depth; a path with a slash (`src/generated`) skips only that folder, relative to the code root. |
| **Auto-refresh index** | Watch the scan folders and rebuild when code changes. Recursive watching isn't supported on Linux — there, rebuild manually (the plugin says so when it can't watch). |
| **Trigger** | Text that starts a suggestion (default `@@`). |
| **Min characters** | How many characters to type after the trigger before suggestions appear (default 1). |
| **Max results** | Most suggestions to show at once (default 12). |
| **Editor link preset** | file:// / VS Code / JetBrains / one of your own editors, or **Always ask** to pick the format on every insert. See [Link targets and URI templates](#link-targets-and-uri-templates). |
| **JetBrains IDE** | Which JetBrains IDE the JetBrains preset opens (shown when it's selected). |
| **Your editors** | Foldable list of named URL templates you add; each appears in the preset dropdown. |
| **Show editor in status bar** | Show the active preset in the status bar; click it to switch editors without opening settings. |
| **Editor context menu** | Add the **Find and convert to link** and **Find and open code** items to the editor's right-click menu (plus **Copy code link** when you right-click an existing code link). |
| **Code preview on hover** | Preview the file around a code link's line on hover (Ctrl/Cmd in live preview). |
| **Preview lines before / after** | Size of the previewed window around the target line (default 3 / 20). `-1` = no limit (to the start/end of the file). |
| **Mark stale links** | Underline code links whose stored line has drifted (warning colour) or whose symbol is gone (error colour). See [Keeping links current](#keeping-links-current). |

**Scan vs. skip folders.** *Scan folders* say where indexing **starts** — specific paths relative to the code root; leave the list empty to scan the whole code root. *Skip folders* then **prune** what's found, and take two forms:

- a **bare name** (`node_modules`, `.git`, `obj`) is skipped wherever it appears, at any depth;
- a **path with a slash** (`projA/Source`) skips only that one folder, relative to the code root.

So if you have two `Source` folders and want to ignore just one, list `projA/Source` — a bare `Source` would drop both.

The index rebuilds in the background on startup and on demand (command **Code Linker: Rebuild code index**), and — when **Auto-refresh index** is on — automatically when source files change. It is cached to disk, so startup is instant; the background rebuild only re-reads files whose modification time changed.

### Styling

The preview/embed line highlight and the stale/broken underlines (colour, underline style) are exposed to the [Style Settings](https://github.com/mgmeyers/obsidian-style-settings) plugin under a *Code Linker* section, so you can restyle them from a UI. Without Style Settings, or left at default, they follow your theme's colours. Every value is a CSS variable, so you can also override them in a CSS snippet (e.g. `--code-linker-highlight-color`, `--code-linker-stale-color`).

## Link targets and URI templates

The link target is a URI template with presets:

- **file://** (default) — `file:///{root}/{path}`, opens in the OS default app. Uses the portable `{root}` token.
- **VS Code** — `vscode://file/{root}/{path}:{line}`, using the portable `{root}` token.
- **JetBrains** — `jetbrains://{product}/navigate/reference?project={project}&path={path}:{line}`, where `{product}` is the IDE you pick in the **JetBrains IDE** setting (IntelliJ IDEA, PyCharm, WebStorm, Rider, …).
- **Your editors** — add named presets of your own (Cursor, PyCharm, Sublime, …) using the placeholders below; they show up alongside the built-ins in the dropdown.

### Placeholders

`{abs}` (absolute path, URL-encoded), `{path}` (relative to code root), `{line}`, `{name}`, `{project}` (first path segment), `{product}` (the JetBrains IDE chosen in settings), `{root}` (see [Portable `{root}` links](#portable-root-links)).

The inserted markdown is always `[name](uri)`.

## Skipped contexts

Suggestions never fire inside code blocks (` ``` ` and `~~~`), inline code, frontmatter, or existing `[[...]]` and `[..](..)` links. When a link is written into a Markdown table cell, the pipe is escaped so the table isn't broken.

## Public API

The in-memory index is exposed at `app.plugins.plugins['code-linker'].api`, so other plugins and DataviewJS can read it without re-scanning:

| Method | Returns |
| --- | --- |
| `getEntries()` | every entry — `{ name, kind, lang, path, line }` |
| `getFiles()` | one row per file — `{ name, path, lang, entries }` |
| `getStats()` | `{ files, entries, byLang, byKind }` |
| `getLanguages()` | enabled languages — `{ id, name, extensions }` |
| `find(text)` | entries matching a name or path tail |
| `linkFor(entry)` | the portable `[name](uri)` markdown link |
| `uriFor(entry)` | a ready-to-open absolute URI (`{root}` resolved) |
| `onChange(cb)` | subscribe to rebuilds; returns an unsubscribe function |
| `version`, `codeRoot()` | plugin version; the resolved code root |

The arrays are copies, so mutating them won't touch the live index. A DataviewJS example — count indexed files per language:

````md
```dataviewjs
const api = app.plugins.plugins['code-linker']?.api;
if (!api) { dv.paragraph('Code Linker is not enabled.'); }
else {
  const { byLang } = api.getStats();
  dv.table(['Language', 'Entries'], Object.entries(byLang));
}
```
````

## Development

The plugin is written as small CommonJS modules in `src/` and bundled into `main.js` by esbuild. `main.js` is generated — edit `src/` and rebuild rather than editing it directly.

```sh
npm install      # once, installs esbuild
npm run build    # bundle src/ -> main.js
```

`src/` layout:

- `main.js` — the plugin: settings, language compilation, folder scan, link building.
- `suggest.js` — the `EditorSuggest` that drives autocomplete.
- `settings-tab.js` — the settings UI.
- `builtin-languages.js` — built-in language definitions (bundled from `languages/*.json`).
- `modal.js` — the command's `FuzzySuggestModal` picker.
- `hover.js` — the file-snippet popover shown on hover.
- `embed.js` — the inline ` ```code-link ` block renderer.
- `render.js` — Prism-highlighted snippet rendering shared by hover and embeds.
- `actualize.js` — stale-link detection and the "Update code links" actions.
- `api.js` — the public API mixed into the plugin prototype.
- `constants.js` — defaults, URI presets, small string helpers.
- `i18n.js` + `locales/` — interface strings (English and Russian).

To deploy into a test vault on each build, create `esbuild.local.mjs` exporting `deployTargets` (a list of plugin folders to copy the build into). `node_modules/`, `package-lock.json` and `esbuild.local.mjs` are git-ignored.

## Installation

This plugin is desktop-only (it reads the filesystem).

**Via [BRAT](https://github.com/TfTHacker/obsidian42-brat) (recommended):** add the repository `max-fluff/obsidian-code-linker`, enable **Code Linker**, then set **Scan folders** in its settings.

**Manually:** copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/code-linker/`, then enable the plugin in *Settings → Community plugins*.

Once it's accepted into the community catalog it will also be installable from *Settings → Community plugins → Browse*.

## Compatibility

Requires Obsidian 1.4.0 or newer. Desktop-only — the index is built by reading the filesystem through Node's API, which isn't available on mobile. Interface in English and Russian, following Obsidian's language.

## Related plugins

Also by the author — **[Glossary Linker](https://community.obsidian.md/plugins/glossary-linker)**: highlights glossary terms in any word form, turns them into real links, and learns new aliases from links you've already made. Works on desktop and mobile.

<p align="center">
  <a href="https://community.obsidian.md/plugins/glossary-linker">
    <img src="docs/images/glossary-linker-banner.svg" alt="Glossary Linker — highlight terms in any word form, then link them" width="480">
  </a>
</p>
