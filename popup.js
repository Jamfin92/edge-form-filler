'use strict';

const $ = (id) => document.getElementById(id);

const DEFAULTS = { onlyEmpty: true, paragraphs: 2, loremCount: 3, loremUnit: 'paragraphs' };

async function loadSettings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  $('onlyEmpty').checked = s.onlyEmpty;
  $('paragraphs').value = s.paragraphs;
  $('loremCount').value = s.loremCount;
  $('loremUnit').value = s.loremUnit;
}

function saveSettings() {
  chrome.storage.sync.set({
    onlyEmpty: $('onlyEmpty').checked,
    paragraphs: clampNum($('paragraphs'), 1, 10, 2),
    loremCount: clampNum($('loremCount'), 1, 50, 3),
    loremUnit: $('loremUnit').value
  });
}

function clampNum(input, min, max, fallback) {
  const n = parseInt(input.value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function showStatus(text) {
  const el = $('status');
  el.textContent = text;
  el.hidden = false;
}

// Pages the browser refuses to script: its own UI and the extension stores.
// A missing url means we have no access to the tab at all — same verdict.
function isRestricted(url) {
  if (!url || !/^(https?|file|ftp):/i.test(url)) return true;
  return /^https:\/\/(microsoftedge\.microsoft\.com\/addons|chrome\.google\.com\/webstore|chromewebstore\.google\.com)\//i.test(url);
}

// Manifest content scripts only reach pages loaded after the extension was
// installed or reloaded — inject on demand for tabs that predate it.
async function sendToTab(tab, message) {
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (e) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['lorem.js', 'content.js']
    });
    return chrome.tabs.sendMessage(tab.id, message);
  }
}

$('fill').addEventListener('click', async () => {
  saveSettings();
  const options = {
    onlyEmpty: $('onlyEmpty').checked,
    paragraphs: clampNum($('paragraphs'), 1, 10, 2)
  };
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null || isRestricted(tab.url)) {
    showStatus('Can’t run on this page (browser pages and the extension store are off-limits).');
    return;
  }
  try {
    const res = await sendToTab(tab, { action: 'fillForms', options });
    showStatus(`Filled ${res && res.filled != null ? res.filled : 0} field${res && res.filled === 1 ? '' : 's'}.`);
  } catch (e) {
    showStatus(tab.url.startsWith('file:')
      ? 'Turn on “Allow access to file URLs” for this extension on the edge://extensions card, then retry.'
      : 'Can’t run on this page (browser pages and the extension store are off-limits).');
  }
});

function generateLorem() {
  const count = clampNum($('loremCount'), 1, 50, 3);
  const unit = $('loremUnit').value;
  if (unit === 'words') return loremWords(count, true);
  if (unit === 'sentences') return loremSentences(count);
  return loremParagraphs(count);
}

$('generate').addEventListener('click', () => {
  saveSettings();
  $('output').value = generateLorem();
});

$('copy').addEventListener('click', async () => {
  if (!$('output').value) $('output').value = generateLorem();
  try {
    await navigator.clipboard.writeText($('output').value);
    $('copy').textContent = 'Copied!';
  } catch (e) {
    $('output').select();
    document.execCommand('copy');
    $('copy').textContent = 'Copied!';
  }
  setTimeout(() => { $('copy').textContent = 'Copy'; }, 1200);
});

for (const id of ['onlyEmpty', 'paragraphs', 'loremCount', 'loremUnit']) {
  $(id).addEventListener('change', saveSettings);
}

loadSettings();
