# Startup Optimizer

Language: English · [简体中文](README-zh.md)

Startup Optimizer is a lightweight Obsidian plugin that helps plugin-heavy vaults start more smoothly, especially on mobile.

It lets you decide which community plugins start immediately, which ones wait a little longer, and which ones only load when you need them.

## Highlights

- Manage community plugin startup without changing your notes or workspace layout.
- Use simple startup stages: immediate, after layout, short idle, long idle, or manual.
- Drag plugins inside each stage to keep the startup plan easy to adjust.
- Leave a plugin on Obsidian's normal startup path when you do not want Startup Optimizer to manage it.
- Optionally import Obsidian's built-in startup breakdown report for better hints.
- Show simple self-measured loading time after Startup Optimizer has loaded a managed plugin.

## Install

1. Download these files from the release assets: `main.js`, `manifest.json`, and `styles.css`.
2. Create this folder in your vault: `<vault>/.obsidian/plugins/startup-optimizer/`.
3. Put the downloaded files into that folder.
4. Restart Obsidian and enable `Startup Optimizer` in Community plugins.

If you install from this repository directly, make sure you are using the built files in the repository root, not GitHub's auto-generated source archive.

## Current Scope

Startup Optimizer 0.1.0 focuses on community plugin startup control.

It does not optimize Obsidian core plugins, vault loading, initialization, or workspace layout. The built-in startup breakdown report is optional: importing it can improve hints, but the plugin can still be used without it.

## License

Startup Optimizer is not open source in this beta release. The published artifacts are provided for personal Obsidian use under the included proprietary license.
