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

// Manifest content scripts only reach pages loaded after the extension was
// installed or reloaded — inject on demand for tabs that predate it. Still
// fails on restricted pages (browser UI, extension store); stay silent there.
async function sendToTab(tabId, message, opts = {}) {
  try {
    await chrome.tabs.sendMessage(tabId, message, opts);
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ['lorem.js', 'content.js']
      });
      await chrome.tabs.sendMessage(tabId, message, opts);
    } catch (e2) { /* restricted page */ }
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id == null) return;
  if (info.menuItemId === 'fill-page') {
    // No frameId: deliver to every frame so embedded forms fill too.
    sendToTab(tab.id, { action: 'fillForms' });
  } else if (info.menuItemId === 'lorem-field') {
    const opts = info.frameId != null ? { frameId: info.frameId } : {};
    sendToTab(tab.id, { action: 'loremIntoTarget' }, opts);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'fill-forms') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;
  sendToTab(tab.id, { action: 'fillForms' });
});
