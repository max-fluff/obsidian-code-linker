'use strict';

// English — the source of truth. Every other locale falls back to these keys.

module.exports = {
  // Commands
  'cmd.rebuildIndex': 'Rebuild code index',
  'cmd.insertLink': 'Insert code link',
  'cmd.insertLinkAs': 'Insert code link as…',
  'cmd.switchPreset': 'Switch editor preset',
  'cmd.openFile': 'Open code file',
  'cmd.copyLink': 'Copy code link',
  'cmd.convertSelection': 'Convert selection to code link',
  'cmd.openSelection': 'Find and open code',

  // Editor context menu
  'menu.convert': 'Find and convert to link',

  // Notices
  'notice.noCodeRoot': 'Code Linker: could not determine code root',
  'notice.noScanFolders': 'Code Linker: no scan folders configured (see settings)',
  'notice.noLanguages': 'Code Linker: no languages enabled',
  'notice.scanFailed': 'Code Linker: scan failed — {error}',
  'notice.indexed': 'Code Linker: {entries} indexed',
  'notice.missingFolders': 'Code Linker: scan folder not found — {folders}',
  'notice.copied': 'Code Linker: link copied',
  'notice.editorSet': 'Code Linker: links now open in {name}',
  'notice.noSelection': 'Code Linker: select a name or path first',
  'notice.noMatch': 'Code Linker: no code entry matches “{query}”',
  'notice.watchUnsupported': 'Code Linker: auto-refresh is unavailable on this platform — rebuild manually',

  // Status bar
  'status.indexing': 'Code Linker: indexing… {n}',
  'status.editor': 'Code link: {name}',
  'status.editorTooltip': 'Code Linker: click to switch the editor links open in',

  // Command-palette modal
  'modal.searchPlaceholder': 'Search code files and types…',
  'modal.switchPlaceholder': 'Choose the editor links open in…',
  'modal.formatPlaceholder': 'Choose an editor format for this link…',
  'modal.productPlaceholder': 'Choose a JetBrains IDE…',

  // Settings — headings
  'set.heading.index': 'Code index',
  'set.heading.languages': 'Languages',
  'set.heading.customLanguages': 'Custom languages',
  'set.heading.suggestions': 'Suggestions & links',

  // Settings — code index
  'set.codeRoot.name': 'Code root',
  'set.codeRoot.desc': 'Base folder the scan paths are relative to. Empty = the folder containing this vault.',
  'set.scanFolders.name': 'Scan folders',
  'set.scanFolders.desc': 'One path per line, relative to the code root. These folders are scanned for source files.',
  'set.scanFolders.notFound': 'Folder not found under the code root.',
  'set.maxFileSize.name': 'Max file size (KB)',
  'set.maxFileSize.desc': 'Files larger than this are indexed by name only, not parsed for declarations. 0 = no limit.',
  'set.skipFolders.name': 'Skip folders',
  'set.skipFolders.desc': 'One folder name per line. These are never descended into.',
  'set.rebuild.name': 'Rebuild index now',
  'set.rebuild.button': 'Rebuild',

  // Settings — languages
  'set.languages.desc': 'Which languages are scanned — {enabled} of {total} enabled. Expand an enabled language to pick which of its entity kinds are searchable.',
  'set.lang.meta': 'id: {id} · {ext}',
  'set.lang.noExtensions': '(no extensions)',
  'set.lang.showEntities': 'Show entities',
  'set.lang.hideEntities': 'Hide entities',
  'set.lang.invalid': 'Invalid: {error}',
  'set.kind.count': '{n} in index',
  'set.kind.rebuildHint': 'Rebuild the index to choose which of its entities are searchable.',

  // Settings — custom languages
  'set.customLanguages.desc': 'Add your own languages, or override a built-in, from a JSON file in your vault. Create the file at the path below, paste the example from the README, edit it, then save — it reloads on save. An entry whose id matches a built-in replaces it; a new id appears as a new language above.',
  'set.languagesFile.name': 'Languages file',
  'set.languagesFile.desc': 'Path to the JSON file, relative to your vault root.',
  'set.reloadLanguages.name': 'Reload languages file',
  'set.reloadLanguages.desc': 'Re-reads the file and rebuilds. Also happens automatically when you save the file.',
  'set.reloadLanguages.button': 'Reload & rebuild',

  // Settings — suggestions & links
  'set.trigger.name': 'Trigger',
  'set.trigger.desc': 'Type this to start a code suggestion.',
  'set.editorPreset.name': 'Editor link preset',
  'set.editorPreset.desc': 'Which editor the inserted links open in. Add your own under “Your editors” below.',
  'set.preset.vscode': 'VS Code',
  'set.preset.jetbrains': 'JetBrains',
  'set.preset.file': 'file://',
  'set.preset.ask': 'Always ask',
  'set.jetbrainsProduct.name': 'JetBrains IDE',
  'set.jetbrainsProduct.desc': 'Which JetBrains IDE the links open in.',
  'set.editors.name': 'Your editors',
  'set.editors.count': '{n} added',
  'set.editors.collapse': 'Collapse',
  'set.editors.expand': 'Expand',
  'set.editors.desc': 'Named presets for the dropdown above. Placeholders: {abs} {path} {line} {name} {project} {product} {root}.',
  'set.editors.namePlaceholder': 'Name',
  'set.editors.remove': 'Remove',
  'set.editors.add': '+ Add editor',
  'set.statusBar.name': 'Show editor in status bar',
  'set.statusBar.desc': 'Show the active editor preset in the status bar; click it to switch without opening settings.',
  'set.minChars.name': 'Min characters',
  'set.minChars.desc': 'How many characters to type before suggestions appear.',
  'set.maxResults.name': 'Max results',
  'set.maxResults.desc': 'Most suggestions to show at once.',
  'set.autoRefresh.name': 'Auto-refresh index',
  'set.autoRefresh.desc': 'Watch the scan folders and rebuild the index when source files change.',
  'set.autoRefresh.unsupported': 'Recursive folder watching isn’t supported on this platform (Linux); rebuild manually instead.',
  'set.contextMenu.name': 'Editor context menu',
  'set.contextMenu.desc': 'Add “Find and convert to link” and “Find and open code” to the editor right-click menu.',
  'set.info': 'Code root: {root} · {entries} indexed',
  'set.info.unknownRoot': '(unknown)',

  // Plural noun phrases
  'plural.entry': { one: '{n} entry', other: '{n} entries' },
};
