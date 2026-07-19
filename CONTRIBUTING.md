# Contributing

Thanks for taking an interest. Bug reports, language definitions, and pull requests are all welcome.

## Reporting bugs and ideas

Open an [issue](https://github.com/max-fluff/obsidian-code-linker/issues). For a bug, say which Obsidian version you're on, what you did, and what you expected. A small note or screenshot that reproduces it helps a lot.

## Building

```
npm install      # once, installs esbuild
npm run build    # bundle src/ -> main.js
```

`main.js` is generated. Edit the modules in `src/` (or `languages/`) and rebuild — don't edit `main.js` by hand.

`npm test` runs everything. CI runs `npm run test:core` — the tests a push has to pass, which are the ones whose failure you cannot see for yourself: the cross-plugin contract, and whether the built bundle loads at all. The rest pin behaviour, and behaviour is what most commits are meant to change. The [Development](README.md#development) section explains how `src/` is laid out.

## Adding a language

Built-in languages are plain JSON files in `languages/`. Drop a `<id>.json` in, list it in `src/builtin-languages.js`, and rebuild. See [`languages/README.md`](languages/README.md) for the field contract — it's the same format users put in their vault's languages file, so any built-in doubles as an example.

## The shared submodule

`src/shared/` is a git submodule shared with the three sibling linkers, and most of the interesting code lives there. Read [`src/shared/CONTRIBUTING.md`](src/shared/CONTRIBUTING.md) before changing anything under it: it has the architecture, the `api.linker` contract that lets the plugins coexist, the rules for menus, CSS and locales, and the order commits have to go in.

## Pull requests

- Keep changes focused and rebuild before committing so `main.js` matches `src/`.
- Match the surrounding style: small CommonJS modules, comments only where the reason isn't obvious from the code.
- Describe what changed and why in the PR.
