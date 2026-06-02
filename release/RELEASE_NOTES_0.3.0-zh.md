# Startup Optimizer 启动优化器 0.3.0

发布时间：2026-06-01

这版主要修复一个会影响插件管理判断的问题：如果你在 Obsidian 系统的第三方插件管理界面停用了某个插件，回到 Startup Optimizer 设置页后，它现在会同步显示为停用。

## 这版改变了什么

- 修复系统插件管理界面停用插件后，Startup Optimizer 仍显示为启用的问题。
- 更准确地区分两种状态：
  - 系统里真实启用的插件
  - 被 Startup Optimizer 临时延后加载、但仍属于启动方案的插件
- 启动设置页打开时会同步系统启停状态，避免旧的启动基线把用户手动停用的插件误判为启用。
- 补充逻辑检查，覆盖“旧基线里还有插件，但系统已经停用”的场景。

## 安装

推荐使用 BRAT 安装或更新：

```text
https://github.com/jiaoyingxing/startup-optimizer
```

也可以从本版本 Release Assets 手动下载 `main.js`、`manifest.json`、`styles.css`，放入：

```text
<vault>/.obsidian/plugins/startup-optimizer/
```

请不要使用 GitHub 自动生成的 Source code 压缩包作为安装包。

## 当前边界

Startup Optimizer 0.3.0 仍专注于社区插件的启动时机与启停管理。

它不会优化 Obsidian 核心插件、库加载流程或工作区布局，也不会自动读取 Obsidian 内部启动计时树。
