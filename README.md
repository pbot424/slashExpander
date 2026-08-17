# /Expander

/Expander is a Manifest V3 Chrome extension that replaces custom shortcuts with text you save across normal browser pages. It runs entirely in the browser and has no backend or runtime dependencies.

## MVP features

- Expand shortcuts across normal websites in standard inputs, textareas, embedded frames, and most `contenteditable` editors.
- Choose Space, Tab, and Enter independently, or enable mutually exclusive Auto-Expand.
- Choose from common shortcut prefixes, such as `/aurora`, `;reply`, or `!address`.
- Organize commands into collapsible user-created sections, create commands directly inside them, drag commands between them, or leave commands in General.
- Create, edit, search, and delete commands in a three-rail manager with its own live test field.
- Duplicate an existing command into a reviewable, uniquely named draft before saving it.
- Insert reusable date formulas, including a PO Date Range preset, with live previews calculated at expansion time.
- Manage global expansion behavior and import/export command data from a dedicated Settings menu.
- Test a command directly in the extension popup.
- Store commands in quota-safe chunks in `chrome.storage.sync`; no data is sent to an external service.
- Start with an empty command library; version 0.3 preserves existing commands in General and adds opt-in sections.

## Install in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose this folder: `C:\Users\hung.tran\slash-expander`.
5. Pin **/Expander** from Chrome's extensions menu if you want quick access.

Open the popup and choose **New command**. For example, save `/hello` with this expansion:

```text
Hello! Thanks for reaching out.
```

Refresh pages that were open before installing the extension once if Chrome prevented immediate injection. New and ordinary open tabs are handled automatically. Type `/hello` in a normal website text field and press Space, Tab, or Enter.

## Dynamic date formulas

Choose **Insert formula** beside the Expansion field, then select a formula from the preset dropdown. The **PO Date Range** preset inserts tomorrow through Friday of next week in `MM/DD` format without requiring formula syntax. Its end date stays fixed during the current Monday-through-Sunday week and resets the following Monday. The dropdown is ready for additional presets in future versions.

For example, an expansion saved as:

```text
PEORIA {{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}
```

resolves to `PEORIA 08/18-08/28` on Monday, August 17, 2026, and `PEORIA 08/19-08/28` the next day. On Monday, August 24, it resolves to `PEORIA 08/25-09/04`.

Dates use the browser's local calendar and are resolved only when the command expands. Invalid stored formulas remain visible and cannot be saved until corrected.

## Development and verification

The extension itself is plain HTML, CSS, and JavaScript. Node is used only for automated checks.

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run e2e
```

`npm run check` runs the shortcut-engine and storage-quota tests and validates every file referenced by the manifest. `npm run e2e` launches the unpacked extension in a temporary Chromium profile and verifies the empty first-run state, collapsible sections and General behavior, command CRUD, quota-safe sync persistence, global settings, search, import/export, preset prefixes, popup expansion, existing-tab injection, inputs, textareas, embedded frames, rich-text editors, and boundary handling. Set `EXPANDER_CHROMIUM_PATH` if Chromium is installed in a nonstandard location.

Regenerate the packaged PNG icons from the source SVG with:

```powershell
npm.cmd run icons
```

## Project map

```text
manifest.json             Extension permissions and entry points
background.js             Storage migration and existing-tab activation
content/content.js        Page-level input and rich-text replacement
shared/expansion-core.js  Pure matching and replacement logic
shared/template-engine.js Safe date-formula parsing and rendering
shared/storage.js         Chrome sync persistence and validation
popup.*                   Compact test surface and manager entry point
options.*                 Command manager and import/export UI
design/                   Visual references and verified renders
tests/                    Unit and unpacked-extension tests
```

## Known Chrome limits

Chrome does not permit extensions to type into internal pages such as `chrome://` URLs or the Chrome Web Store. Some canvas-based editors, including editors that do not expose ordinary DOM text controls, cannot be modified by a standard content script. Local `file://` pages require enabling **Allow access to file URLs** for the extension.
