import {
  DropdownComponent,
  Notice,
  PluginSettingTab,
  Setting,
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

  constructor(app: ALoaderPlugin["app"], private readonly plugin: ALoaderPlugin) {
    super(app, plugin);
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
        this.display();
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

  private renderPluginManager(): void {
    this.plugin.syncManagedPlugins();

    const rows = this.getPluginRows();
    const renderedRows: RenderedPluginRow[] = [];
    let emptySetting: Setting | null = null;
    const group = new SettingGroup(this.containerEl).addClass("a-loader-plugin-group");

    group.addSearch(search => {
      search
        .setPlaceholder("搜索插件")
        .setValue(this.searchQuery)
        .onChange(value => {
          this.searchQuery = value;
          this.applyPluginSearchFilter(renderedRows, emptySetting);
        });
    });

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

  private renderAboutGroup(): void {
    const group = new SettingGroup(this.containerEl).setHeading("关于");

    group.addSetting(setting => {
      setting
        .setName("产品")
        .setDesc(`${this.plugin.manifest.name} ${this.plugin.manifest.version}`);
    });

    group.addSetting(setting => {
      const desc = document.createDocumentFragment();
      const linkEl = document.createElement("a");
      linkEl.textContent = "Jiao Yingxing";
      linkEl.href = "https://github.com/jiaoyingxing";
      linkEl.target = "_blank";
      linkEl.rel = "noopener";
      desc.appendChild(linkEl);
      setting
        .setName("作者")
        .setDesc(desc);
    });
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
        .setClass("a-loader-plugin-setting")
        .setName(manifest.name)
        .setDesc(this.getPluginDescription(entry, manifest, enabled));
    });

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

    return setting;
  }

  private getPluginDescription(
    entry: ManagedPluginEntry,
    manifest: PluginManifest,
    enabled: boolean
  ): DocumentFragment {
    const lines = this.getPluginIdentityDescriptionLines(manifest);
    const details: string[] = [];

    if (entry.lastError) {
      details.push(`上次加载失败：${entry.lastError}`);
    } else {
      const timing = getTimingSummary(entry.pluginId, this.plugin.settings);
      if (timing) {
        details.push(`累计${timing.count}次启动自测`);
        details.push(`自测中位数${formatMs(timing.ms)}`);
      }

      if (!enabled) {
        details.unshift("已停用");
      }
    }

    if (details.length > 0) {
      lines.push(`（${details.join("、")}）`);
    }

    return this.createPluginDescriptionFragment(lines);
  }

  private getPluginIdentityDescriptionLines(manifest: PluginManifest): string[] {
    return [
      manifest.version ? `版本：${manifest.version}` : "",
      manifest.author ? `作者：${manifest.author}` : "",
      this.getReadablePluginDescription(manifest)
    ].filter(Boolean);
  }

  private createPluginDescriptionFragment(lines: string[]): DocumentFragment {
    const fragment = document.createDocumentFragment();

    for (const line of lines) {
      const lineEl = document.createElement("div");
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
    await this.plugin.setPluginStartupPhase(pluginId, phase);
    new Notice(mode === "early" ? "已设为启动时加载。" : "已设为稍后加载，重启后生效。");
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
}
