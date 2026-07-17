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

// Asks what a bulk pin should anchor to before it runs. Anchors combine by intersection,
// so the default (symbol + line) pins tightly enough that a same-named neighbour can't be
// mistaken for the target — it goes stale honestly instead of silently repinning.
class PinAnchorModal extends Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
    this.anchors = { sym: true, kind: false, line: true };
  }

  onOpen() {
    this.titleEl.setText(t('modal.pinAnchors'));
    this.contentEl.createEl('p', { cls: 'setting-item-description', text: t('modal.pinAnchorsDesc') });
    for (const a of ['sym', 'kind', 'line']) {
      new Setting(this.contentEl)
        .setName(t('modal.pinAnchor.' + a))
        .addToggle((c) => c.setValue(this.anchors[a]).onChange((v) => { this.anchors[a] = v; }));
    }
    new Setting(this.contentEl).addButton((b) =>
      b.setButtonText(t('modal.pinAnchorsSubmit')).setCta().onClick(() => this.submit()));
  }

  submit() {
    if (!this.anchors.sym && !this.anchors.kind && !this.anchors.line) return;
    this.close();
    this.onSubmit(this.anchors);
  }

  onClose() { this.contentEl.empty(); }
}

// Preview of a code-link update before it touches any note: what would change, grouped by
// note and toggleable, and the broken links/embeds that have no fix — so "nothing happened"
// is a verdict you can see, not a fleeting notice. Applies only the notes left checked.
class UpdatePreviewModal extends Modal {
  constructor(app, entries, onApply) {
    super(app);
    this.entries = entries;
    this.onApply = onApply;
    for (const e of entries) for (const c of e.changes) c.selected = true;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('code-linker-preview');
    contentEl.createEl('h3', { text: t('modal.update.title') });

    const changed = this.entries.filter((e) => e.changes.length);
    const total = changed.reduce((n, e) => n + e.changes.length, 0);
    const brokenTotal = this.entries.reduce((n, e) => n + e.broken.length, 0);

    if (!total && !brokenTotal) {
      contentEl.createEl('p', { cls: 'code-linker-preview-empty', text: t('modal.update.upToDate') });
    } else {
      if (total) contentEl.createEl('p', { text: t('modal.update.summary', { links: total, files: changed.length }) });
      if (brokenTotal) contentEl.createEl('p', { cls: 'code-linker-preview-attention', text: t('modal.update.attention', { n: brokenTotal }) });
      this.entries.forEach((e) => this.renderEntry(contentEl, e));
    }

    const bar = contentEl.createDiv({ cls: 'code-linker-preview-buttons' });
    if (total) {
      bar.createEl('button', { text: t('btn.apply'), cls: 'mod-cta' }).onclick = async () => {
        this.close();
        await this.onApply(this.entries);
      };
      bar.createEl('button', { text: t('btn.cancel') }).onclick = () => this.close();
    } else {
      bar.createEl('button', { text: t('btn.close'), cls: 'mod-cta' }).onclick = () => this.close();
    }
  }

  renderEntry(contentEl, e) {
    if (!e.changes.length && !e.broken.length) return;
    const head = contentEl.createDiv({ cls: 'code-linker-preview-file' });
    if (e.changes.length) {
      const rowBoxes = [];
      // The note box mirrors its rows: on when any is kept, dashed when only some are.
      const label = head.createEl('label', { cls: 'code-linker-preview-check' });
      const master = label.createEl('input', { type: 'checkbox' });
      master.checked = true;
      master.onchange = () => {
        e.changes.forEach((c, i) => { c.selected = master.checked; if (rowBoxes[i]) rowBoxes[i].checked = master.checked; });
        master.indeterminate = false;
      };
      label.createSpan({ text: e.label });
      const syncMaster = () => {
        const on = e.changes.filter((c) => c.selected).length;
        master.checked = on > 0;
        master.indeterminate = on > 0 && on < e.changes.length;
      };

      const table = contentEl.createEl('table', { cls: 'code-linker-preview-table' });
      e.changes.slice(0, 50).forEach((c) => {
        const tr = table.createEl('tr');
        const cb = tr.createEl('td', { cls: 'code-linker-preview-pick' }).createEl('input', { type: 'checkbox' });
        cb.checked = c.selected;
        cb.onchange = () => { c.selected = cb.checked; syncMaster(); };
        rowBoxes.push(cb);
        tr.createEl('td', { text: c.label });
        // A move changed the file too — show the path both sides and tint it: a move is a
        // guess (matched by symbol or basename), not a plain line drift.
        if (c.toPath) {
          tr.addClass('code-linker-preview-moved');
          tr.createEl('td', { cls: 'code-linker-preview-move', text: c.fromPath + ':' + c.from + ' → ' + c.toPath + ':' + c.to });
        } else {
          tr.createEl('td', { cls: 'code-linker-preview-move', text: c.from + ' → ' + c.to });
        }
      });
      // Rows beyond 50 aren't drawn but still follow the note box, so nothing is applied unseen.
      if (e.changes.length > 50) contentEl.createEl('div', { cls: 'code-linker-preview-more', text: t('modal.andMore', { n: e.changes.length - 50 }) });
    } else {
      head.setText(e.label);
    }
    e.broken.forEach((label) => contentEl.createDiv({ cls: 'code-linker-preview-broken', text: t('modal.update.brokenRow', { label }) }));
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { CodeLinkModal, PresetPickerModal, LinePromptModal, PinAnchorModal, UpdatePreviewModal };
