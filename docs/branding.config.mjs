// Branding config for Code Linker — drives both the store plates and the vector headers.
// Run: npm run plates / npm run banner
// See src/shared/branding/BRANDING.md for the full field reference.

export default {
  imagesDir: 'docs/images',
  outDir: 'docs/images/store',

  brand: {
    gradient: ['#27243d', '#191826'],
    tokenColor: '#b6a6e8',
    tokenMono: true,
    tokens: [
      '.cs', 'TypeScript', '.py', 'Rust', '.go', 'Kotlin', 'Python',
      '.tsx', 'C++', 'Java', '.rs', 'Swift', '.php', '.lua',
    ],
    mark: { kind: 'glyph', text: '[{}]' },
    wordmark: { text: 'Code Linker' },
    tagline: 'Autocomplete code references, jump to the exact line.',
  },

  plates: [
    { src: 'suggest.png',        title: 'Autocomplete code references',
      caption: 'Type @@ and pick a class, function, or file — no path to remember.' },
    { src: 'hero.png',           title: 'Jump straight to the line',
      caption: 'References render as links that open the file at the exact line.' },
    { src: 'picker-2.png',       title: 'Find and open code',
      caption: 'Fuzzy-search every symbol in your vault’s source and open the match.' },
    { src: 'context-menu-1.png', title: 'Convert text into a link',
      caption: 'Right-click any bare name and turn it into a code link in place.' },
    { src: 'languages-1.png',    title: 'Index what you want',
      caption: 'Choose which languages — and which entity kinds — get scanned.' },
    { src: 'hover.png',          title: 'Preview on hover',
      caption: 'Hover a link to read the source around the target line, in place.' },
    { src: 'embed.png',          title: 'Embed code in your notes',
      caption: 'A code-link block renders a snippet inline and follows the code.' },
  ],
};
