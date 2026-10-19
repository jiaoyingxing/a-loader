# A Loader

<p align="center">
  <a href="https://github.com/jiaoyingxing/a-loader/releases">
    <img alt="Release downloads" src="https://img.shields.io/github/downloads/jiaoyingxing/a-loader/total.svg?style=flat-square&label=Release%20downloads" />
  </a>
  <a href="https://github.com/jiaoyingxing/a-loader/releases">
    <img alt="Latest release" src="https://img.shields.io/github/v/release/jiaoyingxing/a-loader?style=flat-square&label=Latest%20release" />
  </a>
  <a href="https://community.obsidian.md/plugins/a-plugins">
    <img alt="Obsidian Plugin" src="https://img.shields.io/badge/Obsidian-Plugin-7c3aed?style=flat-square" />
  </a>
  <a href="./LICENSE">
    <img alt="License" src="https://img.shields.io/badge/License-Source--available-lightgrey?style=flat-square" />
  </a>
  <a href="./README.md">
    <img alt="CN 中文版" src="https://img.shields.io/badge/CN-%E4%B8%AD%E6%96%87%E7%89%88-d32f2f?style=flat-square" />
  </a>
  <a href="./README-en.md">
    <img alt="EN English" src="https://img.shields.io/badge/EN-English-2f6fed?style=flat-square" />
  </a>
</p>

When you install many Obsidian plugins, startup can become noticeably slower, especially on mobile. A Loader keeps the idea direct: load the plugins you need immediately at startup, load less urgent plugins later, and disable plugins you do not currently use.

A Loader sits at the top of your plugin list, so it is easy to find in settings. The interface stays close to Obsidian's native Community plugins page: search, grouping, enable / disable, and startup choice are all handled in one list.

It is not a complex startup analysis system, and it does not ask users to learn many loading phases. A Loader works more like a simple companion to the native plugin management page: it turns plugin startup into a lighter, easier list.

## 1. The Experience

- **Search directly**: Type a plugin name and find it quickly.
- **Automatic grouping**: Startup, delayed, and disabled plugins are grouped clearly.
- **Enable or disable in place**: Manage plugin state without jumping back to another settings page.
- **Fewer startup choices**: Only "Load at startup" and "Load later" are exposed as the main decisions.
- **Self-measured timing**: Plugins actually loaded by A Loader can show measured startup time.
- **Mobile ready**: The settings page is designed for both desktop and mobile.

## 2. How It Differs From Lazy Loader

| Item | A Loader | Lazy Loader |
|:---|:---|:---|
| Management model | Feels like a companion to Obsidian's native plugin page | Feels more like a separate lazy-loading panel |
| Main operation | Search, grouping, toggle, and startup choice in one list | Requires configuring different delay phases one by one |
| Plugin state | Tries to stay in sync with Obsidian's real enabled / disabled state | Relies more on its own management model |
| Choice complexity | Exposes only startup / later / disabled | Offers more detailed choices for users who want fine tuning |
| Interface language | Chinese-first interface | English interface |
| Mobile focus | Settings are refined for mobile as well as desktop | Mobile is not its main public emphasis |

## 3. Who It Is For

- You use many plugins, and Obsidian feels slow to open, especially on mobile.
- You do not want to uninstall plugins, but you also do not want every plugin loading at startup.
- You prefer plugin management that feels close to native Obsidian settings.
- You want a Chinese-first interface that works on both desktop and mobile.

## 4. Current Scope

A Loader manages community plugin startup timing and enable / disable state.

It does not optimize core plugins, vault loading, workspace layout, or silently read Obsidian's internal startup timing tree. Timing shown in plugin rows comes from A Loader's own measurements after it actually loads a managed plugin.

## 5. Privacy And Network

| Data | Stored in |
|:---|:---|
| Plugin settings and self-measured timings | Your own Obsidian vault (local plugin data) |

- A Loader does not collect your notes, plugin list, or personal data.
- A Loader does not require an account or connect to any external service.
- No client-side telemetry.

## 6. Installation

A Loader requires Obsidian `1.11.0` or later.

### 6.1 Community Plugins (recommended)

1. Open Obsidian settings and go to **Community plugins**.
2. Search for `A Loader`.
3. Install and enable the plugin.

### 6.2 BRAT

1. Install **BRAT** from the community plugins.
2. Open BRAT → **Add Beta plugin**.
3. Enter `https://github.com/jiaoyingxing/a-loader`.
4. Enable **A Loader** in Obsidian settings after installation.

### 6.3 Manual Install

1. Download `main.js`, `manifest.json`, and `styles.css` from [GitHub Releases](https://github.com/jiaoyingxing/a-loader/releases).
2. Put the three files into `.obsidian/plugins/a-plugins/` in your vault.
3. Restart Obsidian, or reload community plugins.
4. Enable **A Loader**.

## 7. Public Code And Releases

This repository contains selected code for public inspection and release materials, but it does not contain the complete source tree and is not guaranteed to build independently. Installable versions are the `main.js`, `manifest.json`, and `styles.css` assets attached to GitHub Releases.

## 8. License

The code and build artifacts published in this repository are available for inspection, but this project is not open source.

You may inspect the published materials and use official release builds. Copying, redistributing, publishing modified versions, or commercial use requires written permission from the author.

See [LICENSE](LICENSE).

## 9. Contact

- Bugs, reproducible issues, and feature requests: [GitHub Issues](https://github.com/jiaoyingxing/a-loader/issues)
- Community and product updates: search Xiaohongshu for **焦应行** 🔍
