# A Loader

Language: English · [简体中文](README-zh.md)

When a vault has many community extensions, startup can become slow, especially on mobile. A Loader keeps the idea simple: load essential extensions at startup, delay less urgent ones, and disable items you do not currently need.

It is not a complex diagnostics dashboard. It is a lightweight startup management list.

## Features

| Feature | Description |
|:---|:---|
| Load at startup | Keep essential extensions available as the app opens |
| Load later | Delay less urgent extensions to reduce startup pressure |
| Disable extensions | Turn off items you do not currently need |
| Self-measured timing | Show simple timing after A Loader loads delayed extensions |
| Mobile ready | The settings page is designed for both desktop and mobile |

## Usage

1. Open A Loader in settings.
2. Search for an extension or find it in the list.
3. Choose "Load at startup" or "Load later".
4. Use the switch to enable or disable it.
5. Restart and compare the startup feel.

Recommendation: keep only extensions that must be immediately available in "Load at startup"; move the rest to "Load later" first.

## Current Scope

A Loader only manages community extension startup timing and enable / disable state.

It does not optimize core extensions, vault loading, workspace layout, or automatically read the internal startup timing tree.

## Privacy And Network

- A Loader does not collect your notes, extension list, or personal data.
- A Loader does not require an account or connect to external services.
- Settings and self-measured timing stay in your own vault.

## Installation

After it is listed in the official directory, you can search for **A Loader** in Community plugins.

You can also download `main.js`, `manifest.json`, and `styles.css` from GitHub Releases, then place them in:

```text
<vault>/.obsidian/plugins/a-loader/
```

## Development

```bash
npm install
npm run typecheck
npm run test:logic
npm run build
```

## License

The source code of A Loader is publicly available for review, but this project is not open source.

You may inspect the source code and use official release builds. Copying, redistributing, publishing modified versions, or commercial use requires written permission from the author.

See [LICENSE](LICENSE).
