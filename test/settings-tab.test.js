'use strict';

// Nothing else in the suite builds this tab, so a section lost or a throw halfway through it
// would only surface when a reader opens Settings. This runs display() end to end.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs, obsidianStub, RecordingSetting, elLike } = require('../src/shared/testing/stubs');

installStubs();

obsidianStub.Setting = RecordingSetting;

const { t } = require('../src/shared/i18n');
const { PRESETS } = require('../src/constants');
// The tab destructures `Setting` when it loads, and another test file already pulled it in
// through main.js before this one ran — so it captured the plain stub. Drop it from the cache
// and load it again, now that the recording one is installed.
const TAB = require.resolve(path.join(__dirname, '..', 'src', 'settings-tab.js'));
delete require.cache[TAB];
const { CodeLinkerSettingTab } = require(TAB);

function fakePlugin(over) {
  return Object.assign({
    settings: {
      codeRoot: '/code', scanRoots: '', skipDirs: '', useGitignore: true, maxFileSizeKb: 2048,
      autoRefresh: true, enabledLanguages: ['csharp'], languagesFile: 'code-languages.json',
      disabledKinds: [], trigger: '@@', minChars: 1, maxResults: 12,
      uriTemplate: PRESETS.file, jetbrainsProduct: 'idea', editors: [], hiddenPresets: [],
      askOnInsert: true, showStatusBar: false, showRibbonIcon: true, contextMenu: true,
      hoverPreview: true, hoverBefore: 3, hoverAfter: 20, markStaleLinks: true, linkPrecedence: 20,
    },
    languages: [{ id: 'csharp', name: 'C#', extensions: ['.cs'] }],
    index: [],
    hasGitignore: true,
    watchUnsupported: false,
    api: { linker: { id: 'code-linker', precedence: 20 } },
    codeRoot: () => '/code',
    scanRootStatus: () => [],
    editorPresets: () => [{ key: 'file', name: 'file://', template: PRESETS.file }],
    usesProduct: () => false,
    languagesFilePath: () => '/code/code-languages.json',
    saveSettings: async () => {},
    rebuildIndex: async () => {},
    startWatchers: () => {},
    stopWatchers: () => {},
    applyRibbonIcon: () => {},
  }, over || {});
}

const draw = (over) => {
  RecordingSetting.reset();
  const tab = new CodeLinkerSettingTab(fakeApp, fakePlugin(over));
  tab.containerEl = elLike();
  tab.display();
  return tab;
};

describe('the code settings tab', () => {
  it('renders every section without throwing', () => {
    draw();
    const headings = RecordingSetting.entries.filter((e) => e.heading).map((e) => e.name);
    assert.ok(headings.includes(t('set.heading.index')), 'index section missing');
    assert.ok(headings.includes(t('set.heading.languages')), 'languages section missing');
    assert.ok(headings.includes(t('set.heading.suggestions')), 'suggestions section missing');
    assert.ok(headings.includes(t('set.heading.maintenance')), 'maintenance section missing');
  });

  it('offers the settings this plugin owns', () => {
    draw();
    const names = RecordingSetting.names();
    assert.ok(names.includes(t('set.codeRoot.name')), 'code root missing');
    assert.ok(names.includes(t('set.trigger.name')), 'trigger missing');
    assert.ok(names.includes(t('set.ribbon.name')), 'ribbon toggle missing');
  });

  // The row toggles something that has nothing to act on where the scan met no .gitignore.
  it('offers the gitignore toggle only where the scan met one', () => {
    draw();
    assert.ok(RecordingSetting.names().includes(t('set.gitignore.name')));
    draw({ hasGitignore: false });
    assert.ok(!RecordingSetting.names().includes(t('set.gitignore.name')));
  });

  it('keeps the reader’s place when a fold redraws the pane', () => {
    const tab = draw();
    tab.containerEl.scrollTop = 260;
    tab.display();
    assert.strictEqual(tab.containerEl.scrollTop, 260);
  });
});
