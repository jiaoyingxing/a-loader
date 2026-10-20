import { Notice, Platform, Plugin, PluginManifest } from "obsidian";
import type { InternalApp } from "./internal-types";
import {
  addTimingSample,
  collectCommunityPluginManifests,
  normalizeManagedPlugins,
  normalizeTimingSamples,
  resolveVisibleEnabledPluginIds
} from "./plugin-registry";
import {
  captureRibbonLayoutSnapshot,
  normalizeRibbonLayoutSnapshots,
  restoreOwnedRibbonLayoutSnapshot,
  type RibbonLayoutPlatform
} from "./ribbon-layout";
import { ALoaderSettingTab } from "./settings-tab";
import {
  armOwnedPluginIdsForDelayedLoad,
  completePhaseStatus,
  computeOptimizationPlan,
  createStartupRunStatus,
  getOptimizerOwnedPluginIds,
  restoreOwnedPluginIds,
  shouldRearmAfterPausedStartup
} from "./startup-plan";
import {
  createDefaultRunStatus,
  createDefaultState,
  type ALoaderState,
  type ManagedPluginEntry,
  type PluginPhase,
  type RibbonLayoutSnapshots,
  type StartupRunStatus,
  type TimingSample
} from "./types";

interface OptimizationStateSnapshot {
  managedPlugins: ManagedPluginEntry[];
  originalEnabledPlugins: string[];
  ribbonLayoutSnapshots: RibbonLayoutSnapshots;
  optimizerEnabled: boolean;
  lastRunStatus: StartupRunStatus;
}

export default class ALoaderPlugin extends Plugin {
  override settings: ALoaderState = createDefaultState();
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
      this.registerEvent(this.app.workspace.on("quit", tasks => {
        tasks.add(async () => {
          this.captureCurrentRibbonLayout(this.getOptimizerOwnedPluginIds());
          await this.persistState();
        });
      }));

      this.register(() => this.clearPhaseTimers());
      await this.startStartupOptimizationIfNeeded();

      this.app.workspace.onLayoutReady(() => {
        void this.handleLayoutReady();
      });
    } catch (error) {
      console.error("[A Loader] Failed to initialize plugin.", error);
      this.restoreOptimizerOwnedPluginsFailOpen();
    }
  }

  override onunload(): void {
    this.clearPhaseTimers();
    window.setTimeout(() => {
      const internalApp = this.getInternalApp();
      if (!internalApp.plugins.enabledPlugins.has(this.manifest.id)) {
        this.restoreOptimizerOwnedPluginsFailOpen();
      }
    }, 0);
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

    const previousOptimizationState = this.captureOptimizationState();
    target.phase = phase;
    target.lastError = "";
    try {
      await this.applyOptimizationPlan();
    } catch (error) {
      this.restoreOptimizationState(previousOptimizationState);
      await this.persistRollbackState(`changing the startup phase for ${pluginId}`);
      throw error;
    }
  }

  isPluginEnabled(pluginId: string): boolean {
    return this.getBaselineEnabledCommunityPluginIds().includes(pluginId);
  }

  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
    const internalApp = this.getInternalApp();
    const target = this.settings.managedPlugins.find(entry => entry.pluginId === pluginId);
    const manifest = internalApp.plugins.manifests[pluginId];
    if (!target || !manifest || pluginId === this.manifest.id) return;

    const previousOptimizationState = this.captureOptimizationState();
    const wasSystemEnabled = internalApp.plugins.enabledPlugins.has(pluginId);
    const wasLoaded = Boolean(internalApp.plugins.plugins[pluginId]);
    const desiredEnabled = new Set(this.getBaselineEnabledCommunityPluginIds());

    try {
      if (!enabled) {
        desiredEnabled.delete(pluginId);
        target.disabledByOptimizer = false;
        target.lastError = "";
        internalApp.plugins.enabledPlugins.delete(pluginId);
        if (internalApp.plugins.plugins[pluginId]) {
          await internalApp.plugins.disablePlugin(pluginId);
        }
        this.settings.originalEnabledPlugins = [...desiredEnabled];
        await this.applyOptimizationPlan();
        return;
      }

      desiredEnabled.add(pluginId);
      target.lastError = "";
      target.phase = this.getStartupPhase(target);

      this.settings.originalEnabledPlugins = [...desiredEnabled];
      internalApp.plugins.enabledPlugins.add(pluginId);
      if (!internalApp.plugins.plugins[pluginId]) {
        const success = await internalApp.plugins.enablePlugin(pluginId);
        if (!success) {
          throw new Error("Obsidian 拒绝启用该插件。");
        }
      }
      await this.applyOptimizationPlan();
    } catch (error) {
      this.restoreOptimizationState(previousOptimizationState);

      try {
        const isLoaded = Boolean(internalApp.plugins.plugins[pluginId]);
        if (wasLoaded && !isLoaded) {
          const success = await internalApp.plugins.enablePlugin(pluginId);
          if (!success) {
            throw new Error("Obsidian 拒绝恢复该插件的加载状态。");
          }
        } else if (!wasLoaded && isLoaded) {
          await internalApp.plugins.disablePlugin(pluginId);
        }
      } catch (rollbackError) {
        console.error(`[A Loader] failed to roll back ${pluginId} after an enable-state error`, rollbackError);
      }

      if (wasSystemEnabled) {
        internalApp.plugins.enabledPlugins.add(pluginId);
      } else {
        internalApp.plugins.enabledPlugins.delete(pluginId);
      }
      try {
        internalApp.plugins.requestSaveConfig();
      } catch (rollbackError) {
        console.error(`[A Loader] failed to persist the system rollback for ${pluginId}`, rollbackError);
      }
      await this.persistRollbackState(`changing the enabled state for ${pluginId}`);
      throw error;
    }
  }

  async setAllEnabledPluginsToDelayed(): Promise<{ enabledCount: number; changedCount: number }> {
    this.syncManagedPlugins();
    const previousOptimizationState = this.captureOptimizationState();

    const enabledPluginIds = new Set(this.getBaselineEnabledCommunityPluginIds());
    if (enabledPluginIds.size === 0) {
      return { enabledCount: 0, changedCount: 0 };
    }

    let changedCount = 0;
    for (const entry of this.settings.managedPlugins) {
      if (!enabledPluginIds.has(entry.pluginId)) continue;

      if (entry.phase !== "idleLong" || entry.lastError) {
        changedCount += 1;
      }

      entry.phase = "idleLong";
      entry.lastError = "";
    }

    if (changedCount > 0) {
      try {
        await this.applyOptimizationPlan();
      } catch (error) {
        this.restoreOptimizationState(previousOptimizationState);
        await this.persistRollbackState("setting all enabled plugins to delayed loading");
        throw error;
      }
    }

    return {
      enabledCount: enabledPluginIds.size,
      changedCount
    };
  }

  async applyOptimizationPlan(): Promise<void> {
    const internalApp = this.getInternalApp();
    const baselineEnabled = this.getBaselineEnabledCommunityPluginIds();
    const plan = computeOptimizationPlan(this.settings.managedPlugins, baselineEnabled);
    const controlledIds = plan.controlledIds;

    this.settings.originalEnabledPlugins = plan.originalEnabledPlugins;
    this.settings.optimizerEnabled = plan.optimizerEnabled;
    this.settings.managedPlugins = plan.managedPlugins;
    this.settings.lastRunStatus = plan.lastRunStatus;
    this.captureCurrentRibbonLayout(controlledIds);

    await this.persistState({ refreshUi: true });

    const currentEnabled = Array.from(internalApp.plugins.enabledPlugins);
    const nextEnabled = armOwnedPluginIdsForDelayedLoad(
      restoreOwnedPluginIds(currentEnabled, baselineEnabled),
      controlledIds
    );
    this.replaceSystemEnabledPluginIds(nextEnabled);
  }

  async restoreDelayedPluginsToSystem(
    autoPaused = false,
    refreshUi = true
  ): Promise<void> {
    this.clearPhaseTimers();
    this.settings.optimizerEnabled = false;
    const restoreFailures = await this.restoreOptimizerOwnedPluginsNow();

    this.settings.pauseNextStartup = false;
    this.settings.interruptedStartupRuns = 0;
    this.settings.managedPlugins = this.settings.managedPlugins.map(entry => ({
      ...entry,
      disabledByOptimizer: false,
      lastError: restoreFailures.get(entry.pluginId) ?? ""
    }));
    this.settings.lastRunStatus = {
      ...createDefaultRunStatus(),
      state: autoPaused ? "auto-paused" : "completed",
      lastCompletedAt: new Date().toISOString(),
      message: restoreFailures.size > 0
        ? `已恢复系统启用状态，但有 ${restoreFailures.size} 个插件本次加载失败，下次启动会由 Obsidian 重试。`
        : autoPaused
          ? "连续两次启动未正常收尾，启动优化已自动暂停，稍后加载插件已恢复为系统启用状态。"
          : "稍后加载插件已恢复为系统启用状态。"
    };

    await this.persistState({ refreshUi });
  }

  async pauseNextStartupRun(): Promise<void> {
    this.clearPhaseTimers();
    const restoreFailures = await this.restoreOptimizerOwnedPluginsNow();
    this.settings.pauseNextStartup = true;
    this.settings.lastRunStatus = {
      ...this.settings.lastRunStatus,
      state: "paused",
      message: restoreFailures.size > 0
        ? `下一次启动优化会跳过一次；有 ${restoreFailures.size} 个插件本次加载失败，下次启动会由 Obsidian 重试。`
        : "下一次启动优化会跳过一次，稍后加载插件已恢复为系统启用状态。"
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
    this.settings.ribbonLayoutSnapshots = normalizeRibbonLayoutSnapshots(
      raw?.ribbonLayoutSnapshots
    );
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

  private captureOptimizationState(): OptimizationStateSnapshot {
    return {
      managedPlugins: this.settings.managedPlugins.map(entry => ({ ...entry })),
      originalEnabledPlugins: [...this.settings.originalEnabledPlugins],
      ribbonLayoutSnapshots: this.cloneRibbonLayoutSnapshots(
        this.settings.ribbonLayoutSnapshots
      ),
      optimizerEnabled: this.settings.optimizerEnabled,
      lastRunStatus: {
        ...this.settings.lastRunStatus,
        pendingPluginIds: [...this.settings.lastRunStatus.pendingPluginIds],
        completedPhases: [...this.settings.lastRunStatus.completedPhases]
      }
    };
  }

  private restoreOptimizationState(snapshot: OptimizationStateSnapshot): void {
    this.settings.managedPlugins = snapshot.managedPlugins.map(entry => ({ ...entry }));
    this.settings.originalEnabledPlugins = [...snapshot.originalEnabledPlugins];
    this.settings.ribbonLayoutSnapshots = this.cloneRibbonLayoutSnapshots(
      snapshot.ribbonLayoutSnapshots
    );
    this.settings.optimizerEnabled = snapshot.optimizerEnabled;
    this.settings.lastRunStatus = {
      ...snapshot.lastRunStatus,
      pendingPluginIds: [...snapshot.lastRunStatus.pendingPluginIds],
      completedPhases: [...snapshot.lastRunStatus.completedPhases]
    };
  }

  private async persistRollbackState(context: string): Promise<void> {
    try {
      await this.persistState({ refreshUi: true });
    } catch (error) {
      console.error(`[A Loader] failed to persist rollback state after ${context}`, error);
    }
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
      name: "恢复稍后加载插件",
      callback: () => void this.restoreDelayedPluginsToSystem()
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
        await this.restoreDelayedPluginsToSystem(true, false);
        new Notice("连续两次启动没有正常收尾，启动优化已自动暂停，稍后加载插件已经恢复。");
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

    if (!this.settings.optimizerEnabled) return;

    if (this.settings.lastRunStatus.state === "paused") {
      if (!shouldRearmAfterPausedStartup(
        this.settings.optimizerEnabled,
        this.settings.lastRunStatus.state,
        this.settings.pauseNextStartup
      )) return;

      this.armOptimizerOwnedPluginsForNextStartup();
      this.settings.lastRunStatus.message = "本次启动优化已跳过，下一次启动仍会按原计划稍后加载。";
      await this.persistState();
      return;
    }

    if (this.settings.lastRunStatus.state !== "running") return;

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
      if (
        !this.settings.optimizerEnabled
        || this.settings.lastRunStatus.state !== "running"
      ) return;

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

    this.restoreOptimizerOwnedRibbonLayout();

    if (
      trackStartupRun
      && this.settings.optimizerEnabled
      && this.settings.lastRunStatus.state === "running"
    ) {
      await this.markPhaseComplete(phase);
    }
  }

  private async markPhaseComplete(phase: PluginPhase): Promise<void> {
    this.settings.lastRunStatus = completePhaseStatus(this.settings.lastRunStatus, phase);

    if (this.settings.lastRunStatus.state === "completed") {
      this.settings.interruptedStartupRuns = 0;
      this.armOptimizerOwnedPluginsForNextStartup();
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
    const optimizerOwned = new Set(this.getOptimizerOwnedPluginIds());
    return this.settings.managedPlugins.filter(entry => optimizerOwned.has(entry.pluginId));
  }

  private getOptimizerOwnedPluginIds(): string[] {
    return getOptimizerOwnedPluginIds(
      this.settings.managedPlugins,
      this.settings.originalEnabledPlugins
    );
  }

  private replaceSystemEnabledPluginIds(nextEnabledPluginIds: string[]): void {
    const internalApp = this.getInternalApp();
    const previousEnabledPluginIds = Array.from(internalApp.plugins.enabledPlugins);
    const nextEnabled = new Set(nextEnabledPluginIds);

    try {
      for (const pluginId of previousEnabledPluginIds) {
        if (!nextEnabled.has(pluginId)) {
          internalApp.plugins.enabledPlugins.delete(pluginId);
        }
      }

      for (const pluginId of nextEnabledPluginIds) {
        internalApp.plugins.enabledPlugins.add(pluginId);
      }

      internalApp.plugins.requestSaveConfig();
    } catch (error) {
      internalApp.plugins.enabledPlugins.clear();
      for (const pluginId of previousEnabledPluginIds) {
        internalApp.plugins.enabledPlugins.add(pluginId);
      }
      try {
        internalApp.plugins.requestSaveConfig();
      } catch (rollbackError) {
        console.error("[A Loader] failed to persist the previous system enabled set", rollbackError);
      }
      throw error;
    }
  }

  private restoreOptimizerOwnedPluginsInSystemConfig(): string[] {
    const internalApp = this.getInternalApp();
    const optimizerOwnedPluginIds = this.getOptimizerOwnedPluginIds();
    const nextEnabled = restoreOwnedPluginIds(
      Array.from(internalApp.plugins.enabledPlugins),
      optimizerOwnedPluginIds
    );
    this.replaceSystemEnabledPluginIds(nextEnabled);
    return optimizerOwnedPluginIds;
  }

  private armOptimizerOwnedPluginsForNextStartup(): void {
    const internalApp = this.getInternalApp();
    const optimizerOwnedPluginIds = this.getOptimizerOwnedPluginIds();
    this.captureCurrentRibbonLayout(optimizerOwnedPluginIds);
    const nextEnabled = armOwnedPluginIdsForDelayedLoad(
      Array.from(internalApp.plugins.enabledPlugins),
      optimizerOwnedPluginIds
    );
    this.replaceSystemEnabledPluginIds(nextEnabled);
  }

  private async restoreOptimizerOwnedPluginsNow(): Promise<Map<string, string>> {
    const internalApp = this.getInternalApp();
    const optimizerOwnedPluginIds = this.restoreOptimizerOwnedPluginsInSystemConfig();
    const failures = new Map<string, string>();

    for (const pluginId of optimizerOwnedPluginIds) {
      if (internalApp.plugins.plugins[pluginId]) continue;

      try {
        const success = await internalApp.plugins.enablePlugin(pluginId);
        if (!success) {
          failures.set(pluginId, "Obsidian 拒绝加载该插件。");
        }
      } catch (error) {
        failures.set(pluginId, error instanceof Error ? error.message : String(error));
      }
    }

    this.restoreOptimizerOwnedRibbonLayout();
    return failures;
  }

  private restoreOptimizerOwnedPluginsFailOpen(): void {
    try {
      const internalApp = this.getInternalApp();
      const optimizerOwnedPluginIds = this.restoreOptimizerOwnedPluginsInSystemConfig();
      const pendingLoads: Promise<unknown>[] = [];

      for (const pluginId of optimizerOwnedPluginIds) {
        if (internalApp.plugins.plugins[pluginId]) continue;
        pendingLoads.push(internalApp.plugins.enablePlugin(pluginId).catch(error => {
          console.error(`[A Loader] failed to restore ${pluginId} during fail-open recovery`, error);
        }));
      }

      void Promise.allSettled(pendingLoads).then(() => {
        this.restoreOptimizerOwnedRibbonLayout();
      });
    } catch (error) {
      console.error("[A Loader] fail-open recovery could not update the system enabled set", error);
    }
  }

  private captureCurrentRibbonLayout(optimizerOwnedPluginIds: string[]): void {
    if (optimizerOwnedPluginIds.length === 0) return;

    try {
      const ribbon = this.getInternalApp().workspace.leftRibbon;
      if (typeof ribbon.serialize !== "function") return;

      const platform = this.getRibbonLayoutPlatform();
      this.settings.ribbonLayoutSnapshots[platform] = captureRibbonLayoutSnapshot(
        ribbon.serialize(),
        this.settings.ribbonLayoutSnapshots[platform],
        optimizerOwnedPluginIds
      );
    } catch (error) {
      console.warn("[A Loader] could not capture the current ribbon layout", error);
    }
  }

  private restoreOptimizerOwnedRibbonLayout(): void {
    const optimizerOwnedPluginIds = this.getOptimizerOwnedPluginIds();
    if (optimizerOwnedPluginIds.length === 0) return;

    try {
      const internalApp = this.getInternalApp();
      const ribbon = internalApp.workspace.leftRibbon;
      if (
        typeof ribbon.serialize !== "function"
        || typeof ribbon.load !== "function"
      ) return;

      const restoredLayout = restoreOwnedRibbonLayoutSnapshot(
        ribbon.serialize(),
        this.settings.ribbonLayoutSnapshots[this.getRibbonLayoutPlatform()],
        optimizerOwnedPluginIds
      );
      if (!restoredLayout) return;

      ribbon.load(restoredLayout);
      internalApp.workspace.requestSaveLayout();
    } catch (error) {
      console.warn("[A Loader] could not restore the managed ribbon layout", error);
    }
  }

  private getRibbonLayoutPlatform(): RibbonLayoutPlatform {
    return Platform.isMobileApp ? "mobile" : "desktop";
  }

  private cloneRibbonLayoutSnapshots(
    snapshots: RibbonLayoutSnapshots
  ): RibbonLayoutSnapshots {
    return normalizeRibbonLayoutSnapshots(snapshots);
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
