'use strict';

const { PluginSettingTab, Setting } = require('obsidian');
const { PRESETS, JETBRAINS_PRODUCTS } = require('./constants');
const { t, plural } = require('./i18n');

class CodeLinkerSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; this.expanded = new Set(); }

  // The dropdown key for the active preset: 'ask' in always-ask mode, a built-in
  // preset, or 'u:<i>' for a user editor. Migration guarantees a template match.
  selectedEditor() {
    if (this.plugin.settings.askOnInsert) return 'ask';
    const p = this.plugin.editorPresets().find((x) => x.template === this.plugin.settings.uriTemplate);
    return p ? p.key : 'file';
  }

  // The kinds a language contributes to the index, each with a searchable toggle.
  renderSearchableKinds(lang) {
    const { containerEl } = this;
    const s = this.plugin.settings;
    const counts = new Map();
    for (const e of this.plugin.index) {
      if (e.lang === lang.id) counts.set(e.kind, (counts.get(e.kind) || 0) + 1);
    }
    if (!counts.size) {
      containerEl.createEl('div', { cls: 'setting-item-description code-linker-kind-row', text: t('set.kind.rebuildHint') });
      return;
    }
    const hidden = new Set(s.disabledKinds || []);
    for (const kind of [...counts.keys()].sort()) {
      const key = lang.id + ':' + kind;
      const row = new Setting(containerEl)
        .setName(kind)
        .setDesc(t('set.kind.count', { n: counts.get(kind) }))
        .addToggle((c) => c.setValue(!hidden.has(key)).onChange(async (v) => {
          const set = new Set(s.disabledKinds || []);
          if (v) set.delete(key); else set.add(key);
          s.disabledKinds = [...set];
          await this.plugin.saveSettings();
        }));
      row.settingEl.addClass('code-linker-kind-row');
    }
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    // Scanned-content changes pass rebuild=true; query-time tweaks just persist.
    const save = async (rebuild) => { await this.plugin.saveSettings(); if (rebuild) await this.plugin.rebuildIndex(false); };
    const wide = (c) => { c.inputEl.addClass('code-linker-input'); return c; };

    // --- Code index ---------------------------------------------------------
    new Setting(containerEl).setName(t('set.heading.index')).setHeading();

    new Setting(containerEl)
      .setName(t('set.codeRoot.name'))
      .setDesc(t('set.codeRoot.desc'))
      .addText((c) => wide(c).setPlaceholder(this.plugin.codeRoot()).setValue(s.codeRoot).onChange(async (v) => { s.codeRoot = v.trim(); await save(false); }));

    const area = (setting, get, set) => setting.addTextArea((c) => {
      c.inputEl.rows = 4;
      c.inputEl.addClass('code-linker-input');
      c.setValue(get()).onChange(async (v) => { set(v); await save(false); });
    });

    area(new Setting(containerEl).setName(t('set.scanFolders.name')).setDesc(t('set.scanFolders.desc')), () => s.scanRoots, (v) => (s.scanRoots = v));
    const missing = this.plugin.scanRootStatus().filter((x) => !x.exists).map((x) => x.rel);
    if (missing.length) {
      containerEl.createEl('div', { cls: 'code-linker-section-desc', text: t('set.scanFolders.notFound', { folders: missing.join(', ') }) });
    }
    area(new Setting(containerEl).setName(t('set.skipFolders.name')).setDesc(t('set.skipFolders.desc')), () => s.skipDirs, (v) => (s.skipDirs = v));

    new Setting(containerEl).setName(t('set.maxFileSize.name')).setDesc(t('set.maxFileSize.desc')).addText((c) => {
      c.inputEl.type = 'number';
      // Persist per keystroke, but rebuild once on blur — changing the limit
      // invalidates the cache, so a rebuild per keypress would re-scan everything.
      c.setValue(String(s.maxFileSizeKb)).onChange(async (v) => { const n = parseInt(v, 10); s.maxFileSizeKb = Number.isFinite(n) && n >= 0 ? n : 2048; await save(false); });
      c.inputEl.addEventListener('blur', () => this.plugin.rebuildIndex(false));
    });

    new Setting(containerEl)
      .setName(t('set.autoRefresh.name'))
      .setDesc(t('set.autoRefresh.desc'))
      .addToggle((c) => c.setValue(s.autoRefresh).onChange(async (v) => { s.autoRefresh = v; await save(false); if (v) this.plugin.startWatchers(); else this.plugin.stopWatchers(); }));

    if (s.autoRefresh && this.plugin.watchUnsupported) {
      const warn = new Setting(containerEl).setDesc(t('set.autoRefresh.unsupported'));
      warn.settingEl.addClass('mod-warning');
    }

    new Setting(containerEl)
      .setName(t('set.rebuild.name'))
      .addButton((b) => b.setButtonText(t('set.rebuild.button')).onClick(() => this.plugin.rebuildIndex(true).then(() => this.display())));

    // --- Languages ----------------------------------------------------------
    new Setting(containerEl).setName(t('set.heading.languages')).setHeading();
    const enabled = new Set(s.enabledLanguages || []);
    const enabledCount = this.plugin.languages.filter((l) => enabled.has(l.id)).length;
    containerEl.createEl('div', { cls: 'setting-item-description', text: t('set.languages.desc', { enabled: enabledCount, total: this.plugin.languages.length }) });

    for (const lang of this.plugin.languages) {
      const on = enabled.has(lang.id);
      const open = this.expanded.has(lang.id);
      const ext = lang.extensions.join(' ') || t('set.lang.noExtensions');
      const setting = new Setting(containerEl).setName(lang.name).setDesc(t('set.lang.meta', { id: lang.id, ext }));

      if (on) {
        setting.addExtraButton((b) => b.setIcon(open ? 'chevron-up' : 'chevron-down')
          .setTooltip(open ? t('set.lang.hideEntities') : t('set.lang.showEntities'))
          .onClick(() => { if (open) this.expanded.delete(lang.id); else this.expanded.add(lang.id); this.display(); }));
      } else {
        this.expanded.delete(lang.id);
      }

      setting.addToggle((c) => c.setValue(on).onChange(async (v) => {
        const set = new Set(s.enabledLanguages || []);
        if (v) set.add(lang.id); else set.delete(lang.id);
        s.enabledLanguages = [...set];
        await save(true);
        this.display(); // re-render so the language's chevron/kinds appear or disappear
      }));

      if (on && open) this.renderSearchableKinds(lang);
    }

    for (const bad of this.plugin.languageErrors || []) {
      const row = new Setting(containerEl).setName(bad.id).setDesc(t('set.lang.invalid', { error: bad.error }));
      row.settingEl.addClass('mod-warning');
    }

    // --- Custom languages ---------------------------------------------------
    new Setting(containerEl).setName(t('set.heading.customLanguages')).setHeading();
    containerEl.createEl('div', { cls: 'setting-item-description', text: t('set.customLanguages.desc') });

    const langPath = this.plugin.languagesFilePath();
    const langFile = langPath ? this.app.vault.getAbstractFileByPath(langPath) : null;
    const langSetting = new Setting(containerEl)
      .setName(t('set.languagesFile.name'))
      .setDesc(t('set.languagesFile.desc'))
      .addText((c) => {
        c.setValue(s.languagesFile).onChange(async (v) => { s.languagesFile = v.trim(); await save(false); });
        c.inputEl.addEventListener('blur', () => this.display()); // refresh the Create/Open button for the new path
      });
    if (langFile) {
      langSetting.addExtraButton((b) => b.setIcon('pencil').setTooltip(t('set.languagesFile.open'))
        .onClick(() => this.plugin.openLanguagesFile()));
    } else {
      langSetting.addButton((b) => b.setButtonText(t('set.languagesFile.create')).setCta()
        .onClick(async () => { await this.plugin.createLanguagesFile(); this.display(); }));
    }

    new Setting(containerEl)
      .setName(t('set.reloadLanguages.name'))
      .setDesc(t('set.reloadLanguages.desc'))
      .addButton((b) => b.setButtonText(t('set.reloadLanguages.button')).setCta().onClick(async () => { await this.plugin.loadLanguagesFile(); await this.plugin.rebuildIndex(true); this.display(); }));

    // --- Suggestions & links ------------------------------------------------
    new Setting(containerEl).setName(t('set.heading.suggestions')).setHeading();

    new Setting(containerEl)
      .setName(t('set.trigger.name'))
      .setDesc(t('set.trigger.desc'))
      .addText((c) => c.setValue(s.trigger).onChange(async (v) => { s.trigger = v || '@@'; await save(false); }));

    new Setting(containerEl).setName(t('set.minChars.name')).setDesc(t('set.minChars.desc')).addText((c) => {
      c.inputEl.type = 'number';
      c.inputEl.min = '0';
      c.setValue(String(s.minChars)).onChange(async (v) => { const n = parseInt(v, 10); s.minChars = Number.isFinite(n) && n >= 0 ? n : 1; await save(false); });
    });

    new Setting(containerEl).setName(t('set.maxResults.name')).setDesc(t('set.maxResults.desc')).addText((c) => {
      c.inputEl.type = 'number';
      c.inputEl.min = '1';
      c.setValue(String(s.maxResults)).onChange(async (v) => { const n = parseInt(v, 10); s.maxResults = Number.isFinite(n) && n > 0 ? n : 12; await save(false); });
    });

    new Setting(containerEl)
      .setName(t('set.editorPreset.name'))
      .setDesc(t('set.editorPreset.desc'))
      .addDropdown((d) => {
        for (const p of this.plugin.editorPresets()) d.addOption(p.key, p.label);
        d.addOption('ask', t('set.preset.ask'));
        d.setValue(this.selectedEditor()).onChange(async (v) => {
          const wasJetbrains = this.selectedEditor() === 'jetbrains';
          s.askOnInsert = v === 'ask';
          if (!s.askOnInsert) {
            const p = this.plugin.editorPresets().find((x) => x.key === v);
            if (p) s.uriTemplate = p.template;
          }
          await save(false);
          // Re-render only when the JetBrains product picker needs to appear/disappear;
          // other switches change nothing else on the pane, so the scroll stays put.
          if (wasJetbrains !== (v === 'jetbrains')) this.display();
        });
      });

    if (this.selectedEditor() === 'jetbrains') {
      new Setting(containerEl)
        .setName(t('set.jetbrainsProduct.name'))
        .setDesc(t('set.jetbrainsProduct.desc'))
        .addDropdown((d) => {
          for (const [code, label] of JETBRAINS_PRODUCTS) d.addOption(code, label);
          d.setValue(s.jetbrainsProduct).onChange(async (v) => { s.jetbrainsProduct = v; await save(false); });
        });
    }

    // Your editors — foldable list of named URL templates that join the dropdown above.
    if (this.showEditors === undefined) this.showEditors = false;
    const editors = s.editors || [];
    new Setting(containerEl)
      .setName(t('set.editors.name'))
      .setDesc(t('set.editors.count', { n: editors.length }))
      .addExtraButton((b) => b.setIcon(this.showEditors ? 'chevron-up' : 'chevron-down')
        .setTooltip(this.showEditors ? t('set.editors.collapse') : t('set.editors.expand'))
        .onClick(() => { this.showEditors = !this.showEditors; this.display(); }));

    if (this.showEditors) {
      editors.forEach((ed, i) => {
        const row = new Setting(containerEl)
          .addText((c) => { c.inputEl.addClass('code-linker-editor-name'); c.setPlaceholder(t('set.editors.namePlaceholder')).setValue(ed.name).onChange(async (v) => { ed.name = v; await save(false); }); })
          .addText((c) => { c.inputEl.addClass('code-linker-editor-tpl'); c.setPlaceholder('cursor://file/{abs}:{line}').setValue(ed.template).onChange(async (v) => { if (s.uriTemplate === ed.template) s.uriTemplate = v; ed.template = v; await save(false); }); })
          .addExtraButton((b) => b.setIcon('trash').setTooltip(t('set.editors.remove')).onClick(async () => { if (s.uriTemplate === ed.template) s.uriTemplate = PRESETS.file; editors.splice(i, 1); await save(false); this.display(); }));
        row.settingEl.addClass('code-linker-editor-row');
      });
      // Help sits beside the Add button so it reads as one tidy row instead of floating text.
      new Setting(containerEl)
        .setDesc(t('set.editors.desc'))
        .addButton((b) => b.setButtonText(t('set.editors.add')).setCta().onClick(async () => { editors.push({ name: '', template: '' }); s.editors = editors; await save(false); this.display(); }));
    }

    new Setting(containerEl)
      .setName(t('set.statusBar.name'))
      .setDesc(t('set.statusBar.desc'))
      .addToggle((c) => c.setValue(s.showStatusBar).onChange(async (v) => { s.showStatusBar = v; await save(false); }));

    new Setting(containerEl)
      .setName(t('set.contextMenu.name'))
      .setDesc(t('set.contextMenu.desc'))
      .addToggle((c) => c.setValue(s.contextMenu).onChange(async (v) => { s.contextMenu = v; await save(false); }));

    new Setting(containerEl).setName(t('set.heading.hover')).setHeading();

    new Setting(containerEl)
      .setName(t('set.hoverPreview.name'))
      .setDesc(t('set.hoverPreview.desc'))
      .addToggle((c) => c.setValue(s.hoverPreview).onChange(async (v) => { s.hoverPreview = v; await save(false); }));

    // -1 means "no limit" (to the start/end of the file); other negatives clamp to it.
    new Setting(containerEl).setName(t('set.hoverBefore.name')).setDesc(t('set.hoverBefore.desc')).addText((c) => {
      c.inputEl.type = 'number';
      c.inputEl.min = '-1';
      c.setValue(String(s.hoverBefore)).onChange(async (v) => { const n = parseInt(v, 10); s.hoverBefore = Number.isFinite(n) ? Math.max(-1, n) : 3; await save(false); });
    });

    new Setting(containerEl).setName(t('set.hoverAfter.name')).setDesc(t('set.hoverAfter.desc')).addText((c) => {
      c.inputEl.type = 'number';
      c.inputEl.min = '-1';
      c.setValue(String(s.hoverAfter)).onChange(async (v) => { const n = parseInt(v, 10); s.hoverAfter = Number.isFinite(n) ? Math.max(-1, n) : 20; await save(false); });
    });

    new Setting(containerEl).setName(t('set.heading.links')).setHeading();

    new Setting(containerEl)
      .setName(t('set.markStaleLinks.name'))
      .setDesc(t('set.markStaleLinks.desc'))
      .addToggle((c) => c.setValue(s.markStaleLinks).onChange(async (v) => { s.markStaleLinks = v; await save(false); }));

    const root = this.plugin.codeRoot() || t('set.info.unknownRoot');
    containerEl.createEl('div', { cls: 'setting-item-description', text: t('set.info', { root, entries: plural('entry', this.plugin.index.length) }) });
  }
}

module.exports = { CodeLinkerSettingTab };
