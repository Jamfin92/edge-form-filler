# Form Filler & Lorem Ipsum

A Microsoft Edge extension (Manifest V3) for development and testing: autofills form pages with plausible sample data and fills long text boxes with Lorem Ipsum.

## Run it locally

No build step, no dependencies — the folder is loaded into the browser as-is.

### 1. Get the code

```bash
git clone https://github.com/Jamfin92/edge-form-filler.git
```

### 2. Load it in Edge

1. Open `edge://extensions`
2. Turn on **Developer mode** (toggle in the bottom-left)
3. Click **Load unpacked** and select the `edge-form-filler` folder
4. Pin the icon via the toolbar puzzle-piece menu if you want one-click access

Also works unchanged in Chrome: `chrome://extensions` → Developer mode → Load unpacked.

### 3. Try it

1. Open `test/test-form.html` in a browser tab (drag it in, or `file:///…/edge-form-filler/test/test-form.html`)
2. Click the extension icon → **Fill forms on this page** (or press `Alt+Shift+F`)
3. Every field should fill with sample data; the disabled/read-only/hidden fields at the bottom of the *Misc* section should stay untouched

> **Note:** to run on `file://` pages like the test form, enable **Allow access to file URLs** on the extension's details page (`edge://extensions` → Details). Regular `http(s)` pages work without it.

### 4. Make changes

After editing any file, go to `edge://extensions` and click the **Reload** (circular arrow) button on the extension card. Tabs that were already open are re-injected automatically on the next fill, so no page refresh is needed. Popup-only changes (`popup.*`) just need the popup reopened.

## Usage

- **Toolbar popup** — click the extension icon → **Fill forms on this page**. Options: only fill empty fields (on by default), only fill required fields (off by default; a field counts as required if it has the `required`/`aria-required` attribute or a `*` in its label), and how many Lorem paragraphs go into textareas. The popup also has a standalone Lorem Ipsum generator (paragraphs / sentences / words) with one-click copy.
- **Right-click menu** — *Fill forms with sample data* anywhere on a page, or *Insert Lorem Ipsum here* on any text box, textarea, or rich-text (contenteditable) editor.
- **Keyboard** — `Alt+Shift+F` fills the current page (rebindable at `edge://extensions/shortcuts`).

## What it fills

| Field | Sample value |
|---|---|
| First/last/full name, username | Coherent persona per run (email matches the name) |
| Email | `jordan.miller482@example.com` (reserved example domain) |
| Phone | `(415) 555-0142` (reserved fictional range) |
| Address, city, state, ZIP, country | Plausible US address |
| Middle name / initial | Persona middle name, `T.` for initials |
| Company, job title, department, industry, website | Sample values |
| Product, service | Generated names (`Nimbus Tracker Pro`, `Premium Support`) |
| USD currency (price, amount, cost, fee, total, salary, …) | `$1,234.56` — plain digits when the input is numeric-only; salaries as round yearly figures |
| Quantity, percent/rate, SKU, order/invoice number, SSN | Plausible test values (SSN uses the invalid `000-…` range) |
| Date / time / datetime / month / week / color / range / number | Valid values respecting `min`/`max`/`step`; birth dates get adult ages |
| Card number / CVV / expiry | Standard test values (`4111 1111 1111 1111`) |
| Selects | Random real option (skips placeholder/disabled) |
| Radios / checkboxes | One per group / random, required ones always checked |
| Textareas & contenteditable | Lorem Ipsum, respecting `maxlength` |
| Anything unrecognized | A few capitalized lorem words |

Field intent is detected from `name`, `id`, `placeholder`, `<label>`, `aria-label`/`aria-labelledby`, `autocomplete`, and `title` attributes.

## Notes

- Values are set through the native prototype setters and `input`/`change` events are dispatched, so React, Vue, and Angular controlled forms register the values.
- Fills run in passes (up to 5): after radios/checkboxes/selects are set, the page gets a moment to reveal conditional fields, which are then filled too — recursively, so a field revealed by a revealed field is also covered. Choices made in earlier passes are pinned and never re-rolled.
- Works inside iframes (`all_frames`) and open shadow roots.
- Skips disabled, read-only, hidden, and invisible fields.
- Filled fields flash briefly so you can see what was touched.
- Settings persist via `chrome.storage.sync`.

## Test page

Open `test/test-form.html` in the browser for a page with every supported field type, including commerce/currency fields, a required-only section, conditional fields revealed by radio/checkbox choices (two levels deep), a shadow-DOM widget, a contenteditable editor, and disabled/read-only fields that should be skipped.

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
