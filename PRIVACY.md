# Privacy Policy for /Expander

Effective date: August 17, 2026

/Expander is a Chrome extension created by presbot that replaces user-created shortcuts with saved text in editable fields. This policy explains what information the extension handles, how it is used, where it is stored, and with whom it is shared.

## Summary

- /Expander does not operate a developer-owned backend.
- The developer does not receive or have access to users' saved commands, typed website content, or usage statistics.
- /Expander does not sell personal information, display advertising, perform analytics, or use data for profiling, lending, or credit decisions.
- Data is handled only to provide the extension's text-expansion and command-management features.

## Information handled by the extension

### Saved commands and settings

/Expander stores the commands, expansion text, categories, case-sensitivity choices, and expansion-method settings that users intentionally create. Because expansion text is user-defined, it may contain personally identifiable information or personal communications, such as a name, email address, mailing address, signature, reusable email, or chat response.

This information is used only to manage the user's command library and produce the expansion the user requests.

### Text in editable website fields

To recognize a saved shortcut, /Expander processes keyboard and input events in supported editable controls and examines the text around the active cursor. It then replaces a matching shortcut with the user's saved expansion.

Raw keystrokes and website field contents are not logged, retained as a browsing record, or transmitted to the developer or a developer-operated service. Processing occurs in the browser for the user-facing text-expansion feature.

### Command usage information

/Expander stores an aggregate use count and timestamps for each command. This information powers the **Most used commands** and **Still use these?** sections in the command manager. It does not contain a browsing history, page URL, or copy of the surrounding website content.

### Interface preferences

The extension stores interface preferences, such as collapsed categories, so the command manager can preserve the user's chosen layout.

## Storage and synchronization

Commands, expansion text, categories, and expansion-method settings are stored with `chrome.storage.sync`. When Chrome Sync is enabled, Chrome may synchronize this information between the user's signed-in Chrome profiles according to the user's Chrome Sync settings and Google's privacy practices. The /Expander developer does not receive or control this synchronized data.

Command usage information and interface preferences are stored with `chrome.storage.local` in the user's Chrome profile and are not synchronized by /Expander.

Users may also choose to export their command library to a file or import a library from a file. These actions occur only when initiated by the user.

## Permissions

/Expander uses the following Chrome permissions:

- **Storage:** Saves the user's commands, categories, settings, command usage information, and interface preferences.
- **Scripting:** Activates the extension's packaged scripts in eligible tabs that were already open when the extension was installed, started, or manually activated.
- **Host access:** Allows shortcut expansion in editable fields on websites the user visits. /Expander does not run on Chrome-protected pages such as `chrome://` pages or the Chrome Web Store.

## Data sharing and disclosure

/Expander does not send user data to the developer, advertisers, analytics providers, data brokers, or other developer-operated third parties. Chrome Sync may process synchronized extension data as a service provided by Google and controlled through the user's Chrome settings. Google's handling of Chrome Sync data is governed by the [Google Privacy Policy](https://policies.google.com/privacy).

/Expander does not allow the developer or other humans to read users' saved commands, website field contents, or local usage information.

## Data retention and user control

Users can edit or delete saved commands from the command manager and can export a backup of their command library. Users can also clear extension data, disable Chrome Sync, or uninstall /Expander through Chrome. Locally stored data is controlled by the user's Chrome profile; synchronized data remains subject to the user's Chrome Sync settings and Google's retention practices.

## Remote code and external services

/Expander does not fetch or execute remote code. All executable JavaScript is included in the extension package submitted to the Chrome Web Store. The extension does not use an external API, analytics service, advertising service, or developer-owned data server.

The user-initiated link to `presbot.dev` is a standard external link and does not transmit extension data or load code into the extension.

## Limited Use disclosure

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes to this policy

This policy may be updated when /Expander's features or data practices change. Updates will be published at this URL with a revised effective date. The Chrome Web Store disclosures and extension interface will also be updated when required.

## Contact

For privacy questions about /Expander, contact [hello@presbot.dev](mailto:hello@presbot.dev) or visit [presbot.dev](https://presbot.dev).
