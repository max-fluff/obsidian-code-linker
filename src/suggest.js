'use strict';

const { createSigilSuggest } = require('./shared/deeplink/suggest');

// Inline autocomplete after the trigger. The behaviour is shared with the reference linker;
// what is ours is the disabled-kinds setting and showing a declaration's kind.
const CodeIndexSuggest = createSigilSuggest({
  cls: 'code-linker',
  prepare: (plugin) => {
    const hidden = new Set(plugin.settings.disabledKinds || []);
    return (e) => !hidden.has(e.lang + ':' + e.kind);
  },
  kindText: (e) => e.kind,
});

module.exports = { CodeIndexSuggest };
