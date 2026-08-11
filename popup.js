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

$('fill').addEventListener('click', async () => {
  saveSettings();
  const options = {
    onlyEmpty: $('onlyEmpty').checked,
    paragraphs: clampNum($('paragraphs'), 1, 10, 2)
  };
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) throw new Error('no tab');
    const res = await chrome.tabs.sendMessage(tab.id, { action: 'fillForms', options });
    showStatus(`Filled ${res && res.filled != null ? res.filled : 0} field${res && res.filled === 1 ? '' : 's'}.`);
  } catch (e) {
    showStatus('Can’t run on this page (browser pages and the extension store are off-limits).');
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
