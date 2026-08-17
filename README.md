# /Expander

/Expander is a Chrome extension that turns short commands into text you use often. Create a shortcut such as `/hello`, type it into a text field, and expand it into a complete message without copying and pasting.

Everything runs in your browser. Your commands are stored with Chrome Sync and are not sent to an external service.

## What you can do

- Create shortcuts with familiar prefixes such as `/`, `;`, or `!`.
- Expand commands with Space, Tab, Enter, or immediately with Auto-Expand.
- Use commands in standard inputs, textareas, embedded frames, and most rich-text editors across the web.
- Organize commands into collapsible categories and drag commands between them.
- Search, edit, duplicate, and delete saved commands from the command manager.
- Choose whether each command is case-sensitive.
- Add Dynamic Formulas that calculate changing values when a command is used.
- Import or export your command library from Settings.
- See your most-used commands and identify commands you may no longer need.
- Test commands from the extension popup or the command manager.

## Install from source

1. Download this repository and extract it, or clone it with Git.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extracted `/Expander` project folder.
6. Pin **/Expander** from Chrome's extensions menu for quick access.

If a page was already open when you installed the extension, refresh it once before testing a command.

## Create your first command

1. Select the **/Expander** icon in the Chrome toolbar.
2. Choose **New command**.
3. Enter a shortcut, such as `/hello`.
4. Add the text you want it to produce:

   ```text
   Hello! Thanks for reaching out.
   ```

5. Save the command.
6. Type `/hello` in a text field and use your selected expansion method.

Expansion methods can be changed at any time from **Settings**. Enabling **Auto-Expand** disables the Space, Tab, and Enter methods until Auto-Expand is turned off.

## Dynamic Formulas

Dynamic Formulas let a saved command calculate part of its expansion when you use it. This keeps changing information current without requiring you to edit the command each day.

The first available preset is **PO Date Range**. It inserts a range that begins with tomorrow's date and ends on Friday of the following week, using `MM/DD` format.

For example, a command used on Monday, August 17, 2026 can produce:

```text
PEORIA 08/18-08/28
```

The same command used the next day produces `PEORIA 08/19-08/28`. On Monday, August 24, the range becomes `PEORIA 08/25-09/04`.

To use it, select **Insert formula** beside the Expansion field and choose **PO Date Range**.

## Future plans

- Custom formula creation for user-defined rules and calculated text.
- Additional formula presets, including options beyond date-based formulas.

## Privacy and storage

/Expander has no backend, analytics service, or account system. Commands and settings are saved through `chrome.storage.sync` so Chrome can make them available in other signed-in Chrome profiles. Import and export give you an additional way to back up or move your command library.

## Chrome limitations

Chrome does not allow extensions to run on internal pages such as `chrome://` URLs or the Chrome Web Store. Canvas-based editors and other editors that do not expose standard text controls may not support expansion. To use /Expander on local `file://` pages, enable **Allow access to file URLs** in the extension details.

## Privacy

/Expander has no developer-owned backend, analytics, or advertising. Read the full [Privacy Policy](PRIVACY.md) for details about local processing and Chrome Sync storage.

## For contributors

The extension uses plain HTML, CSS, and JavaScript. Node.js is only required for automated verification.

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run e2e
```

`npm run check` runs the unit tests and validates the Manifest V3 files. `npm run e2e` loads the extension in a temporary Chromium profile and exercises the primary user flows. Set `EXPANDER_CHROMIUM_PATH` if Chromium is installed in a nonstandard location.

Regenerate the PNG icons from the source SVG with:

```powershell
npm.cmd run icons
```

Create a validated Chrome Web Store ZIP with only the extension's runtime files:

```powershell
npm.cmd run release
```

The release is written to `dist/slash-expander-v<version>.zip`, using the version from `manifest.json`.
