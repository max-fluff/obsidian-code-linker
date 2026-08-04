'use strict';

const { t } = require('./shared/i18n');

// The right-click items on the code link under the cursor, declared once for both surfaces
// (shared/actions.js). Ownership is part of resolving: a link the reference linker recognises
// too gets one set of actions, not two.
const linkAt = (plugin, editor) => {
  const link = editor && plugin.codeLinkAtCursor(editor);
  return link && plugin.ownsLinkAtCursor(link) ? { editor, link } : null;
};

const linkAction = ({ id, name, can, run, icon }) => ({
  id,
  name,
  surface: 'editor',
  icon,
  title: () => t(name),
  resolve: (plugin, editor) => {
    const ctx = linkAt(plugin, editor);
    return ctx && (!can || can(plugin, ctx.link)) ? ctx : null;
  },
  run,
});

// Pinning offers one item per anchor the link can carry, so each anchor is its own action and
// its own command; in the menu they share a submenu.
const pinAction = (anchor) => ({
  id: 'pin-code-link-' + anchor,
  name: 'cmd.pin.' + anchor,
  surface: 'editor',
  icon: 'pin',
  section: 'menu.pin',
  title: (ctx) => t('menu.pin.' + anchor, { value: ctx.option.value }),
  resolve: (plugin, editor) => {
    const ctx = linkAt(plugin, editor);
    const option = ctx && plugin.linkPinOption(ctx.link, anchor);
    return option ? Object.assign(ctx, { option }) : null;
  },
  run: (plugin, ctx) => plugin.pinLink(ctx.editor, ctx.link, anchor),
});

const LINK_ACTIONS = [
  linkAction({
    id: 'copy-code-link-at-cursor', name: 'menu.copyLink', icon: 'copy',
    run: (plugin, ctx) => plugin.copyLinkAtCursor(ctx.link),
  }),
  linkAction({
    id: 'fix-code-link', name: 'menu.fixLink', icon: 'wrench',
    can: (plugin, link) => plugin.isLinkStale(link.target),
    run: (plugin, ctx) => plugin.fixLinkAtCursor(ctx.editor, ctx.link),
  }),
  ...['sym', 'kind', 'line'].map(pinAction),
  linkAction({
    id: 'unpin-code-link', name: 'menu.unpin', icon: 'pin-off',
    can: (plugin, link) => plugin.linkAtCursorBound(link),
    run: (plugin, ctx) => plugin.unbindLink(ctx.editor, ctx.link),
  }),
];

module.exports = { LINK_ACTIONS };
