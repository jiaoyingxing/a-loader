# A Plugins

语言：简体中文 · [English](README-en.md)

Obsidian 插件装多以后，启动变慢几乎是手机端用户都会遇到的问题。A Plugins 做的事情很简单：让你把不急着用的社区插件稍后加载，把暂时不用的插件直接停用，让插件多的库启动得更顺。

它不是复杂的系统诊断面板，而是一页轻量的插件启动管理清单。

## 功能

| 功能 | 说明 |
|:---|:---|
| 启动时加载 | 重要插件保持随 Obsidian 启动 |
| 稍后加载 | 不急用的插件延后加载，减少启动压力 |
| 停用插件 | 暂时不用的插件可以直接停用 |
| 自测耗时 | 被 A Plugins 加载过的插件会记录简单耗时，方便后续判断 |
| 移动端可用 | 设置页按桌面和移动端同时打磨 |

## 使用方式

1. 打开 Obsidian 设置里的 A Plugins。
2. 在插件列表中搜索或找到目标插件。
3. 选择“启动时加载”或“稍后加载”。
4. 用开关启用或停用插件。
5. 重启 Obsidian，观察新的启动体感。

推荐做法：只让真正需要立刻可用的插件保持“启动时加载”，其余插件优先设为“稍后加载”。

## 当前边界

A Plugins 只管理社区插件的启动时机与启停状态。

它不优化 Obsidian 核心插件、库加载流程、工作区布局，也不会自动读取 Obsidian 内部启动计时树。

## 隐私与网络

- A Plugins 不收集你的笔记内容、插件列表或个人数据。
- A Plugins 不需要账号，也不连接外部服务。
- 插件设置和自测耗时保存在你自己的 Obsidian 库中。

## 安装

上架官方社区插件目录后，可以在 Obsidian 的 Community plugins 中搜索 **A Plugins** 安装。

也可以从 GitHub Releases 下载 `main.js`、`manifest.json`、`styles.css`，放入：

```text
<vault>/.obsidian/plugins/startup-optimizer/
```

## 开发

```bash
npm install
npm run typecheck
npm run test:logic
npm run build
```

## 许可证

[MIT](LICENSE)
