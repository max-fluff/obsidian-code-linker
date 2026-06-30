'use strict';

const { FuzzySuggestModal } = require('obsidian');
const { t } = require('./i18n');

// Full-screen picker over the code index. The caller supplies what to do with the
// chosen entry (insert, open, copy…), so the same modal serves every command.
class CodeLinkModal extends FuzzySuggestModal {
  constructor(app, plugin, opts) {
    super(app);
    this.plugin = plugin;
    this.onChoose = (opts && opts.onChoose) || (() => {});
    this.initialQuery = (opts && opts.query) || '';
    this.setPlaceholder(t('modal.searchPlaceholder'));
  }

  onOpen() {
    super.onOpen();
    if (this.initialQuery) {
      this.inputEl.value = this.initialQuery;
      this.inputEl.dispatchEvent(new Event('input'));
    }
  }

  getItems() {
    const hidden = new Set(this.plugin.settings.disabledKinds || []);
    return this.plugin.index.filter((e) => !hidden.has(e.lang + ':' + e.kind));
  }

  // Path keeps same-named entries distinct in the modal's own fuzzy search.
  getItemText(e) {
    return `${e.name}  ${e.kind}  ${e.path}`;
  }

  onChooseItem(e) {
    this.onChoose(e);
  }
}

module.exports = { CodeLinkModal };
