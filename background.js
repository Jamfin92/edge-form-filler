// Service worker: context menus + keyboard command.
'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fill-page',
    title: 'Fill forms with sample data',
    contexts: ['page', 'frame']
  });
  chrome.contextMenus.create({
    id: 'lorem-field',
    title: 'Insert Lorem Ipsum here',
    contexts: ['editable']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id == null) return;
  if (info.menuItemId === 'fill-page') {
    // No frameId: deliver to every frame so embedded forms fill too.
    chrome.tabs.sendMessage(tab.id, { action: 'fillForms' }).catch(() => {});
  } else if (info.menuItemId === 'lorem-field') {
    const opts = info.frameId != null ? { frameId: info.frameId } : {};
    chrome.tabs.sendMessage(tab.id, { action: 'loremIntoTarget' }, opts).catch(() => {});
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'fill-forms') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;
  chrome.tabs.sendMessage(tab.id, { action: 'fillForms' }).catch(() => {});
});
