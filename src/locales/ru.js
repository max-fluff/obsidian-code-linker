'use strict';

// Russian.

module.exports = {
  // Commands
  'cmd.rebuildIndex': 'Перестроить индекс кода',
  'cmd.insertLink': 'Вставить ссылку на код',
  'cmd.insertLinkAs': 'Вставить ссылку на код как…',
  'cmd.switchPreset': 'Сменить пресет редактора',
  'cmd.openFile': 'Открыть файл кода',
  'cmd.copyLink': 'Скопировать ссылку на код',
  'cmd.convertSelection': 'Превратить выделение в ссылку на код',
  'cmd.openSelection': 'Найти и открыть код',

  // Editor context menu
  'menu.convert': 'Найти и превратить в ссылку',

  // Notices
  'notice.noCodeRoot': 'Code Linker: не удалось определить корень кода',
  'notice.noScanFolders': 'Code Linker: не заданы папки для сканирования (см. настройки)',
  'notice.noLanguages': 'Code Linker: не включён ни один язык',
  'notice.scanFailed': 'Code Linker: сканирование не удалось — {error}',
  'notice.indexed': 'Code Linker: проиндексировано {entries}',
  'notice.missingFolders': 'Code Linker: папка сканирования не найдена — {folders}',
  'notice.copied': 'Code Linker: ссылка скопирована',
  'notice.editorSet': 'Code Linker: ссылки теперь открываются в {name}',
  'notice.noSelection': 'Code Linker: сначала выделите имя или путь',
  'notice.noMatch': 'Code Linker: нет записи кода для «{query}»',
  'notice.watchUnsupported': 'Code Linker: автообновление недоступно на этой платформе — перестраивайте вручную',

  // Status bar
  'status.indexing': 'Code Linker: индексирование… {n}',
  'status.editor': 'Ссылка на код: {name}',
  'status.editorTooltip': 'Code Linker: клик — сменить редактор, в котором открываются ссылки',

  // Command-palette modal
  'modal.searchPlaceholder': 'Поиск файлов и типов кода…',
  'modal.switchPlaceholder': 'Выберите редактор, в котором открываются ссылки…',
  'modal.formatPlaceholder': 'Выберите формат редактора для этой ссылки…',
  'modal.productPlaceholder': 'Выберите IDE JetBrains…',

  // Settings — headings
  'set.heading.index': 'Индекс кода',
  'set.heading.languages': 'Языки',
  'set.heading.customLanguages': 'Свои языки',
  'set.heading.suggestions': 'Подсказки и ссылки',

  // Settings — code index
  'set.codeRoot.name': 'Корень кода',
  'set.codeRoot.desc': 'Базовая папка, относительно которой задаются пути сканирования. Пусто = папка, содержащая это хранилище.',
  'set.scanFolders.name': 'Папки сканирования',
  'set.scanFolders.desc': 'По одному пути в строке, относительно корня кода. Эти папки сканируются на исходные файлы.',
  'set.scanFolders.notFound': 'Папка не найдена в корне кода.',
  'set.maxFileSize.name': 'Макс. размер файла (КБ)',
  'set.maxFileSize.desc': 'Файлы крупнее индексируются только по имени, без разбора объявлений. 0 = без ограничения.',
  'set.skipFolders.name': 'Пропускаемые папки',
  'set.skipFolders.desc': 'По одному имени папки в строке. В них никогда не заходим.',
  'set.rebuild.name': 'Перестроить индекс сейчас',
  'set.rebuild.button': 'Перестроить',

  // Settings — languages
  'set.languages.desc': 'Какие языки сканируются — включено {enabled} из {total}. Разверните включённый язык, чтобы выбрать, какие виды сущностей в нём доступны для поиска.',
  'set.lang.meta': 'id: {id} · {ext}',
  'set.lang.noExtensions': '(без расширений)',
  'set.lang.showEntities': 'Показать сущности',
  'set.lang.hideEntities': 'Скрыть сущности',
  'set.lang.invalid': 'Некорректно: {error}',
  'set.kind.count': 'в индексе: {n}',
  'set.kind.rebuildHint': 'Перестройте индекс, чтобы выбрать, какие его сущности доступны для поиска.',

  // Settings — custom languages
  'set.customLanguages.desc': 'Добавьте свои языки или переопределите встроенный через JSON-файл в хранилище. Создайте файл по пути ниже, вставьте пример из README, отредактируйте и сохраните — он перезагрузится при сохранении. Запись с id встроенного языка заменяет его; новый id появляется как новый язык выше.',
  'set.languagesFile.name': 'Файл языков',
  'set.languagesFile.desc': 'Путь к JSON-файлу относительно корня хранилища.',
  'set.reloadLanguages.name': 'Перезагрузить файл языков',
  'set.reloadLanguages.desc': 'Перечитывает файл и перестраивает индекс. Также происходит автоматически при сохранении файла.',
  'set.reloadLanguages.button': 'Перезагрузить и перестроить',

  // Settings — suggestions & links
  'set.trigger.name': 'Триггер',
  'set.trigger.desc': 'Введите это, чтобы начать подсказку по коду.',
  'set.editorPreset.name': 'Пресет ссылки на редактор',
  'set.editorPreset.desc': 'В каком редакторе открываются вставленные ссылки. Свои добавляются в «Ваши редакторы» ниже.',
  'set.preset.vscode': 'VS Code',
  'set.preset.jetbrains': 'JetBrains',
  'set.preset.file': 'file://',
  'set.preset.ask': 'Всегда спрашивать',
  'set.jetbrainsProduct.name': 'IDE JetBrains',
  'set.jetbrainsProduct.desc': 'В какой JetBrains IDE открываются ссылки.',
  'set.editors.name': 'Ваши редакторы',
  'set.editors.count': 'добавлено: {n}',
  'set.editors.collapse': 'Свернуть',
  'set.editors.expand': 'Развернуть',
  'set.editors.desc': 'Именованные пресеты для списка выше. Плейсхолдеры: {abs} {path} {line} {name} {project} {product} {root}.',
  'set.editors.namePlaceholder': 'Название',
  'set.editors.remove': 'Удалить',
  'set.editors.add': '+ Добавить редактор',
  'set.statusBar.name': 'Показывать редактор в статус-баре',
  'set.statusBar.desc': 'Показывать активный пресет редактора в статус-баре; клик по нему меняет редактор без входа в настройки.',
  'set.minChars.name': 'Минимум символов',
  'set.minChars.desc': 'Сколько символов ввести, прежде чем появятся подсказки.',
  'set.maxResults.name': 'Максимум результатов',
  'set.maxResults.desc': 'Сколько подсказок показывать одновременно.',
  'set.autoRefresh.name': 'Автообновление индекса',
  'set.autoRefresh.desc': 'Следить за папками сканирования и перестраивать индекс при изменении исходных файлов.',
  'set.autoRefresh.unsupported': 'Рекурсивное слежение за папками не поддерживается на этой платформе (Linux); перестраивайте вручную.',
  'set.contextMenu.name': 'Контекстное меню редактора',
  'set.contextMenu.desc': 'Добавлять «Найти и превратить в ссылку» и «Найти и открыть код» в меню по правому клику.',
  'set.info': 'Корень кода: {root} · проиндексировано {entries}',
  'set.info.unknownRoot': '(неизвестно)',

  // Plural noun phrases
  'plural.entry': { one: '{n} запись', few: '{n} записи', many: '{n} записей', other: '{n} записей' },
};
