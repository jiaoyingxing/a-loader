# Startup Optimizer

Language: [简体中文](README.md) · English

When you install more Obsidian plugins, startup can get slower, especially on mobile.

Startup Optimizer lets you decide when each plugin should load: important plugins can load when Obsidian starts, less urgent plugins can wait, and plugins you do not need right now can stay disabled. Delayed plugins can also show measured loading time, so you can decide whether to adjust them later.

It is not a complex system diagnostics tool. It only tries to make startup management simpler.

## ⚙️ Three Loading Modes

| Mode | Description |
|:---|:---|
| 🚀 Load at startup | Important plugins load as Obsidian opens |
| ⏳ Load later | Less urgent plugins start later to reduce startup pressure |
| 🚫 Disabled | Plugins you do not currently need stay turned off |

## ✨ Features

| Feature | Description |
|:---|:---|
| 📋 Plugin list | View community plugins on one simple, Obsidian-like page |
| ⏱️ Timing display | Show self-measured timing for plugins loaded later |
| 🔛 Quick enable / disable | Enable or disable plugins from the same page |
| 📱 Ready to use | No startup report import required |

**List layout:** enabled plugins stay above disabled plugins, and each group is sorted by name.

## 🚀 Installation

> ⚠️ Startup Optimizer is a closed-source plugin and is not listed in the official Community Plugins store.

### BRAT (Recommended)

1. Install the community plugin **BRAT**
2. Open BRAT → **Add Beta plugin**
3. Enter `https://github.com/jiaoyingxing/startup-optimizer`
4. After installation, enable **Startup Optimizer** in Obsidian settings

> BRAT can update from GitHub Releases automatically, so you do not need to replace files manually.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from [Release Assets](https://github.com/jiaoyingxing/startup-optimizer/releases)
2. Create this folder in your vault: `<vault>/.obsidian/plugins/startup-optimizer/`
3. Put the three files into that folder
4. Restart Obsidian and enable **Startup Optimizer** in Community plugins

> ⚠️ Use the built files from Release Assets. Do not use GitHub's auto-generated Source code archives.

## 📦 Current Scope

**v0.2.0** only manages community plugin startup timing.

It does not optimize Obsidian core plugins, vault loading, workspace layout, or automatically read Obsidian's internal startup timing tree.

Release notes: [0.2.0](https://github.com/jiaoyingxing/startup-optimizer/releases/tag/0.2.0)

## 📜 License

- This beta release is not open source
- Published artifacts are provided for personal Obsidian use under the included proprietary license
- See [LICENSE](LICENSE)
