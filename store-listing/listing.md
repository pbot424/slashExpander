# /Expander — Chrome Web Store listing

## Category

Productivity

## Privacy policy

https://github.com/pbot424/slashExpander/blob/main/PRIVACY.md

## Description

/Expander turns short commands into text you use often, right where you type in Chrome. Save a command such as `/followup`, then expand it into a complete reply using Space, Tab, Enter, or Auto-Expand.

Build a shortcut library that fits the way you work:

- Create commands with familiar prefixes such as `/`, `;`, and `!`.
- Organize commands into collapsible categories and drag them between categories.
- Search, edit, duplicate, and test commands from one focused manager.
- Control case sensitivity for each command.
- Use Dynamic Formulas, including the PO Date Range preset, for text that updates when expanded.
- Review your most-used commands and find older commands you may no longer need.
- Import and export your command library whenever you need a backup.
- Pause expansion on individual websites whenever you need to.
- Choose Chrome Sync or keep your command library only on the current device.

Your commands and settings stay in your selected Chrome storage area. /Expander has no external backend, analytics, or advertising.

## Assets

- `store-icon-128.png` — 128×128 store icon with a 96×96 artwork area.
- `screenshot-command-manager-1280x800.png` — full-bleed product screenshot.
- `small-promo-440x280.png` — required small promotional tile.

## Single purpose

/Expander replaces user-created shortcuts with saved text in editable fields across websites.

## Permission justifications

### Storage

The storage permission is required to save the user's commands, categories, expansion settings, paused-site domains, storage choice, and interface preferences. By default, the command library uses Chrome Sync so it can remain available across the user's signed-in Chrome profiles. Users can instead choose device-only storage. Aggregate per-command usage counts and timestamps are stored locally to provide the Most used commands and Still use these? dashboard sections. This information is not sent to the developer or an external service.

### Scripting

The scripting permission is used to inject /Expander's packaged content scripts into eligible tabs that were already open when the extension was installed, started, or manually activated. This lets text expansion become available without requiring the user to refresh every open page. Only JavaScript files bundled inside the extension package are injected.

### Host permission

Access to all website URLs is required because /Expander's core purpose is to expand user-created shortcuts anywhere the user types, and the extension cannot predict which websites the user will use. On eligible pages, it responds only to typing in editable controls to match locally saved shortcuts and replace them with the user's saved expansion text. It does not collect browsing history, transmit page content, or run on Chrome-protected pages such as `chrome://` URLs or the Chrome Web Store.

### Remote code

Select **No**. /Expander does not use remote code. All executable JavaScript is included in the extension package and reviewed as part of the submitted ZIP. The extension does not fetch or execute external scripts, use `eval`, `new Function`, remote dynamic imports, or WebAssembly. The user-initiated link to `presbot.dev` is a standard external link and does not load code into the extension.

## Data usage selections

Select these categories in the Chrome Web Store dashboard:

- **Personally identifiable information** — Users can intentionally save names, email addresses, mailing addresses, signatures, or similar information inside their command expansions.
- **Personal communications** — Users can save reusable replies, email text, chat text, and other message content as command expansions.
- **User activity** — The extension processes keyboard and input events in editable controls to recognize a saved shortcut. Raw keystrokes are not logged, retained, or transmitted.
- **Website content** — The extension reads and replaces text in the editable control where the user is typing. That field content is processed only in the page and is not retained or transmitted by the extension.

Leave these categories unselected because /Expander does not intentionally access or use them:

- Health information
- Financial and payment information
- Authentication information
- Location
- Web history

Commands, categories, expansion settings, and paused-site domains use `chrome.storage.sync` by default. Chrome may sync that data according to the user's Chrome Sync settings, but the developer does not receive or have access to it. Users can select device-only storage, which keeps the active command library and settings in `chrome.storage.local` instead. Usage counts, last-used timestamps, the selected storage mode, and interface preferences remain in `chrome.storage.local`. /Expander does not operate an external server, sell data, use data for advertising, or share data with third parties.
