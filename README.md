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
    <img alt="License" src="https://img.shields.io/badge/License-%E6%BA%90%E7%A0%81%E5%85%AC%E5%BC%80-lightgrey?style=flat-square" />
  </a>
  <a href="./README.md">
    <img alt="CN 中文版" src="https://img.shields.io/badge/CN-%E4%B8%AD%E6%96%87%E7%89%88-d32f2f?style=flat-square" />
  </a>
  <a href="./README-en.md">
    <img alt="EN English" src="https://img.shields.io/badge/EN-English-2f6fed?style=flat-square" />
  </a>
</p>

把不急着用的插件稍后加载，提升 Obsidian 启动速度。

## 1. 使用体验

- **搜索直达**：输入插件名称就能快速定位，不用在长列表里逐行翻。
- **自动分组**：启动时加载、稍后加载、已停用插件自动排好，状态一眼能看懂。
- **直接开关**：不用跳回原生插件页，在同一页里就能启用或停用插件。
- **启动选择更少**：只保留“启动时加载”和“稍后加载”两个核心选择，减少判断成本。
- **自测计时**：A Loader 实际加载过的插件会记录启动耗时，后续可以作为调整依据。
- **移动端适配**：设置页同时照顾桌面和手机，小屏幕上也能顺手操作。

## 2. 和 Lazy Loader 的区别

| 对比项 | A Loader | Lazy Loader |
|:---|:---|:---|
| 管理方式 | 更像 Obsidian 原生插件页的补充 | 更像一套独立的延迟加载面板 |
| 操作重点 | 搜索、分组、开关、启动选择都在同一页 | 需要逐个理解和配置不同延迟阶段 |
| 启停状态 | 尽量同步 Obsidian 当前真实启停状态 | 更依赖插件自己的管理规则 |
| 选择复杂度 | 只暴露“启动时加载 / 稍后加载 / 已停用” | 选项更多，适合愿意细调的用户 |
| 界面语言 | 中文优先 | 英文界面 |
| 移动端 | 设置页按手机端一起打磨 | 未把移动端作为主要表达重点 |

## 3. 适合谁

- 插件很多，尤其手机端打开 Obsidian 时明显变慢。
- 不想卸载插件，但也不希望所有插件都挤在启动阶段加载。
- 希望插件管理像原生设置页一样简单，不想学习复杂规则。
- 需要中文界面，也希望桌面和手机端都好操作。

## 4. 当前边界

A Loader 只管理社区插件的启动时机与启停状态。

它不优化核心插件、库加载流程、工作区布局，也不会静默读取 Obsidian 内部的官方启动计时树。插件行里的耗时来自 A Loader 实际接管并加载插件后的自测记录。

## 5. 隐私与网络

| 数据 | 保存在哪 |
|:---|:---|
| 插件设置与自测耗时 | 你的 Obsidian 库（本地插件数据） |

- A Loader 不收集你的笔记内容、插件列表或个人数据。
- A Loader 不需要账号，也不连接任何外部服务。
- 无客户端遥测。

## 6. 安装

A Loader 需要 Obsidian `1.11.0` 或更高版本。

### 6.1 社区插件（推荐）

1. 打开 Obsidian 设置，进入“第三方插件”。
2. 搜索 `A Loader`。
3. 安装并启用插件。

### 6.2 BRAT

1. 安装社区插件 **BRAT**。
2. 打开 BRAT → **Add Beta plugin**。
3. 输入 `https://github.com/jiaoyingxing/a-loader`。
4. 安装完成后，在 Obsidian 设置中启用 **A Loader**。

### 6.3 手动安装

1. 从 [GitHub Releases](https://github.com/jiaoyingxing/a-loader/releases) 下载 `main.js`、`manifest.json`、`styles.css`。
2. 放入 vault 的 `.obsidian/plugins/a-plugins/` 目录。
3. 重启 Obsidian，或重新加载插件。
4. 启用 **A Loader**。

## 7. 公开代码与发布

本仓库保留部分可公开审阅的代码和发布物料，但不包含完整源码树，也不保证可以从本仓库独立构建。可安装版本以 GitHub Releases 中的 `main.js`、`manifest.json` 和 `styles.css` 为准。

## 8. 许可证

A Loader 在本仓库公开的代码和构筑物可供审阅，但项目不是开源授权项目。

你可以查看公开内容、审阅实现，也可以使用官方发布版本；未经作者书面许可，不得复制、再发布、改作分发或商用。

详见 [LICENSE](LICENSE)。

## 9. 联系

- Bug、可复现问题和功能建议：[GitHub Issues](https://github.com/jiaoyingxing/a-loader/issues)
- 使用交流与产品动态：小红书搜索 **焦应行** 🔍
