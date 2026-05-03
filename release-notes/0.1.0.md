# Startup Optimizer 0.1.0

Released: 2026-05-02

This is the first public artifact release of Startup Optimizer.

Startup Optimizer 0.1.0 focuses on one practical goal: make community plugin startup easier to control, especially for plugin-heavy vaults on mobile.

## Installation

Download these release assets and place them in `<vault>/.obsidian/plugins/startup-optimizer/`:

- `main.js`
- `manifest.json`
- `styles.css`

Do not use GitHub's auto-generated `Source code` archives as the install package.

## Included

- Community plugin startup management.
- Simple startup stages: immediate, after layout, short idle, long idle, and manual.
- Drag sorting inside each stage.
- Optional Obsidian startup breakdown report import for better hints.
- Basic self-measured timing display after managed plugins are loaded by Startup Optimizer.
- Chinese-first plugin settings UI, with English host identity for Obsidian's community plugin list.

## Current Limits

- It does not optimize Obsidian core plugins, vault loading, initialization, or workspace layout.
- It does not automatically read Obsidian's internal startup timing tree.
- It is not an official community plugin store release yet.
- Source code is not public in this beta release.
