// Shared Lorem Ipsum generator. Loaded by both the content script and the popup.
'use strict';

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et',
  'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis',
  'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea',
  'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur',
  'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt',
  'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
];

const LOREM_CLASSIC =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua.';

function loremWords(n, capitalize = false) {
  const words = [];
  for (let i = 0; i < n; i++) {
    words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
  }
  let s = words.join(' ');
  if (capitalize) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

function loremSentence() {
  const n = 6 + Math.floor(Math.random() * 9); // 6–14 words
  let s = loremWords(n, true);
  if (n > 8 && Math.random() < 0.3) {
    const parts = s.split(' ');
    const at = 3 + Math.floor(Math.random() * (parts.length - 5));
    parts[at] += ',';
    s = parts.join(' ');
  }
  return s + '.';
}

function loremSentences(n) {
  return Array.from({ length: n }, () => loremSentence()).join(' ');
}

function loremParagraph() {
  return loremSentences(3 + Math.floor(Math.random() * 4)); // 3–6 sentences
}

function loremParagraphs(n, startClassic = true) {
  const out = Array.from({ length: n }, () => loremParagraph());
  if (startClassic && out.length) out[0] = LOREM_CLASSIC + ' ' + out[0];
  return out.join('\n\n');
}
