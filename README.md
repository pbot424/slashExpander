# /Expander

/Expander is a Chrome extension that turns short commands into text you use often. Create a shortcut such as `/hello`, type it into a text field, and expand it into a complete message without copying and pasting.

Everything runs in your browser. Choose Chrome Sync or device-only storage; your commands are never sent to a developer-operated service.

## What you can do

- Create shortcuts with familiar prefixes such as `/`, `;`, or `!`.
- Expand commands with Space, Tab, Enter, or immediately with Auto-Expand.
- Press `Ctrl+Shift+Space` in an editable field to search and insert from your command library.
- Use commands in standard inputs, textareas, embedded frames, and most rich-text editors across the web.
- Add single-line or multiline text, choice menus, date pickers, optional text, required validation, and a final cursor position to reusable templates.
- Organize commands into collapsible categories and drag commands between them.
- Select multiple commands to move, drag, or delete them together, with Undo for batch changes.
- Search, edit, duplicate, and delete saved commands from the command manager.
- Choose whether each command is case-sensitive.
- Add Dynamic Formulas that calculate changing values when a command is used.
- Import or export commands, categories, settings, and usage history from Settings.
- Pause expansion on specific websites without disabling the extension everywhere.
- See whether /Expander is ready, paused, blocked, or needs reactivation on the current page.
- Select text on a page and use the context menu to start a new command with that text.
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

## Fill-in templates

Fill-in templates ask for changing information before inserting a command. Use **Insert fill-in** beside the Expansion field to add single-line or multiline text, a choice menu, a date picker, optional checkbox-controlled text, required validation, or a final cursor position.

```text
Hello {{field:Name|there}},

Your request is {{choice:Status|Ready|Pending}}.{{cursor}}
```

When the command expands, /Expander prompts for **Name** and **Status**, inserts those values, and places the cursor at `{{cursor}}`. Repeated fields with the same label share one answer.

Date fields use the browser's date picker and insert as `MM/DD/YYYY`. Optional text appears behind a checkbox, and required fields prevent insertion until the user supplies a value.

## Command picker

Focus a supported editable field and press `Ctrl+Shift+Space`. Search by shortcut, saved text, or category, then use the arrow keys and Enter to insert a command. Recent and frequently used commands appear first when the search is empty.

## Future plans

- Custom formula creation for user-defined rules and calculated text.
- Additional formula presets, including options beyond date-based formulas.

## Privacy and storage

/Expander has no developer-owned backend, analytics, advertising, or account system. By default, commands and settings are saved through `chrome.storage.sync` so Chrome can make them available in other signed-in Chrome profiles. Users can instead choose **This device only** from Settings. Import/export provides an additional backup and migration option for commands, categories, settings, and command usage history; the destination browser keeps its current storage-mode choice.

Command expansions can contain user-provided text, so avoid storing passwords, payment details, or other secrets. Read the full [Privacy Policy](PRIVACY.md) for details about local processing, Chrome Sync, and user controls.

## Chrome limitations

Chrome does not allow extensions to run on internal pages such as `chrome://` URLs or the Chrome Web Store. Canvas-based editors and other editors that do not expose standard text controls may not support expansion. To use /Expander on local `file://` pages, enable **Allow access to file URLs** in the extension details.

## For contributors

The extension uses plain HTML, CSS, and JavaScript. Node.js is only required for automated verification.

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run e2e
npm.cmd run verify
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

Update all project version files together with:

```powershell
npm.cmd run version:set -- 0.4.6
```

To publish that ZIP as a GitHub Release, push a version tag that matches `manifest.json`:

```powershell
git tag v0.4.6
git push origin v0.4.6
```

The GitHub Actions release workflow runs the project checks, builds the validated ZIP, generates release notes, and attaches the ZIP to a release named `/Expander v<version>`.
