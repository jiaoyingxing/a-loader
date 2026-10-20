import {
  ButtonComponent,
  DropdownComponent,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
  SettingGroup,
  setIcon,
  type PluginManifest,
  type ToggleComponent
} from "obsidian";
import type ALoaderPlugin from "./main";
import {
  formatMs,
  getTimingSummary
} from "./plugin-registry";
import type {
  ManagedPluginEntry,
  PluginPhase
} from "./types";

type StartupMode = "early" | "delayed";

interface PluginListRow {
  entry: ManagedPluginEntry;
  manifest: PluginManifest;
  enabled: boolean;
}

interface SettingScrollState {
  element: HTMLElement;
  top: number;
  left: number;
}

interface RenderedPluginRow {
  row: PluginListRow;
  setting: Setting;
}

export class ALoaderSettingTab extends PluginSettingTab {
  private refreshQueued = false;
  private pendingScrollState: SettingScrollState | null = null;
  private searchQuery = "";
  /** 声明式轨道的行引用（搜索过滤用；整轮渲染完成时由空态行 render［定义树里
   *  最末一项］原子换入——宿主「只重取定义、不重跑 render」的索引调用不清掉它，
   *  页内过滤照常可用，不会因空 refs 误全隐藏）。 */
  private declarativeRows: RenderedPluginRow[] = [];
  /** 声明式轨道的空态行引用（其 render 最后执行，兼作初始过滤的触发点）。 */
  private declarativeEmptySetting: Setting | null = null;

  constructor(app: ALoaderPlugin["app"], private readonly plugin: ALoaderPlugin) {
    super(app, plugin);
    // 设置窗左栏页签图标：宿主默认隐藏第三方插件行的图标元素，由 styles.css
    // 按 data-setting-id 只放开本插件那一行（做法与姊妹插件 EasySync / Resojot 同源）。
    this.icon = "loader";
  }

  requestRefresh(): void {
    if (!this.containerEl.isConnected || this.refreshQueued) return;

    this.pendingScrollState = this.captureScrollState();
    this.refreshQueued = true;
    window.requestAnimationFrame(() => {
      const scrollState = this.pendingScrollState;
      this.pendingScrollState = null;
      this.refreshQueued = false;
      if (this.containerEl.isConnected) {
        // 轨道感知：声明式轨道严禁手动 display()（会把 <1.13 形态灌进声明式 DOM），
        // 一律经 rerenderTrack 分叉。
        this.rerenderTrack();
        this.restoreScrollState(scrollState);
      }
    });
  }

  isVisible(): boolean {
    return this.containerEl.isConnected;
  }

  private captureScrollState(): SettingScrollState | null {
    const scrollEl = this.getSettingsScrollContainer();
    if (!scrollEl) return null;

    return {
      element: scrollEl,
      top: scrollEl.scrollTop,
      left: scrollEl.scrollLeft
    };
  }

  private restoreScrollState(scrollState: SettingScrollState | null): void {
    if (!scrollState?.element.isConnected) return;

    const restore = (): void => {
      const maxTop = Math.max(0, scrollState.element.scrollHeight - scrollState.element.clientHeight);
      scrollState.element.scrollTop = Math.min(scrollState.top, maxTop);
      scrollState.element.scrollLeft = scrollState.left;
    };

    restore();
    window.requestAnimationFrame(restore);
  }

  private getSettingsScrollContainer(): HTMLElement | null {
    let fallback: HTMLElement | null = null;
    let current: HTMLElement | null = this.containerEl;

    while (current) {
      if (!fallback && this.isLikelyScrollContainer(current)) {
        fallback = current;
      }
      if (current.scrollTop > 0) {
        return current;
      }
      current = current.parentElement;
    }

    return fallback;
  }

  private isLikelyScrollContainer(element: HTMLElement): boolean {
    if (element.scrollHeight <= element.clientHeight + 1) return false;

    const style = window.getComputedStyle(element);
    return style.overflowY !== "visible" && style.overflowY !== "clip";
  }

  override display(): void {
    this.refreshQueued = false;
    this.containerEl.empty();
    this.containerEl.addClass("a-loader-settings");

    this.renderPluginManager();
  }

  /**
   * 声明式设置定义（Obsidian ≥1.13；d.ts：`getSettingDefinitions`／`update()`／
   * `settingItems` 均 @since 1.13.0）。两组与回落 display() 逐行同构：插件管理组
   * （无标题，cls 承接 a-loader-plugin-group 挂点）＋关于组。行内搜索沿用自建
   * 控件（组原生 search 为 @since 1.13.1，与 1.13.0 宿主/回落形态不一致，不启用）。
   */
  override getSettingDefinitions(): SettingDefinitionItem[] {
    this.containerEl.addClass("a-loader-settings");
    this.declarativeRows = [];
    this.declarativeEmptySetting = null;
    this.plugin.syncManagedPlugins();

    const rows = this.getPluginRows();
    const enabledCount = rows.filter(row => row.enabled).length;
    // 行引用「先局部收集、由空态行 render 收尾时整轮原子换入」：字段只在渲染完成点
    // 被替换，不随 getSettingDefinitions() 重取而清空——宿主纯索引类调用后,旧 DOM
    // 行仍在位且 refs 与之匹配，页内过滤器始终拿到与 DOM 一致的引用。
    const collectedRows: RenderedPluginRow[] = [];

    return [
      {
        type: "group",
        cls: "a-loader-plugin-group",
        items: [
          {
            // 工具行（搜索＋全部稍后）：仅控件无文案；不进设置搜索索引。
            name: "",
            searchable: false,
            render: (setting) =>
              this.configureToolbarRow(setting, enabledCount, () => this.declarativeRows, () => this.declarativeEmptySetting),
          },
          ...rows.map(row => ({
            name: row.manifest.name,
            desc: this.getPluginDescription(row.entry, row.manifest, row.enabled),
            aliases: [row.manifest.id, row.manifest.author].filter(Boolean),
            render: (setting: Setting) =>
              this.primeDeclarativePluginRow(setting, row, collectedRows),
          })),
          {
            // 空态行：定义文案为默认空态，挂 DOM 即被过滤逻辑按当前查询覆写/隐藏；
            // 其 render 为渲染收尾点 → 此时全部插件行已收集，整轮换入 refs 并立即
            // 应用一遍初始过滤。
            name: "没有可管理的社区插件",
            desc: "当前库里没有检测到其他社区插件。",
            searchable: false,
            render: (setting) =>
              this.primeDeclarativeEmptyRow(setting, collectedRows),
          },
        ],
      },
      {
        type: "group",
        heading: "关于",
        items: [
          {
            name: "产品",
            desc: `${this.plugin.manifest.name} ${this.plugin.manifest.version}`,
          },
          {
            name: "作者",
            desc: this.createAuthorDescriptionFragment(),
          },
        ],
      },
    ];
  }

  /** 轨道判断：宿主把 getSettingDefinitions() 结果存 settingItems（@since 1.13.0，随 update() 填充）；<1.13 宿主无该字段。 */
  private isDeclarativeTrack(): boolean {
    const declarative = this as unknown as { settingItems?: unknown[] };
    return declarative.settingItems !== undefined && declarative.settingItems.length > 0;
  }

  /** 轨道感知重渲染：声明式轨道一律 update()（类型投影调用，绕 obsidianmd/no-unsupported-api 静态版本缝）；
   *  <1.13 回落 display()。注意声明式重渲染后滚动状态由 requestRefresh 的恢复链负责。 */
  private rerenderTrack(): void {
    if (this.isDeclarativeTrack()) {
      const updateTab = this as unknown as { update?: () => void };
      if (typeof updateTab.update === "function") {
        updateTab.update();
      }
      return;
    }
    this.display();
  }

  private renderPluginManager(): void {
    this.plugin.syncManagedPlugins();

    const rows = this.getPluginRows();
    const renderedRows: RenderedPluginRow[] = [];
    let emptySetting: Setting | null = null;
    const group = new SettingGroup(this.containerEl).addClass("a-loader-plugin-group");
    const enabledCount = rows.filter(row => row.enabled).length;

    group.addSetting(setting => this.configureToolbarRow(setting, enabledCount, () => renderedRows, () => emptySetting));

    for (const row of rows) {
      renderedRows.push({
        row,
        setting: this.renderPluginRow(group, row)
      });
    }

    group.addSetting(setting => {
      emptySetting = setting.setClass("a-loader-empty-setting");
    });

    this.applyPluginSearchFilter(renderedRows, emptySetting);
    this.renderAboutGroup();
  }

  /** 工具行（搜索＋全部稍后；两轨道共用）：行引用经 getter 注入（回落供局部数组，声明式供字段数组）。 */
  private configureToolbarRow(
    setting: Setting,
    enabledCount: number,
    getRows: () => RenderedPluginRow[],
    getEmpty: () => Setting | null
  ): void {
    setting.setClass("a-loader-toolbar-setting");
    setting.addSearch(search => {
      search
        .setPlaceholder("搜索插件")
        .setValue(this.searchQuery)
        .onChange(value => {
          this.searchQuery = value;
          this.applyPluginSearchFilter(getRows(), getEmpty());
        });
    });
    setting.addButton(button => {
      button
        .setButtonText("全部稍后")
        .setDisabled(enabledCount === 0)
        .setTooltip("将所有已启用插件设为稍后加载")
        .onClick(() => {
          new DelayAllEnabledPluginsModal(
            this.app,
            enabledCount,
            async () => {
              await this.handleDelayAllEnabledPlugins();
            }
          ).open();
        });
    });
  }

  /** 声明式插件行：收集进本轮局部数组（供收尾换入），再走两轨道共用的行内容。 */
  private primeDeclarativePluginRow(
    setting: Setting,
    row: PluginListRow,
    collectedRows: RenderedPluginRow[]
  ): void {
    collectedRows.push({ row, setting });
    this.finalizePluginRow(setting, row);
  }

  /** 声明式空态行（渲染收尾点）：换入整轮 refs 并立即应用一遍初始过滤。 */
  private primeDeclarativeEmptyRow(
    setting: Setting,
    collectedRows: RenderedPluginRow[]
  ): void {
    this.declarativeRows = collectedRows;
    this.declarativeEmptySetting = setting;
    setting.setClass("a-loader-empty-setting");
    this.applyPluginSearchFilter(this.declarativeRows, setting);
  }

  private renderAboutGroup(): void {
    const group = new SettingGroup(this.containerEl).setHeading("关于");

    group.addSetting(setting => {
      setting
        .setName("产品")
        .setDesc(`${this.plugin.manifest.name} ${this.plugin.manifest.version}`);
    });

    group.addSetting(setting => {
      setting
        .setName("作者")
        .setDesc(this.createAuthorDescriptionFragment());
    });
  }

  /** 作者行 desc（站点链接 fragment；定义 desc 与回落 builder 共用同一构建器）。 */
  private createAuthorDescriptionFragment(): DocumentFragment {
    const desc = createFragment();
    const linkEl = createEl("a");
    linkEl.textContent = "Jiao Yingxing";
    linkEl.href = "https://github.com/jiaoyingxing";
    linkEl.target = "_blank";
    linkEl.rel = "noopener";
    desc.appendChild(linkEl);
    return desc;
  }

  private applyPluginSearchFilter(
    renderedRows: RenderedPluginRow[],
    emptySetting: Setting | null
  ): void {
    let visibleCount = 0;
    for (const rendered of renderedRows) {
      const visible = this.matchesSearch(rendered.row);
      rendered.setting.settingEl.toggle(visible);
      if (visible) visibleCount += 1;
    }

    if (!emptySetting) return;

    const hasQuery = this.searchQuery.trim().length > 0;
    emptySetting
      .setName(hasQuery ? "没有匹配的插件" : "没有可管理的社区插件")
      .setDesc(hasQuery ? "换一个关键词再试试。" : "当前库里没有检测到其他社区插件。");
    emptySetting.settingEl.toggle(visibleCount === 0);
  }

  private getPluginRows(): PluginListRow[] {
    const manifests = this.plugin.getCommunityPluginManifests();
    const entriesById = new Map(
      this.plugin.settings.managedPlugins.map(entry => [entry.pluginId, entry])
    );

    return manifests
      .map(manifest => {
        const entry = entriesById.get(manifest.id);
        if (!entry) return null;

        return {
          entry,
          manifest,
          enabled: this.plugin.isPluginEnabled(entry.pluginId)
        };
      })
      .filter((row): row is PluginListRow => Boolean(row))
      .sort((left, right) => {
        if (left.enabled !== right.enabled) {
          return left.enabled ? -1 : 1;
        }

        if (left.enabled && right.enabled) {
          const leftMode = this.getStartupMode(left.entry);
          const rightMode = this.getStartupMode(right.entry);
          if (leftMode !== rightMode) {
            return leftMode === "early" ? -1 : 1;
          }
        }

        return left.manifest.name.localeCompare(
          right.manifest.name,
          undefined,
          { sensitivity: "base" }
        );
      });
  }

  private matchesSearch(row: PluginListRow): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      row.manifest.name,
      row.manifest.description,
      this.getReadablePluginDescription(row.manifest),
      row.manifest.id,
      row.manifest.author
    ].some(value => (value ?? "").toLowerCase().includes(query));
  }

  private renderPluginRow(group: SettingGroup, row: PluginListRow): Setting {
    const { entry, manifest, enabled } = row;
    let setting!: Setting;

    group.addSetting(rowSetting => {
      setting = rowSetting
        .setName(manifest.name)
        .setDesc(this.getPluginDescription(entry, manifest, enabled));
      this.finalizePluginRow(setting, row);
    });

    return setting;
  }

  /** 行内容（名称/desc 之后的公共部分，两轨道共用）：状态类、启动时机控件、启用开关。 */
  private finalizePluginRow(setting: Setting, row: PluginListRow): void {
    const { entry, enabled } = row;

    setting.setClass("a-loader-plugin-setting");
    setting.settingEl.toggleClass("is-disabled-plugin", !enabled);
    setting.settingEl.toggleClass("has-error", Boolean(entry.lastError));

    const startupMode = this.getStartupMode(entry);
    const modeEl = setting.controlEl.createDiv({ cls: "a-loader-mode-control" });
    modeEl.toggleClass("is-disabled", !enabled);
    const modeIconEl = modeEl.createSpan({ cls: "a-loader-mode-icon" });
    setIcon(modeIconEl, this.getStartupModeIcon(startupMode));

    const dropdown = new DropdownComponent(modeEl);
    dropdown
      .addOption("early", "启动时加载")
      .addOption("delayed", "稍后加载")
      .setValue(startupMode)
      .setDisabled(!enabled)
      .onChange(value => {
        void this.handleStartupModeChange(entry.pluginId, value as StartupMode);
      });

    setting.addToggle((toggle: ToggleComponent) => {
      toggle
        .setValue(enabled)
        .setTooltip("启用或停用插件")
        .onChange(value => {
          void this.handlePluginEnabledChange(entry.pluginId, value);
        });
    });
  }

  private getPluginDescription(
    entry: ManagedPluginEntry,
    manifest: PluginManifest,
    _enabled: boolean
  ): DocumentFragment {
    const lines = this.getPluginIdentityDescriptionLines(manifest);

    if (entry.lastError) {
      lines.push(`上次加载失败：${entry.lastError}`);
    } else {
      const timing = getTimingSummary(entry.pluginId, this.plugin.settings);
      if (timing) {
        lines.push(
          `启动耗时：记录${timing.count}次，最近${formatMs(timing.latestMs)}，平均${formatMs(timing.averageMs)}`
        );
      }
    }

    return this.createPluginDescriptionFragment(lines);
  }

  private getPluginIdentityDescriptionLines(manifest: PluginManifest): string[] {
    const metaLine = [
      manifest.version ? `版本：${manifest.version}` : "",
      manifest.author ? `作者：${manifest.author}` : ""
    ].filter(Boolean).join(" · ");

    return [
      metaLine,
      this.getReadablePluginDescription(manifest)
    ].filter(Boolean);
  }

  private createPluginDescriptionFragment(lines: string[]): DocumentFragment {
    const fragment = createFragment();

    for (const line of lines) {
      const lineEl = createDiv();
      lineEl.className = "a-loader-plugin-description-line";
      lineEl.textContent = line;
      fragment.appendChild(lineEl);
    }

    return fragment;
  }

  private getReadablePluginDescription(manifest: PluginManifest): string {
    const description = manifest.description?.trim();
    if (!description) return manifest.id;

    const normalizedDescription = description
      .replace(/^[（(]\s*/, "")
      .replace(/\s*[）)]$/, "")
      .trim()
      .toLowerCase();

    if (normalizedDescription === "closed source") {
      return "闭源插件";
    }

    return description;
  }

  private getStartupMode(entry: ManagedPluginEntry): StartupMode {
    return entry.phase === "early" ? "early" : "delayed";
  }

  private getStartupModeIcon(mode: StartupMode): string {
    return mode === "early" ? "zap" : "timer";
  }

  private async handleStartupModeChange(pluginId: string, mode: StartupMode): Promise<void> {
    const phase: PluginPhase = mode === "early" ? "early" : "idleLong";
    try {
      await this.plugin.setPluginStartupPhase(pluginId, phase);
      new Notice(mode === "early" ? "已设为启动时加载。" : "已设为稍后加载，重启后生效。");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`调整启动时机失败：${message}`);
      this.requestRefresh();
    }
  }

  private async handlePluginEnabledChange(pluginId: string, enabled: boolean): Promise<void> {
    try {
      await this.plugin.setPluginEnabled(pluginId, enabled);
      new Notice(enabled ? "插件已启用。" : "插件已停用。");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`${enabled ? "启用" : "停用"}插件失败：${message}`);
      this.requestRefresh();
    }
  }

  private async handleDelayAllEnabledPlugins(): Promise<void> {
    let result: { enabledCount: number; changedCount: number };
    try {
      result = await this.plugin.setAllEnabledPluginsToDelayed();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`批量调整失败：${message}`);
      this.requestRefresh();
      return;
    }

    if (result.enabledCount === 0) {
      new Notice("当前没有已启用的插件可调整。");
      return;
    }

    if (result.changedCount === 0) {
      new Notice("当前已启用插件都已经是稍后加载。");
      return;
    }

    new Notice(`已将 ${result.enabledCount} 个已启用插件设为稍后加载。`);
  }
}

class DelayAllEnabledPluginsModal extends Modal {
  constructor(
    app: ALoaderPlugin["app"],
    private readonly enabledCount: number,
    private readonly onConfirm: () => Promise<void>
  ) {
    super(app);
  }

  override onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h3", { text: "全部稍后" });
    contentEl.createEl("p", {
      text: `将 ${this.enabledCount} 个已启用插件设为稍后加载。已停用插件不会受影响。`
    });

    const buttonRow = contentEl.createDiv({ cls: "modal-button-container" });

    new ButtonComponent(buttonRow)
      .setButtonText("取消")
      .onClick(() => this.close());

    new ButtonComponent(buttonRow)
      .setButtonText("全部稍后")
      .setCta()
      .onClick(() => {
        this.close();
        void this.onConfirm();
      });
  }
}
