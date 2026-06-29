"use strict";

const { PluginSettingTab, Setting } = require("obsidian");
const { PRESETS } = require("./constants");

class CodeLinkerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  detectPreset() {
    const tpl = this.plugin.settings.uriTemplate;
    for (const k of Object.keys(PRESETS)) if (PRESETS[k] === tpl) return k;
    return "custom";
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const save = () => this.plugin.saveSettings();
    const wide = (t) => {
      t.inputEl.style.width = "100%";
      return t;
    };

    // --- Code index ---------------------------------------------------------
    containerEl.createEl("h3", { text: "Code index" });

    new Setting(containerEl)
      .setName("Code root")
      .setDesc("Base folder the scan paths are relative to. Empty = the folder containing this vault.")
      .addText((t) =>
        wide(t)
          .setPlaceholder(this.plugin.codeRoot())
          .setValue(s.codeRoot)
          .onChange(async (v) => {
            s.codeRoot = v.trim();
            await save();
          })
      );

    new Setting(containerEl)
      .setName("Scan folders")
      .setDesc("One path per line, relative to the code root. These folders are scanned for source files.")
      .addTextArea((t) => {
        t.inputEl.rows = 4;
        t.inputEl.style.width = "100%";
        t.setValue(s.scanRoots).onChange(async (v) => {
          s.scanRoots = v;
          await save();
        });
      });

    new Setting(containerEl)
      .setName("Skip folders")
      .setDesc("Folder names never descended into.")
      .addText((t) =>
        wide(t)
          .setValue(s.skipDirs)
          .onChange(async (v) => {
            s.skipDirs = v;
            await save();
          })
      );

    new Setting(containerEl)
      .setName("Rebuild index now")
      .addButton((b) => b.setButtonText("Rebuild").onClick(() => this.plugin.rebuildIndex(true).then(() => this.display())));

    // --- Languages ----------------------------------------------------------
    containerEl.createEl("h3", { text: "Languages" });
    const enabled = new Set(s.enabledLanguages || []);
    const enabledCount = this.plugin.languages.filter((l) => enabled.has(l.id)).length;
    containerEl.createEl("div", {
      cls: "setting-item-description",
      text: `Which languages are scanned, and how declarations are detected. ${enabledCount} of ${this.plugin.languages.length} enabled.`,
    });

    for (const lang of this.plugin.languages) {
      new Setting(containerEl)
        .setName(lang.name)
        .setDesc(`id: ${lang.id} · ${lang.extensions.join(" ") || "(no extensions)"}`)
        .addToggle((t) =>
          t.setValue(enabled.has(lang.id)).onChange(async (v) => {
            const set = new Set(s.enabledLanguages || []);
            if (v) set.add(lang.id);
            else set.delete(lang.id);
            s.enabledLanguages = [...set];
            await save();
            await this.plugin.rebuildIndex(false);
            this.display(); // refresh the searchable-kinds list for the new language
          })
        );
    }

    for (const bad of this.plugin.languageErrors || []) {
      const row = new Setting(containerEl).setName(bad.id).setDesc(`Invalid: ${bad.error}`);
      row.settingEl.addClass("mod-warning");
    }

    new Setting(containerEl)
      .setName("Languages file")
      .setDesc("Vault-relative JSON file with extra/override languages. An entry whose id matches a built-in replaces it.")
      .addText((t) =>
        wide(t)
          .setValue(s.languagesFile)
          .onChange(async (v) => {
            s.languagesFile = v.trim();
            await save();
          })
      );

    new Setting(containerEl)
      .setName("Template / reload")
      .setDesc("Create a starter template at that path, or reload it after editing.")
      .addButton((b) => b.setButtonText("Create template").onClick(() => this.plugin.createLanguagesTemplate().then(() => this.display())))
      .addButton((b) =>
        b
          .setButtonText("Reload & rebuild")
          .setCta()
          .onClick(async () => {
            await this.plugin.loadLanguagesFile();
            await this.plugin.rebuildIndex(true);
            this.display();
          })
      );

    // --- Searchable entities (query-time filter, no rescan) -----------------
    containerEl.createEl("h3", { text: "Searchable entities" });
    const kinds = [...new Set(this.plugin.index.map((e) => e.kind))].sort();
    if (!kinds.length) {
      containerEl.createEl("div", {
        cls: "setting-item-description",
        text: "Rebuild the index to see the entity kinds it contains.",
      });
    } else {
      containerEl.createEl("div", {
        cls: "setting-item-description",
        text: "Turn a kind off to hide it from suggestions (e.g. files, or structs). Applied instantly — no rescan.",
      });
      const hidden = new Set(s.disabledKinds || []);
      for (const kind of kinds) {
        const count = this.plugin.index.reduce((a, e) => a + (e.kind === kind ? 1 : 0), 0);
        new Setting(containerEl)
          .setName(kind)
          .setDesc(`${count} in index`)
          .addToggle((t) =>
            t.setValue(!hidden.has(kind)).onChange(async (v) => {
              const set = new Set(s.disabledKinds || []);
              if (v) set.delete(kind);
              else set.add(kind);
              s.disabledKinds = [...set];
              await save();
            })
          );
      }
    }

    // --- Suggestions & links ------------------------------------------------
    containerEl.createEl("h3", { text: "Suggestions & links" });

    new Setting(containerEl)
      .setName("Trigger")
      .setDesc("Type this to start a code suggestion.")
      .addText((t) =>
        t.setValue(s.trigger).onChange(async (v) => {
          s.trigger = v || "@@";
          await save();
        })
      );

    const detected = this.detectPreset();
    if (this.customMode === undefined) this.customMode = detected === "custom";

    new Setting(containerEl)
      .setName("Editor link preset")
      .setDesc("Which editor the inserted links open in.")
      .addDropdown((d) =>
        d
          .addOption("vscode", "VS Code")
          .addOption("rider", "Rider / JetBrains")
          .addOption("file", "file:// (open in default)")
          .addOption("custom", "Custom")
          .setValue(this.customMode ? "custom" : detected)
          .onChange(async (v) => {
            this.customMode = v === "custom";
            if (!this.customMode && PRESETS[v]) s.uriTemplate = PRESETS[v];
            await save();
            this.display();
          })
      );

    if (this.customMode) {
      new Setting(containerEl)
        .setName("URI template")
        .setDesc("Placeholders: {abs} {path} {line} {name} {project}")
        .addText((t) =>
          wide(t)
            .setValue(s.uriTemplate)
            .onChange(async (v) => {
              s.uriTemplate = v;
              await save();
            })
        );
    }

    new Setting(containerEl).setName("Min characters").addText((t) => {
      t.inputEl.type = "number";
      t.setValue(String(s.minChars)).onChange(async (v) => {
        const n = parseInt(v, 10);
        s.minChars = Number.isFinite(n) ? n : 1;
        await save();
      });
    });

    new Setting(containerEl).setName("Max results").addText((t) => {
      t.inputEl.type = "number";
      t.setValue(String(s.maxResults)).onChange(async (v) => {
        const n = parseInt(v, 10);
        s.maxResults = Number.isFinite(n) && n > 0 ? n : 12;
        await save();
      });
    });

    const info = containerEl.createEl("div", { cls: "setting-item-description" });
    info.setText(`Code root: ${this.plugin.codeRoot() || "(unknown)"} · ${this.plugin.index.length} entries indexed`);
  }
}

module.exports = { CodeLinkerSettingTab };
