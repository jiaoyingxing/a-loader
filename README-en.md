# A Loader

Language: [简体中文](README.md) · English

When you install many Obsidian plugins, startup can become noticeably slower, especially on mobile. A Loader keeps the idea direct: load the plugins you need immediately at startup, load less urgent plugins later, and disable plugins you do not currently use.

A Loader sits at the top of your plugin list, so it is easy to find in settings. The interface stays close to Obsidian's native Community plugins page: search, grouping, enable / disable, and startup choice are all handled in one list.

It is not a complex startup analysis system, and it does not ask users to learn many loading phases. A Loader works more like a simple companion to the native plugin management page: it turns plugin startup into a lighter, easier list.

## Experience

- **Search directly**: Type a plugin name and find it quickly.
- **Automatic grouping**: Startup, delayed, and disabled plugins are grouped clearly.
- **Enable or disable in place**: Manage plugin state without jumping back to another settings page.
- **Fewer startup choices**: Only "Load at startup" and "Load later" are exposed as the main decisions.
- **Self-measured timing**: Plugins actually loaded by A Loader can show measured startup time.
- **Mobile ready**: The settings page is designed for both desktop and mobile.

## Difference From Lazy Loader

| Item | A Loader | Lazy Loader |
|:---|:---|:---|
| Management model | Feels like a companion to Obsidian's native plugin page | Feels more like a separate lazy-loading panel |
| Main operation | Search, grouping, toggle, and startup choice in one list | Requires configuring different delay phases one by one |
| Plugin state | Tries to stay in sync with Obsidian's real enabled / disabled state | Relies more on its own management model |
| Choice complexity | Exposes only startup / later / disabled | Offers more detailed choices for users who want fine tuning |
| Interface language | Chinese-first interface | English interface |
| Mobile focus | Settings are refined for mobile as well as desktop | Mobile is not its main public emphasis |

## Who It Is For

- You use many plugins, and Obsidian feels slow to open, especially on mobile.
- You do not want to uninstall plugins, but you also do not want every plugin loading at startup.
- You prefer plugin management that feels close to native Obsidian settings.
- You want a Chinese-first interface that works on both desktop and mobile.

## Current Scope

A Loader manages community plugin startup timing and enable / disable state.

It does not optimize core plugins, vault loading, workspace layout, or silently read Obsidian's internal startup timing tree. Timing shown in plugin rows comes from A Loader's own measurements after it actually loads a managed plugin.

## Privacy And Network

- A Loader does not collect your notes, plugin list, or personal data.
- A Loader does not require an account or connect to external services.
- Settings and self-measured timing stay in your own vault.

## Installation

After it is listed in the official directory, you can search for **A Loader** in Community plugins.

You can also download `main.js`, `manifest.json`, and `styles.css` from GitHub Releases, then place them in:

```text
<vault>/.obsidian/plugins/a-plugins/
```

## License

The source code of A Loader is publicly available for review, but this project is not open source.

You may inspect the source code and use official release builds. Copying, redistributing, publishing modified versions, or commercial use requires written permission from the author.

See [LICENSE](LICENSE).
