import { Notice, Platform, Plugin, PluginManifest } from "obsidian";
import type { InternalApp } from "./internal-types";
import {
  addTimingSample,
  collectCommunityPluginManifests,
  normalizeManagedPlugins,
  normalizeTimingSamples,
  resolveVisibleEnabledPluginIds
} from "./plugin-registry";
import { ALoaderSettingTab } from "./settings-tab";
import {
  completePhaseStatus,
  computeOptimizationPlan,
  createStartupRunStatus
} from "./startup-plan";
import {
  createDefaultRunStatus,
  createDefaultState,
  type ALoaderState,
  type ManagedPluginEntry,
  type PluginPhase,
  type TimingSample
} from "./types";

export default class ALoaderPlugin extends Plugin {
  settings: ALoaderState = createDefaultState();
  private settingTab: ALoaderSettingTab | null = null;
  private layoutReadyHandled = false;
  private pendingPhaseChain: Promise<void> = Promise.resolve();
  private phaseTimerIds = new Set<number>();
  private lastPersistedSnapshot: string | null = null;

  override async onload(): Promise<void> {
    try {
      await this.loadSettings();
      this.normalizeManagedPlugins();

      this.settingTab = new ALoaderSettingTab(this.app, this);
      this.addSettingTab(this.settingTab);
      this.registerCommands();

      this.register(() => this.clearPhaseTimers());
      await this.startStartupOptimizationIfNeeded();

      this.app.workspace.onLayoutReady(() => {
        void this.handleLayoutReady();
      });
    } catch (error) {
      console.error("[A Loader] Failed to initialize plugin.", error);
    }
  }

  override onunload(): void {
    this.clearPhaseTimers();
  }

  getInternalApp(): InternalApp {
    return this.app as InternalApp;
  }

  getCommunityPluginManifests(): PluginManifest[] {
    return collectCommunityPluginManifests(this.getInternalApp(), this.manifest.id);
  }

  syncManagedPlugins(): void {
    this.normalizeManagedPlugins();
    this.syncOriginalEnabledPluginsFromSystem();
  }

  async setPluginStartupPhase(pluginId: string, phase: Extract<PluginPhase, "early" | "idleLong">): Promise<void> {
    const target = this.settings.managedPlugins.find(entry => entry.pluginId === pluginId);
    if (!target) return;

    target.phase = phase;
    target.lastError = "";
    await this.applyOptimizationPlan();
  }

  isPluginEnabled(pluginId: string): boolean {
    return this.getBaselineEnabledCommunityPluginIds().includes(pluginId);
  }

  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
    const internalApp = this.getInternalApp();
    const target = this.settings.managedPlugins.find(entry => entry.pluginId === pluginId);
    const manifest = internalApp.plugins.manifests[pluginId];
    if (!target || !manifest || pluginId === this.manifest.id) return;

    const desiredEnabled = new Set(this.getBaselineEnabledCommunityPluginIds());

    if (!enabled) {
      desiredEnabled.delete(pluginId);
      target.disabledByOptimizer = false;
      target.lastError = "";
      internalApp.plugins.enabledPlugins.delete(pluginId);
      if (internalApp.plugins.plugins[pluginId]) {
        await internalApp.plugins.disablePlugin(pluginId);
      }
      this.settings.originalEnabledPlugins = [...desiredEnabled];
      internalApp.plugins.requestSaveConfig();
      await this.applyOptimizationPlan();
      return;
    }

    desiredEnabled.add(pluginId);
    target.lastError = "";
    target.phase = this.getStartupPhase(target);

    this.settings.originalEnabledPlugins = [...desiredEnabled];
    internalApp.plugins.enabledPlugins.add(pluginId);
    if (!internalApp.plugins.plugins[pluginId]) {
      await internalApp.plugins.enablePlugin(pluginId);
    }
    internalApp.plugins.requestSaveConfig();
    await this.applyOptimizationPlan();
  }

  async applyOptimizationPlan(): Promise<void> {
    const internalApp = this.getInternalApp();
    const baselineEnabled = this.getBaselineEnabledCommunityPluginIds();
    const plan = computeOptimizationPlan(this.settings.managedPlugins, baselineEnabled);
    const controlledIds = plan.controlledIds;

    this.settings.originalEnabledPlugins = plan.originalEnabledPlugins;
    this.settings.optimizerEnabled = plan.optimizerEnabled;
    this.settings.managedPlugins = plan.managedPlugins;

    for (const pluginId of controlledIds) {
      internalApp.plugins.enabledPlugins.delete(pluginId);
    }

    for (const pluginId of baselineEnabled) {
      if (!controlledIds.includes(pluginId)) {
        internalApp.plugins.enabledPlugins.add(pluginId);
      }
    }

    internalApp.plugins.requestSaveConfig();
    this.settings.lastRunStatus = plan.lastRunStatus;

    await this.persistState({ refreshUi: true });
  }

  async restoreOriginalEnabledState(
    autoPaused = false,
    refreshUi = true
  ): Promise<void> {
    const internalApp = this.getInternalApp();
    const restoreSet = new Set(this.settings.originalEnabledPlugins);
    this.clearPhaseTimers();

    for (const manifest of this.getCommunityPluginManifests()) {
      if (restoreSet.has(manifest.id)) {
        internalApp.plugins.enabledPlugins.add(manifest.id);
      } else {
        internalApp.plugins.enabledPlugins.delete(manifest.id);
      }
    }

    internalApp.plugins.requestSaveConfig();

    this.settings.optimizerEnabled = false;
    this.settings.pauseNextStartup = false;
    this.settings.interruptedStartupRuns = 0;
    this.settings.managedPlugins = this.settings.managedPlugins.map(entry => ({
      ...entry,
      disabledByOptimizer: false,
      lastError: ""
    }));
    this.settings.lastRunStatus = {
      ...createDefaultRunStatus(),
      state: autoPaused ? "auto-paused" : "completed",
      lastCompletedAt: new Date().toISOString(),
      message: autoPaused
        ? "连续两次启动未正常收尾，启动优化已自动暂停，并为下次启动恢复原始启用集。"
        : "原始启用插件集合已恢复。重启 Obsidian 后会回到原本的启动路径。"
    };

    await this.persistState({ refreshUi });
  }

  async pauseNextStartupRun(): Promise<void> {
    this.settings.pauseNextStartup = true;
    this.settings.lastRunStatus = {
      ...this.settings.lastRunStatus,
      state: "paused",
      message: "下一次启动优化会被跳过一次。"
    };
    await this.persistState({ refreshUi: true });
  }

  async persistState(options: { refreshUi?: boolean } = {}): Promise<void> {
    this.normalizeManagedPlugins();
    this.trimTimingSamples();

    const snapshot = this.serializeState(this.settings);
    if (snapshot !== this.lastPersistedSnapshot) {
      await this.saveData(this.settings);
      this.lastPersistedSnapshot = snapshot;
    }

    if (options.refreshUi && this.settingTab?.isVisible()) {
      this.settingTab.requestRefresh();
    }
  }

  private async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as Partial<ALoaderState> | null;
    this.settings = Object.assign(createDefaultState(), raw ?? {});
    this.settings.lastRunStatus = Object.assign(createDefaultRunStatus(), raw?.lastRunStatus ?? {});
    const legacyState = this.settings as unknown as Record<string, unknown>;
    delete legacyState.activeView;
    delete legacyState.importedReports;
    delete legacyState.pinnedEarly;
    delete legacyState.workspaceHints;
    this.trimTimingSamples();
    this.lastPersistedSnapshot = this.serializeState(this.settings);
  }

  private normalizeManagedPlugins(): void {
    this.settings.managedPlugins = normalizeManagedPlugins(
      this.getCommunityPluginManifests(),
      this.settings.managedPlugins
    );
  }

  private syncOriginalEnabledPluginsFromSystem(): void {
    const nextEnabledPlugins = this.getBaselineEnabledCommunityPluginIds();
    if (this.haveSameItems(nextEnabledPlugins, this.settings.originalEnabledPlugins)) return;

    this.settings.originalEnabledPlugins = nextEnabledPlugins;
    void this.persistState();
  }

  private trimTimingSamples(): void {
    this.settings.timingSamples = normalizeTimingSamples(this.settings.timingSamples);
  }

  private serializeState(state: ALoaderState): string {
    return JSON.stringify(state);
  }

  private registerCommands(): void {
    this.addCommand({
      id: "open-a-loader-settings",
      name: "打开 A Loader 设置",
      callback: () => this.openSettingsTab()
    });

    this.addCommand({
      id: "pause-next-optimized-startup",
      name: "暂停下一次启动优化",
      callback: () => void this.pauseNextStartupRun()
    });

    this.addCommand({
      id: "restore-original-enabled-set",
      name: "恢复原始启用插件集合",
      callback: () => void this.restoreOriginalEnabledState()
    });
  }

  private openSettingsTab(): void {
    const internalApp = this.getInternalApp();
    internalApp.setting?.open();
    internalApp.setting?.openTabById(this.manifest.id);
  }

  private clearPhaseTimers(): void {
    for (const timerId of this.phaseTimerIds) {
      window.clearTimeout(timerId);
    }
    this.phaseTimerIds.clear();
  }

  private async startStartupOptimizationIfNeeded(): Promise<void> {
    if (this.settings.lastRunStatus.state === "running") {
      this.settings.interruptedStartupRuns += 1;
      if (this.settings.interruptedStartupRuns >= 2 && this.settings.optimizerEnabled) {
        await this.restoreOriginalEnabledState(true, false);
        new Notice("连续两次启动没有正常收尾，启动优化已自动暂停。");
        return;
      }
    } else {
      this.settings.interruptedStartupRuns = 0;
    }

    if (this.settings.pauseNextStartup) {
      this.settings.pauseNextStartup = false;
      this.settings.lastRunStatus = {
        ...createDefaultRunStatus(),
        state: "paused",
        lastCompletedAt: new Date().toISOString(),
        message: "这一次启动优化已按你的要求跳过。"
      };
      await this.persistState();
      return;
    }

    const pendingAutoPluginIds = this.getManagedStartupEntries().map(entry => entry.pluginId);

    if (!this.settings.optimizerEnabled || pendingAutoPluginIds.length === 0) {
      this.settings.lastRunStatus = createStartupRunStatus([]);
      await this.persistState();
      return;
    }

    this.settings.lastRunStatus = createStartupRunStatus(pendingAutoPluginIds);
    await this.persistState();
  }

  private async handleLayoutReady(): Promise<void> {
    if (this.layoutReadyHandled) return;
    this.layoutReadyHandled = true;

    if (!this.settings.optimizerEnabled || this.settings.lastRunStatus.state !== "running") return;

    this.schedulePhase("idleLong", Platform.isMobileApp ? 5000 : 2400);
  }

  private schedulePhase(phase: PluginPhase, delayMs: number): void {
    const timerId = window.setTimeout(() => {
      this.phaseTimerIds.delete(timerId);
      void this.enqueuePhase(async () => {
        await this.waitForIdleWindow();
        await this.runPhase(phase, true);
      });
    }, delayMs);

    this.phaseTimerIds.add(timerId);
  }

  private waitForIdleWindow(): Promise<void> {
    return new Promise(resolve => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => resolve(), { timeout: 1200 });
        return;
      }

      window.setTimeout(resolve, 120);
    });
  }

  private enqueuePhase(task: () => Promise<void>): Promise<void> {
    this.pendingPhaseChain = this.pendingPhaseChain.then(task).catch(error => {
      console.error("[A Loader] phase execution failed", error);
    });
    return this.pendingPhaseChain;
  }

  private async runPhase(phase: PluginPhase, trackStartupRun: boolean): Promise<void> {
    const phaseEntries = this.getManagedStartupEntries()
      .filter(entry => entry.phase === phase)
      .sort((left, right) => left.order - right.order);

    if (phaseEntries.length === 0) {
      if (trackStartupRun) {
        await this.markPhaseComplete(phase);
      }
      return;
    }

    const internalApp = this.getInternalApp();
    const interPluginDelay = Platform.isMobileApp ? 300 : 100;

    for (const entry of phaseEntries) {
      if (internalApp.plugins.plugins[entry.pluginId]) {
        const changed = this.removePendingPlugin(entry.pluginId);
        if (changed) {
          await this.persistState();
        }
        continue;
      }

      const manifest = internalApp.plugins.manifests[entry.pluginId];
      const startedAt = performance.now();

      try {
        const success = await internalApp.plugins.enablePlugin(entry.pluginId);
        const duration = performance.now() - startedAt;
        if (!success) {
          this.setPluginError(
            entry.pluginId,
            `Obsidian 拒绝加载 ${manifest?.name ?? entry.pluginId}。`
          );
          await this.persistState();
          continue;
        }

        this.recordSelfTimingSample(entry.pluginId, manifest, duration);
        this.clearPluginError(entry.pluginId);
        this.removePendingPlugin(entry.pluginId);
        await this.persistState();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.setPluginError(entry.pluginId, message);
        await this.persistState();
      }

      if (entry !== phaseEntries[phaseEntries.length - 1]) {
        await this.wait(interPluginDelay);
      }
    }

    if (trackStartupRun) {
      await this.markPhaseComplete(phase);
    }
  }

  private async markPhaseComplete(phase: PluginPhase): Promise<void> {
    this.settings.lastRunStatus = completePhaseStatus(this.settings.lastRunStatus, phase);

    if (this.settings.lastRunStatus.state === "completed") {
      this.settings.interruptedStartupRuns = 0;
    }

    await this.persistState();
  }

  private recordSelfTimingSample(
    pluginId: string,
    manifest: PluginManifest | undefined,
    ms: number
  ): void {
    const sample: TimingSample = {
      pluginId,
      pluginName: manifest?.name ?? pluginId,
      version: manifest?.version ?? "",
      ms,
      capturedAt: new Date().toISOString()
    };

    this.settings.timingSamples = addTimingSample(this.settings.timingSamples, sample);
  }

  private setPluginError(pluginId: string, message: string): void {
    const target = this.settings.managedPlugins.find(entry => entry.pluginId === pluginId);
    if (target) {
      target.lastError = message;
    }
    this.removePendingPlugin(pluginId);
    this.settings.lastRunStatus.message = `加载 ${pluginId} 失败：${message}`;
  }

  private clearPluginError(pluginId: string): void {
    const target = this.settings.managedPlugins.find(entry => entry.pluginId === pluginId);
    if (target?.lastError) {
      target.lastError = "";
    }
  }

  private removePendingPlugin(pluginId: string): boolean {
    if (!this.settings.lastRunStatus.pendingPluginIds.includes(pluginId)) {
      return false;
    }

    this.settings.lastRunStatus.pendingPluginIds =
      this.settings.lastRunStatus.pendingPluginIds.filter(candidate => candidate !== pluginId);
    return true;
  }

  private getManagedStartupEntries(): ManagedPluginEntry[] {
    const originalEnabled = new Set(this.settings.originalEnabledPlugins);
    return this.settings.managedPlugins.filter(entry => {
      return entry.disabledByOptimizer && originalEnabled.has(entry.pluginId) && entry.phase === "idleLong";
    });
  }

  private getBaselineEnabledCommunityPluginIds(): string[] {
    const internalApp = this.getInternalApp();
    const pluginIds = this.getCommunityPluginManifests().map(manifest => manifest.id);

    return resolveVisibleEnabledPluginIds({
      pluginIds,
      entries: this.settings.managedPlugins,
      originalEnabledPluginIds: this.settings.originalEnabledPlugins,
      liveEnabledPluginIds: Array.from(internalApp.plugins.enabledPlugins),
      loadedPluginIds: Object.keys(internalApp.plugins.plugins),
      pendingPluginIds: this.settings.lastRunStatus.pendingPluginIds
    });
  }

  private getStartupPhase(entry: ManagedPluginEntry): Extract<PluginPhase, "early" | "idleLong"> {
    return entry.phase === "early" ? "early" : "idleLong";
  }

  private haveSameItems(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;

    const rightSet = new Set(right);
    return left.every(item => rightSet.has(item));
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timerId = window.setTimeout(() => {
        this.phaseTimerIds.delete(timerId);
        resolve();
      }, ms);

      this.phaseTimerIds.add(timerId);
    });
  }
}
