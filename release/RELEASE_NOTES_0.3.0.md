# Startup Optimizer 0.3.0

Released: 2026-06-01

This release fixes an issue that affected plugin management consistency: when you disable a plugin from Obsidian's built-in Community plugins settings, Startup Optimizer now shows that plugin as disabled too.

## What Changed

- Fixed a case where a plugin disabled in Obsidian's built-in plugin manager could still appear enabled in Startup Optimizer.
- More clearly separates two states:
  - plugins that are truly enabled in Obsidian
  - plugins temporarily delayed by Startup Optimizer but still part of the startup plan
- The startup settings page now syncs Obsidian's plugin enabled state before rendering, so an old startup baseline does not override a user-disabled plugin.
- Added a logic check for the case where an old baseline still contains a plugin that Obsidian has already disabled.

## Installation

BRAT is the recommended installation and update path:

```text
https://github.com/jiaoyingxing/startup-optimizer
```

You can also download `main.js`, `manifest.json`, and `styles.css` from this release's assets and place them in:

```text
<vault>/.obsidian/plugins/startup-optimizer/
```

Do not use GitHub's auto-generated Source code archives as the install package.

## Current Scope

Startup Optimizer 0.3.0 still focuses on community plugin startup timing and enable / disable management.

It does not optimize Obsidian core plugins, vault loading, or workspace layout. It also does not automatically read Obsidian's internal startup timing tree.
