# Startup Optimizer / 启动优化器

语言：[English](README.md) · 简体中文

Startup Optimizer 是一款轻量的 Obsidian 启动优化插件，主要帮助插件较多的库在启动时更顺，尤其适合移动端。

它做的事情很简单：把社区插件启动排好队，让一部分插件晚一点启动，避免所有插件在启动瞬间一起抢资源。

## 主要能力

- 管理社区插件启动，不改你的笔记，也不自动改工作区布局。
- 支持简单的启动阶段：立即启动、布局完成后、短空闲、长空闲、手动加载。
- 支持在每个阶段内拖拽排序，方便快速调整启动方案。
- 不想交给启动优化器管理的插件，可以继续走 Obsidian 原本的启动路径。
- 可以导入 Obsidian 内置启动耗时报表，让建议更准，但不导入也能使用。
- 当插件由启动优化器实际加载后，会显示简单的本插件实测耗时。

## 安装方式

1. 从 Release Assets 下载 `main.js`、`manifest.json`、`styles.css`。
2. 在你的库中创建文件夹：`<vault>/.obsidian/plugins/startup-optimizer/`。
3. 把下载的三个文件放进这个文件夹。
4. 重启 Obsidian，并在第三方插件里启用 `Startup Optimizer`。

如果你直接从这个仓库安装，请使用仓库根目录里的构建产物，不要使用 GitHub 自动生成的 Source code 压缩包。

## 当前边界

Startup Optimizer 0.1.0 专注于社区插件启动控制。

它不会优化 Obsidian 核心插件、库加载、初始化流程或工作区布局。官方启动耗时报表是可选增强入口：导入后建议会更准，但不是使用前提。

## 许可

Startup Optimizer 当前测试版不是开源项目。公开发布的构筑物仅按随附专有许可提供给个人 Obsidian 使用。
