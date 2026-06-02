# A Plugins

Language: [简体中文](README.md) · English

When an Obsidian vault has many community plugins, startup can become slow, especially on mobile. A Plugins keeps the idea simple: load essential plugins at startup, delay less urgent plugins, and disable plugins you do not currently need.

It is not a complex diagnostics dashboard. It is a lightweight plugin startup management list.

## Features

| Feature | Description |
|:---|:---|
| Load at startup | Keep essential plugins available as Obsidian opens |
| Load later | Delay less urgent plugins to reduce startup pressure |
| Disable plugins | Turn off plugins you do not currently need |
| Self-measured timing | Show simple timing after A Plugins loads delayed plugins |
| Mobile ready | The settings page is designed for both desktop and mobile |

## Usage

1. Open A Plugins in Obsidian settings.
2. Search for a plugin or find it in the list.
3. Choose "Load at startup" or "Load later".
4. Use the switch to enable or disable the plugin.
5. Restart Obsidian and compare the startup feel.

Recommendation: keep only plugins that must be immediately available in "Load at startup"; move the rest to "Load later" first.

## Current Scope

A Plugins only manages community plugin startup timing and enable / disable state.

It does not optimize Obsidian core plugins, vault loading, workspace layout, or automatically read Obsidian's internal startup timing tree.

## Privacy And Network

- A Plugins does not collect your notes, plugin list, or personal data.
- A Plugins does not require an account or connect to external services.
- Plugin settings and self-measured timing stay in your own Obsidian vault.

## Installation

After it is listed in the official Community plugins directory, you can search for **A Plugins** in Obsidian's Community plugins.

You can also download `main.js`, `manifest.json`, and `styles.css` from GitHub Releases, then place them in:

```text
<vault>/.obsidian/plugins/a-plugins/
```

## Development

```bash
npm install
npm run typecheck
npm run test:logic
npm run build
```

## License

The source code of A Plugins is publicly available for review, but this project is not open source.

You may inspect the source code and use official release builds. Copying, redistributing, publishing modified versions, or commercial use requires written permission from the author.

See [LICENSE](LICENSE).
