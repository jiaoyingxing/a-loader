# Startup Optimizer / 启动优化器

语言：[English](README.md) · 简体中文

Startup Optimizer 是一款轻量的 Obsidian 启动优化插件，主要帮助插件较多的库在启动时更顺，尤其适合移动端。

它做的事情很简单：用一个接近 Obsidian 原生插件列表的设置页，管理哪些插件启动时加载，哪些插件稍后加载，哪些插件直接停用。

## 主要能力

- 用接近 Obsidian 原生体验的清单管理已安装社区插件。
- 可以直接启用或停用社区插件。
- 启动时机只保留两个选择：启动时加载、稍后加载。
- 启用插件排在上方，停用插件排在下方，每组内按插件名称排序。
- 当插件由启动优化器稍后加载后，会显示简单的自测启动耗时。

## 安装方式

1. 从 Release Assets 下载 `main.js`、`manifest.json`、`styles.css`。
2. 在你的库中创建文件夹：`<vault>/.obsidian/plugins/startup-optimizer/`。
3. 把下载的三个文件放进这个文件夹。
4. 重启 Obsidian，并在第三方插件里启用 `Startup Optimizer`。

如果你直接从这个仓库安装，请使用仓库根目录里的构建产物，不要使用 GitHub 自动生成的 Source code 压缩包。

## 当前边界

Startup Optimizer 0.2.0 专注于低负担的社区插件启动控制。

它不会优化 Obsidian 核心插件、库加载、初始化流程或工作区布局。当前 0.2.x 版本也不再导入官方启动报表，主要依靠启动优化器实际稍后加载插件时记录的自测耗时，先把启动优化这件小事做简单、有效。

## 许可

Startup Optimizer 当前测试版不是开源项目。公开发布的构筑物仅按随附专有许可提供给个人 Obsidian 使用。
