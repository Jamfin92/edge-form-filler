# Form Filler & Lorem Ipsum

A Microsoft Edge extension (Manifest V3) for development and testing: autofills form pages with plausible sample data and fills long text boxes with Lorem Ipsum.

## Install (Edge)

1. Open `edge://extensions`
2. Turn on **Developer mode** (bottom-left toggle)
3. Click **Load unpacked** and select this folder

Also works unchanged in Chrome via `chrome://extensions`.

## Usage

- **Toolbar popup** — click the extension icon → **Fill forms on this page**. Options: only fill empty fields (on by default) and how many Lorem paragraphs go into textareas. The popup also has a standalone Lorem Ipsum generator (paragraphs / sentences / words) with one-click copy.
- **Right-click menu** — *Fill forms with sample data* anywhere on a page, or *Insert Lorem Ipsum here* on any text box, textarea, or rich-text (contenteditable) editor.
- **Keyboard** — `Alt+Shift+F` fills the current page (rebindable at `edge://extensions/shortcuts`).

## What it fills

| Field | Sample value |
|---|---|
| First/last/full name, username | Coherent persona per run (email matches the name) |
| Email | `jordan.miller482@example.com` (reserved example domain) |
| Phone | `(415) 555-0142` (reserved fictional range) |
| Address, city, state, ZIP, country | Plausible US address |
| Company, job title, website | Sample values |
| Date / time / datetime / month / week / color / range / number | Valid values respecting `min`/`max`/`step`; birth dates get adult ages |
| Card number / CVV / expiry | Standard test values (`4111 1111 1111 1111`) |
| Selects | Random real option (skips placeholder/disabled) |
| Radios / checkboxes | One per group / random, required ones always checked |
| Textareas & contenteditable | Lorem Ipsum, respecting `maxlength` |
| Anything unrecognized | A few capitalized lorem words |

Field intent is detected from `name`, `id`, `placeholder`, `<label>`, `aria-label`/`aria-labelledby`, `autocomplete`, and `title` attributes.

## Notes

- Values are set through the native prototype setters and `input`/`change` events are dispatched, so React, Vue, and Angular controlled forms register the values.
- Works inside iframes (`all_frames`) and open shadow roots.
- Skips disabled, read-only, hidden, and invisible fields.
- Filled fields flash briefly so you can see what was touched.
- Settings persist via `chrome.storage.sync`.

## Test page

Open `test/test-form.html` in the browser for a page with every supported field type, including a shadow-DOM widget, a contenteditable editor, and disabled/read-only fields that should be skipped.

## Files

```
manifest.json    MV3 manifest
background.js    Service worker: context menus + keyboard command
content.js       Field detection + fill logic (runs on every page)
lorem.js         Lorem Ipsum generator (shared by content script and popup)
popup.html/js/css  Toolbar popup UI
icons/           Generated PNG icons
test/            Test form page
```
