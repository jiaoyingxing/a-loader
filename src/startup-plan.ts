import {
  createDefaultRunStatus,
  PHASE_LABELS,
  type ManagedPluginEntry,
  type PluginPhase,
  type StartupRunStatus
} from "./types.ts";

export interface OptimizationPlan {
  controlledIds: string[];
  managedPlugins: ManagedPluginEntry[];
  optimizerEnabled: boolean;
  originalEnabledPlugins: string[];
  lastRunStatus: StartupRunStatus;
}

export function computeOptimizationPlan(
  managedPlugins: ManagedPluginEntry[],
  baselineEnabledPluginIds: string[]
): OptimizationPlan {
  const controlledIds = baselineEnabledPluginIds.filter(pluginId => {
    const entry = managedPlugins.find(candidate => candidate.pluginId === pluginId);
    return entry?.phase === "idleLong";
  });

  return {
    controlledIds,
    managedPlugins: managedPlugins.map(entry => ({
      ...entry,
      disabledByOptimizer: controlledIds.includes(entry.pluginId),
      lastError: ""
    })),
    optimizerEnabled: controlledIds.length > 0,
    originalEnabledPlugins: [...baselineEnabledPluginIds],
    lastRunStatus: {
      ...createDefaultRunStatus(),
      state: controlledIds.length > 0 ? "idle" : "completed",
      message:
        controlledIds.length > 0
          ? `启动设置已保存，${controlledIds.length} 个插件会稍后加载。请重启 Obsidian 观察新的启动路径。`
          : "启动设置已保存。当前没有稍后加载插件。"
    }
  };
}

export function createStartupRunStatus(pendingPluginIds: string[]): StartupRunStatus {
  if (pendingPluginIds.length === 0) {
    return {
      ...createDefaultRunStatus(),
      state: "idle",
      message: "当前没有已激活的稍后加载插件。"
    };
  }

  return {
    state: "running",
    lastStartedAt: new Date().toISOString(),
    lastCompletedAt: "",
    pendingPluginIds: [...pendingPluginIds],
    completedPhases: [],
    message: `本次启动已安排 ${pendingPluginIds.length} 个稍后加载插件。`
  };
}

export function completePhaseStatus(
  status: StartupRunStatus,
  phase: PluginPhase
): StartupRunStatus {
  const completedPhases = status.completedPhases.includes(phase)
    ? status.completedPhases
    : [...status.completedPhases, phase];

  if (status.pendingPluginIds.length === 0) {
    return {
      ...status,
      completedPhases,
      state: "completed",
      lastCompletedAt: new Date().toISOString(),
      message: "稍后加载的插件已经完成。"
    };
  }

  return {
    ...status,
    completedPhases,
    message: `${PHASE_LABELS[phase]}已完成，仍有 ${status.pendingPluginIds.length} 个插件等待后续阶段加载。`
  };
}
