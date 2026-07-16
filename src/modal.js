'use strict';

const { FuzzySuggestModal, Modal, Setting } = require('obsidian');
const { t } = require('./shared/i18n');

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

// Small fuzzy picker over editor presets ({ label, ... }). Used to switch the
// default editor and to choose a format per insert ("Always ask" / "Insert as…").
class PresetPickerModal extends FuzzySuggestModal {
  constructor(app, items, onChoose, placeholder) {
    super(app);
    this.items = items;
    this.onChoose = onChoose;
    if (placeholder) this.setPlaceholder(placeholder);
  }

  getItems() { return this.items; }
  getItemText(p) { return p.label; }
  onChooseItem(p) { this.onChoose(p); }
}

// Asks which line of the chosen file to link to, defaulting to the entry's own.
class LinePromptModal extends Modal {
  constructor(app, line, onSubmit) {
    super(app);
    this.line = String(line);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    this.titleEl.setText(t('modal.linePrompt'));
    new Setting(this.contentEl).addText((c) => {
      c.setValue(this.line).onChange((v) => { this.line = v; });
      c.inputEl.type = 'number';
      c.inputEl.min = '1';
      c.inputEl.focus();
      c.inputEl.select();
      c.inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.submit(); });
    });
    new Setting(this.contentEl).addButton((b) =>
      b.setButtonText(t('modal.lineSubmit')).setCta().onClick(() => this.submit()));
  }

  submit() {
    const n = parseInt(this.line, 10);
    if (!(n >= 1)) return;
    this.close();
    this.onSubmit(n);
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { CodeLinkModal, PresetPickerModal, LinePromptModal };
