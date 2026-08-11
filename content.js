// Content script: scans the page (including open shadow roots), detects what
// each field wants based on its name/id/label/placeholder/autocomplete, and
// fills it with plausible sample data. Textareas and contenteditables get
// Lorem Ipsum. Values are set through the native prototype setters so React,
// Vue, and Angular forms see the change.
(() => {
  'use strict';

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pad2 = (n) => String(n).padStart(2, '0');

  // ---------------------------------------------------------------- sample data

  const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Jamie', 'Dana', 'Sam', 'Robin', 'Charlie', 'Devon', 'Emerson', 'Harper'];
  const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Moore', 'Clark', 'Walker'];
  const STREETS = ['Maple Street', 'Oak Avenue', 'Cedar Lane', 'Elm Drive', 'Willow Way', 'Birch Boulevard', 'Pine Court', 'Juniper Road', 'Aspen Terrace', 'Chestnut Place'];
  const CITIES = ['Springfield', 'Riverton', 'Fairview', 'Lakeside', 'Greenville', 'Milton', 'Ashford', 'Brookdale', 'Clayton', 'Dayton'];
  const STATES = ['CA', 'NY', 'TX', 'WA', 'IL', 'CO', 'GA', 'NC', 'OH', 'AZ', 'OR', 'MA'];
  const COMPANIES = ['Acme Corp', 'Globex', 'Initech', 'Umbrella Labs', 'Aperture Science', 'Vandelay Industries', 'Wonka Ltd', 'Hooli', 'Soylent Co', 'Cyberdyne Systems'];
  const JOB_TITLES = ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'Marketing Lead', 'Operations Manager', 'Consultant', 'Accountant'];
  const PRODUCT_ADJ = ['Turbo', 'Quantum', 'Nimbus', 'Vertex', 'Atlas', 'Pulse', 'Nova', 'Orbit', 'Zephyr', 'Apex'];
  const PRODUCT_NOUN = ['Widget', 'Gizmo', 'Toolkit', 'Tracker', 'Hub', 'Console', 'Planner', 'Router', 'Blender', 'Kit'];
  const PRODUCT_SUFFIX = ['Pro', 'Mini', 'X', '360', '3000', 'Plus'];
  const SERVICES = ['Consulting', 'Installation', 'Maintenance', 'Training', 'Onboarding', 'Premium Support', 'Auditing', 'Cloud Hosting', 'Managed Backup', 'Same-Day Delivery'];
  const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'Human Resources', 'Customer Support', 'Design'];
  const INDUSTRIES = ['Software', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Finance', 'Hospitality', 'Logistics'];

  function makePersona() {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const n = randInt(1, 999);
    return {
      first,
      last,
      middle: pick(FIRST_NAMES),
      full: `${first} ${last}`,
      product: `${pick(PRODUCT_ADJ)} ${pick(PRODUCT_NOUN)} ${pick(PRODUCT_SUFFIX)}`,
      service: pick(SERVICES),
      email: `${first}.${last}${n}@example.com`.toLowerCase(),
      username: `${first}${last}${n}`.toLowerCase(),
      password: `Xk${randInt(10, 99)}!aB${randInt(100, 999)}z`,
      // (XXX) 555-01XX is the reserved fictional phone range.
      phone: `(${pick(['202', '303', '415', '512', '617'])}) 555-01${pad2(randInt(0, 99))}`,
      street: `${randInt(10, 9999)} ${pick(STREETS)}`,
      unit: `Apt ${randInt(1, 40)}${pick(['A', 'B', 'C', ''])}`,
      city: pick(CITIES),
      state: pick(STATES),
      zip: String(randInt(10000, 99999)),
      country: 'United States',
      company: pick(COMPANIES),
      job: pick(JOB_TITLES),
      website: `https://www.example.com/${last.toLowerCase()}`,
      age: String(randInt(21, 65))
    };
  }

  // Ordered: more specific patterns first ("username" must win over "name").
  const TEXT_PATTERNS = [
    [/e[-_ ]?mail/, (p) => p.email],
    [/user.?name|login|handle|nickname/, (p) => p.username],
    [/pass(word|phrase)|pwd/, (p) => p.password],
    [/phone|mobile|tel(?!l)|fax/, (p) => p.phone],
    [/zip|postal/, (p) => p.zip],
    [/first.?name|given|fname|forename/, (p) => p.first],
    [/last.?name|family|surname|lname/, (p) => p.last],
    [/company|organi[sz]ation|employer|business.?name/, (p) => p.company],
    [/job|title|role|position|occupation/, (p) => p.job],
    [/address.?(2|two)|line.?2|\bapt\b|suite|\bunit\b(?!.?price)/, (p) => p.unit],
    [/street|address/, (p) => p.street],
    [/city|town|locality/, (p) => p.city],
    [/state|province|region/, (p) => p.state],
    [/country/, (p) => p.country],
    [/website|url|domain|homepage/, (p) => p.website],
    [/birth|dob/, () => isoDate(1965, 2004)],
    [/\bage\b/, (p) => p.age],
    [/card.?number|cc.?num/, () => '4111111111111111'],
    [/cvv|cvc|security.?code/, () => String(randInt(100, 999))],
    [/expir|exp.?date/, () => `12/${randInt(27, 32)}`],
    [/middle.?init|\bm\.?i\.?\b/, (p) => p.middle[0] + '.'],
    [/middle.?name|\bmiddle\b/, (p) => p.middle],
    [/salary|\bincome\b|compensation|annual.?pay/, (p, el) => usdWhole(30000, 200000, el)],
    [/price|\bamount\b|\bcost\b|\bfee\b|budget|\btotal\b|subtotal|payment|\bbalance\b|revenue|\busd\b|dollar/, (p, el) => usdCents(5, 2500, el)],
    [/percent|discount|\brate\b|\btax\b/, () => String(randInt(5, 30))],
    [/quantit|\bqty\b|\bunits\b/, () => String(randInt(1, 12))],
    [/\bsku\b|part.?(no|num)|model.?(no|num)|item.?(code|no|num)/, () => `SKU-${randInt(1000, 9999)}-${pick(['A', 'B', 'K', 'X'])}${randInt(1, 9)}`],
    [/order.?(no|num|id)|invoice|confirmation|tracking|reference.?(no|num)/, () => `${pick(['ORD', 'INV', 'REF'])}-${randInt(100000, 999999)}`],
    [/product|item.?name|merchandise/, (p) => p.product],
    [/\bservice\b|\bplan\b|package|\btier\b|subscription/, (p) => p.service],
    [/department|division|\bteam\b/, () => pick(DEPARTMENTS)],
    [/industry|sector/, () => pick(INDUSTRIES)],
    [/ssn|social.?security/, () => `000-${randInt(10, 99)}-${randInt(1000, 9999)}`],
    [/subject|headline|caption/, () => loremWords(randInt(3, 6), true)],
    [/message|comment|description|bio|about|notes|feedback|summary/, () => loremSentences(2)],
    [/search|query|keyword/, () => loremWords(2)],
    [/name/, (p) => p.full]
  ];

  function isoDate(y1, y2) {
    return `${randInt(y1, y2)}-${pad2(randInt(1, 12))}-${pad2(randInt(1, 28))}`;
  }

  // USD helpers: plain digits for inputs that reject symbols (numeric/decimal
  // inputmode or a digit-only pattern), "$1,234.56" style everywhere else.
  function moneyFormat(n, el) {
    const numericOnly = el && (el.inputMode === 'numeric' || el.inputMode === 'decimal' || /\d|0-9/.test(el.pattern || ''));
    if (numericOnly) return Number.isInteger(n) ? String(n) : n.toFixed(2);
    return '$' + n.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2
    });
  }
  const usdCents = (min, max, el) => moneyFormat(randInt(min * 100, max * 100) / 100, el);
  const usdWhole = (min, max, el) => moneyFormat(Math.round(randInt(min, max) / 500) * 500, el);

  // ------------------------------------------------------------------- helpers

  function labelTexts(el) {
    const bits = [];
    if (el.labels) for (const l of el.labels) bits.push(l.textContent);
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const root = el.getRootNode();
      for (const id of labelledBy.split(/\s+/)) {
        const n = root.getElementById && root.getElementById(id);
        if (n) bits.push(n.textContent);
      }
    }
    if (!el.labels || !el.labels.length) {
      const wrap = el.closest('label');
      if (wrap) bits.push(wrap.textContent);
    }
    return bits.filter(Boolean);
  }

  function tokensFor(el) {
    const bits = [
      el.name, el.id, el.placeholder,
      el.getAttribute('aria-label'),
      el.getAttribute('autocomplete'),
      el.getAttribute('data-testid'),
      el.title,
      ...labelTexts(el)
    ];
    // Split camelCase and snake/kebab-case so \b-bounded patterns can see
    // the words inside "totalAmount" or "unit_price".
    return bits.filter(Boolean).join(' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase();
  }

  // "Required" is detected from the required/aria-required attributes or an
  // asterisk marking the field: in its label text, rendered via CSS
  // ::before/::after (a common convention), or anywhere inside the field's
  // own wrapper — the nearest ancestors holding no other fields, so a
  // section-wide "* = required" note can't mark every field around it.
  const STAR_RE = /[*＊✱✳]/;

  function pseudoStar(node) {
    for (const pseudo of ['::before', '::after']) {
      const c = getComputedStyle(node, pseudo).content;
      if (c && STAR_RE.test(c)) return true;
    }
    return false;
  }

  function hasStarMark(node) {
    if (STAR_RE.test(node.textContent)) return true;
    return [node, ...node.querySelectorAll('*')].slice(0, 40).some(pseudoStar);
  }

  // Nearest ancestor containing no form controls besides `el` (radios of the
  // same group don't count, so a group heading's star marks the group).
  function fieldWrapper(el) {
    const sameRadioGroup = (c) => el.type === 'radio' &&
      c instanceof HTMLInputElement && c.type === 'radio' && c.name === el.name;
    let best = null;
    for (let node = el.parentElement, hops = 0; node && hops < 4; node = node.parentElement, hops++) {
      const controls = node.querySelectorAll('input:not([type="hidden"]), textarea, select, [contenteditable=""], [contenteditable="true"]');
      if (![...controls].every((c) => c === el || sameRadioGroup(c))) break;
      best = node;
      if (node.tagName === 'FORM' || node.tagName === 'BODY') break;
    }
    return best;
  }

  function isRequired(el) {
    if (el.required || el.getAttribute('aria-required') === 'true') return true;
    if (labelTexts(el).some((t) => STAR_RE.test(t))) return true;
    const labels = el.labels ? [...el.labels] : [];
    const wrap = el.closest('label');
    if (wrap) labels.push(wrap);
    if (labels.some(hasStarMark)) return true;
    const wrapper = fieldWrapper(el);
    return wrapper ? hasStarMark(wrapper) : false;
  }

  function isVisible(el) {
    if (typeof el.checkVisibility === 'function') return el.checkVisibility();
    return el.getClientRects().length > 0;
  }

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    if (el instanceof HTMLInputElement) {
      const skip = ['hidden', 'submit', 'button', 'reset', 'image', 'file'];
      if (skip.includes(el.type)) return false;
    }
    return isVisible(el);
  }

  // Set value through the native prototype setter so framework-controlled
  // inputs (React et al.) register the change.
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clampToMaxLength(el, text) {
    if (el.maxLength && el.maxLength > 0 && text.length > el.maxLength) {
      const cut = text.slice(0, el.maxLength);
      const lastPeriod = cut.lastIndexOf('.');
      return lastPeriod > el.maxLength * 0.5 ? cut.slice(0, lastPeriod + 1) : cut.trimEnd();
    }
    return text;
  }

  function flash(el) {
    const prevShadow = el.style.boxShadow;
    const prevTransition = el.style.transition;
    el.style.transition = 'box-shadow 0.15s ease';
    el.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.75)';
    setTimeout(() => {
      el.style.boxShadow = prevShadow;
      el.style.transition = prevTransition;
    }, 700);
  }

  // Collect candidate fields from the document and any open shadow roots.
  function collectFields(root, out) {
    for (const el of root.querySelectorAll('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
      out.push(el);
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) collectFields(el.shadowRoot, out);
    }
    return out;
  }

  // -------------------------------------------------------------- fill logic

  function valueForInput(el, persona, options) {
    switch (el.type) {
      case 'email': return persona.email;
      case 'tel': return persona.phone;
      case 'url': return persona.website;
      case 'password': return persona.password;
      case 'color': return '#' + randInt(0, 0xffffff).toString(16).padStart(6, '0');
      case 'date': return /birth|dob/.test(tokensFor(el)) ? isoDate(1965, 2004) : isoDate(2024, 2026);
      case 'time': return `${pad2(randInt(8, 18))}:${pad2(randInt(0, 59))}`;
      case 'datetime-local': return `${isoDate(2024, 2026)}T${pad2(randInt(8, 18))}:${pad2(randInt(0, 59))}`;
      case 'month': return `${randInt(2024, 2026)}-${pad2(randInt(1, 12))}`;
      case 'week': return `${randInt(2024, 2026)}-W${pad2(randInt(1, 52))}`;
      case 'number':
      case 'range': {
        const min = el.min !== '' ? Number(el.min) : 1;
        const max = el.max !== '' ? Number(el.max) : Math.max(min + 99, 100);
        const step = el.step && Number(el.step) > 0 ? Number(el.step) : 1;
        const steps = Math.floor((max - min) / step);
        return String(min + randInt(0, Math.max(steps, 0)) * step);
      }
      default: {
        const tokens = tokensFor(el);
        for (const [re, gen] of TEXT_PATTERNS) {
          if (re.test(tokens)) return gen(persona, el);
        }
        return loremWords(randInt(2, 4), true);
      }
    }
  }

  // Fill in passes: checking a radio/checkbox or picking a select option often
  // reveals conditional fields the page renders on change. After each pass
  // that filled something, wait for the page to settle and sweep again for
  // fields that appeared. `done` and `pickedRadioGroups` pin every decision so
  // later passes never refill a field or re-roll a choice — flipping a radio
  // back and forth would toggle the very sections we're trying to fill.
  const MAX_PASSES = 5;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 200));

  async function fillPage(options) {
    const persona = makePersona();
    const done = new WeakSet();
    const pickedRadioGroups = new Set();
    let filled = 0;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const n = fillOnce(persona, options, done, pickedRadioGroups);
      filled += n;
      if (n === 0) break;
      await settle();
    }
    return filled;
  }

  function fillOnce(persona, options, done, pickedRadioGroups) {
    const fields = collectFields(document, []);
    const radioGroups = new Map();
    let filled = 0;

    for (const el of fields) {
      try {
        if (done.has(el)) continue;
        // Radios are exempt: requiredness is judged per group below.
        if (options.onlyRequired && !(el instanceof HTMLInputElement && el.type === 'radio') && !isRequired(el)) continue;

        if (el instanceof HTMLInputElement) {
          if (!isFillable(el)) continue;

          if (el.type === 'checkbox') {
            done.add(el);
            if (options.onlyEmpty && el.checked) continue;
            if (el.required || Math.random() < 0.6) {
              if (!el.checked) el.click();
              flash(el); filled++;
            }
            continue;
          }
          if (el.type === 'radio') {
            const key = (el.form ? 'f' : 'd') + ' ' + el.name;
            if (pickedRadioGroups.has(key)) { done.add(el); continue; }
            if (!radioGroups.has(key)) radioGroups.set(key, []);
            radioGroups.get(key).push(el);
            continue;
          }
          if (options.onlyEmpty && el.value !== '') { done.add(el); continue; }

          const value = clampToMaxLength(el, valueForInput(el, persona, options));
          setNativeValue(el, value);
          done.add(el);
          flash(el); filled++;

        } else if (el instanceof HTMLTextAreaElement) {
          if (!isFillable(el)) continue;
          if (options.onlyEmpty && el.value !== '') { done.add(el); continue; }
          const text = clampToMaxLength(el, loremParagraphs(options.paragraphs));
          setNativeValue(el, text);
          done.add(el);
          flash(el); filled++;

        } else if (el instanceof HTMLSelectElement) {
          if (!isFillable(el)) continue;
          if (options.onlyEmpty && el.selectedIndex > 0) { done.add(el); continue; }
          const opts = Array.from(el.options).filter((o) => !o.disabled && o.value !== '');
          if (!opts.length) continue;
          if (el.multiple) {
            for (const o of el.options) o.selected = false;
            for (let i = 0; i < randInt(1, Math.min(2, opts.length)); i++) pick(opts).selected = true;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            setNativeValue(el, pick(opts).value);
          }
          done.add(el);
          flash(el); filled++;

        } else if (el.isContentEditable) {
          if (!isVisible(el)) continue;
          if (options.onlyEmpty && el.textContent.trim() !== '') { done.add(el); continue; }
          el.textContent = loremParagraph();
          el.dispatchEvent(new Event('input', { bubbles: true }));
          done.add(el);
          flash(el); filled++;
        }
      } catch (e) {
        // One stubborn field shouldn't stop the run.
      }
    }

    for (const [key, group] of radioGroups) {
      if (options.onlyRequired && !group.some((r) => isRequired(r))) continue;
      const enabled = group.filter((r) => isFillable(r));
      if (!enabled.length) continue;
      pickedRadioGroups.add(key);
      for (const r of group) done.add(r);
      if (options.onlyEmpty && group.some((r) => r.checked)) continue;
      const choice = pick(enabled);
      if (!choice.checked) choice.click();
      flash(choice); filled++;
    }

    return filled;
  }

  // ------------------------------------------------- lorem into a single field

  let lastContextTarget = null;
  document.addEventListener('contextmenu', (e) => {
    const path = e.composedPath();
    lastContextTarget = (path && path[0]) || e.target;
  }, true);

  function loremIntoTarget(options) {
    // If we were injected after the right-click we never saw the contextmenu
    // event; the clicked field still holds focus, so fall back to it.
    const el = lastContextTarget || document.activeElement;
    if (!el) return 0;
    if (el instanceof HTMLTextAreaElement) {
      setNativeValue(el, clampToMaxLength(el, loremParagraphs(options.paragraphs)));
    } else if (el instanceof HTMLInputElement && !['checkbox', 'radio', 'hidden', 'file'].includes(el.type)) {
      setNativeValue(el, clampToMaxLength(el, loremSentence()));
    } else if (el.isContentEditable || (el.closest && el.closest('[contenteditable="true"], [contenteditable=""]'))) {
      const target = el.isContentEditable ? el : el.closest('[contenteditable="true"], [contenteditable=""]');
      target.textContent = loremParagraphs(options.paragraphs);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      return 0;
    }
    flash(el);
    return 1;
  }

  // ------------------------------------------------------------------ messages

  const DEFAULT_OPTIONS = { onlyEmpty: true, onlyRequired: false, paragraphs: 2 };

  async function resolveOptions(msg) {
    if (msg.options) return { ...DEFAULT_OPTIONS, ...msg.options };
    try {
      const stored = await chrome.storage.sync.get(DEFAULT_OPTIONS);
      return { ...DEFAULT_OPTIONS, ...stored };
    } catch (e) {
      return DEFAULT_OPTIONS;
    }
  }

  // Exposed for the popup, which runs the fill per frame via chrome.scripting
  // to get an accurate total (a broadcast sendMessage returns only the first
  // frame's response, so an empty iframe answering fast reads as "Filled 0").
  window.__formFillerFill = (opts) => fillPage({ ...DEFAULT_OPTIONS, ...(opts || {}) });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      const options = await resolveOptions(msg);
      if (msg.action === 'fillForms') {
        sendResponse({ filled: await fillPage(options) });
      } else if (msg.action === 'loremIntoTarget') {
        sendResponse({ filled: loremIntoTarget(options) });
      } else {
        sendResponse({});
      }
    })();
    return true; // keep the channel open for the async response
  });
})();
