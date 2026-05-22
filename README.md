# Startup Optimizer 启动优化器

语言：简体中文 · [English](README-en.md)

Obsidian 插件装多了，打开时越来越慢，手机端尤其明显。

本插件让你决定每个插件什么时候加载：重要的开机就启动，不急的等会再加载，暂时不用的直接关掉。被延后加载的插件还会显示耗时，方便你判断要不要调整。

不是复杂的系统诊断工具，只是把启动管理做得更简单。

## ⚙️ 三种加载方式

| 方式 | 说明 |
|:---|:---|
| 🚀 启动时加载 | 重要的插件，Obsidian 打开时直接启用 |
| ⏳ 稍后加载 | 不急用的插件，延后启动，减少开机卡顿 |
| 🚫 停用 | 暂时不需要，直接关闭 |

## ✨ 功能

| 功能 | 说明 |
|:---|:---|
| 📋 插件清单 | 一页看完所有社区插件，接近原生体验 |
| ⏱️ 耗时显示 | 被延后加载过的插件，显示自测耗时 |
| 🔛 快速启停 | 同一页面里启用或停用，不用到处翻设置 |
| 📱 即装即用 | 不需要导入启动报表，安装后直接管理 |

**列表布局：** 启用的排在上面，停用的排在下面，各自按名称排序。

## 🚀 安装

> ⚠️ Startup Optimizer 为闭源插件，不在官方 Community Plugins 商店中。

### BRAT（推荐）

1. 安装社区插件 **BRAT**
2. 打开 BRAT → **Add Beta plugin**
3. 输入 `https://github.com/jiaoyingxing/startup-optimizer`
4. 安装完成后，在 Obsidian 设置中启用 **Startup Optimizer**

> BRAT 可自动从 GitHub Releases 更新，无需手动替换文件。

### 手动安装

1. 从 [Release Assets](https://github.com/jiaoyingxing/startup-optimizer/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 在库中创建文件夹：`<vault>/.obsidian/plugins/startup-optimizer/`
3. 放入三个文件
4. 重启 Obsidian，在第三方插件设置中启用 **Startup Optimizer**

> ⚠️ 请使用 Release Assets 中的构建产物，不要使用 GitHub 自动生成的 Source code 压缩包。

## 📦 当前边界

**v0.2.0** 只管理社区插件的启动时机。

不优化以下内容：Obsidian 核心插件、库加载流程、工作区布局，也不自动读取内部启动计时树。

版本说明：[0.2.0](https://github.com/jiaoyingxing/startup-optimizer/releases/tag/0.2.0)

## 📜 许可

- 当前测试版不是开源项目
- 公开发布的构筑物仅按随附专有许可提供给个人 Obsidian 使用
- 详见 [LICENSE](LICENSE) 文件
