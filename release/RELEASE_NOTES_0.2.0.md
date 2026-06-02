# Startup Optimizer 0.2.0

Language: English · [简体中文](0.2.0-zh.md)

Released: 2026-05-13

Startup Optimizer 0.2.0 deliberately makes the plugin simpler and closer to the real pain of Obsidian on mobile.

When you install more plugins, Obsidian on mobile can become slow to open; many plugins are not optimized around mobile startup speed. Instead of asking users to understand stages, reports, and sorting rules, this version focuses on one practical question: should this community plugin load at startup, load later, or stay disabled for now?

## What Changed

- The settings page is now a simple installed-plugin list.
- Startup timing is reduced to two choices: load at startup or load later.
- Community plugins can be enabled or disabled from the same list.
- Enabled plugins stay above disabled plugins, and each group is sorted by plugin name.
- Delayed plugins can show self-measured loading time after Startup Optimizer has loaded them.

## What Was Removed From The Main Flow

- The official startup report import flow is no longer part of the main product surface.
- Drag sorting and detailed startup stage controls were removed.
- Extra diagnostic sections were removed so the settings page is easier to scan.

## Current Scope

Startup Optimizer still focuses only on community plugin startup control.

It does not optimize Obsidian core plugins, vault loading, initialization, or workspace layout. It also does not automatically read Obsidian's internal startup timing tree.

Source code is not public in this beta release.
