# Startup Optimizer

Language: English · [简体中文](README-zh.md)

Too many community plugins can make Obsidian feel stuck at launch, especially on mobile.

Startup Optimizer keeps the idea simple: use one installed-plugin list to decide what loads at startup, what can wait, and what you do not need to keep enabled.

It is not trying to become a full system dashboard. The current goal is to make community plugin startup easier to manage with lower mental load.

## Why Startup Optimizer

Obsidian plugins are useful, but starting everything at once can make a vault feel heavy.

Startup Optimizer gives you a smaller decision:

- Keep important plugins loading at startup
- Move less urgent plugins to load later
- Disable plugins you do not need right now
- See simple self-measured timing after a delayed plugin has been loaded by Startup Optimizer

## What You Can Do

- Manage installed community plugins in a simple, Obsidian-like settings list
- Choose only between `Load at startup` and `Load later`
- Enable or disable community plugins from the same page
- Keep enabled plugins above disabled plugins, with each group sorted by plugin name
- Use it without importing Obsidian's startup report

## Install

1. Download these files from the release assets: `main.js`, `manifest.json`, and `styles.css`.
2. Create this folder in your vault: `<vault>/.obsidian/plugins/startup-optimizer/`.
3. Put the downloaded files into that folder.
4. Restart Obsidian and enable `Startup Optimizer` in Community plugins.

If you install from this repository directly, use the built files in the repository root. Do not use GitHub's auto-generated source archive as the install package.

## Current Scope

Startup Optimizer 0.2.0 focuses on low-friction community plugin startup control.

It does not optimize Obsidian core plugins, vault loading, initialization, or workspace layout. It also does not automatically read Obsidian's internal startup timing tree.

Release notes: [0.2.0](release-notes/0.2.0.md)

## License

Startup Optimizer is not open source in this beta release. The published artifacts are provided for personal Obsidian use under the included proprietary license.
