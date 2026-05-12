# Startup Optimizer

Language: English · [简体中文](README-zh.md)

Startup Optimizer is a lightweight Obsidian plugin that helps plugin-heavy vaults start more smoothly, especially on mobile.

It gives you one simple list for installed community plugins: keep important plugins loading at startup, move the rest to load later, or disable plugins you do not need.

## Highlights

- Manage installed community plugins in a simple, Obsidian-like settings list.
- Enable or disable community plugins from the same page.
- Choose only between two startup choices: load at startup or load later.
- Keep enabled plugins above disabled plugins, then sort each group by plugin name.
- Show simple self-measured loading time after Startup Optimizer has loaded a delayed plugin.

## Install

1. Download these files from the release assets: `main.js`, `manifest.json`, and `styles.css`.
2. Create this folder in your vault: `<vault>/.obsidian/plugins/startup-optimizer/`.
3. Put the downloaded files into that folder.
4. Restart Obsidian and enable `Startup Optimizer` in Community plugins.

If you install from this repository directly, make sure you are using the built files in the repository root, not GitHub's auto-generated source archive.

## Current Scope

Startup Optimizer 0.2.0 focuses on low-friction community plugin startup control.

It does not optimize Obsidian core plugins, vault loading, initialization, or workspace layout. It also does not import Obsidian startup reports in the current 0.2.x line. The current direction is to stay simple and use self-measured loading time from plugins that Startup Optimizer actually loads later.

## License

Startup Optimizer is not open source in this beta release. The published artifacts are provided for personal Obsidian use under the included proprietary license.
