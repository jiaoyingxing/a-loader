export type PluginPhase = "early" | "idleLong";
export type StartupRunState = "idle" | "running" | "completed" | "paused" | "auto-paused";

export interface ManagedPluginEntry {
  pluginId: string;
  phase: PluginPhase;
  order: number;
  disabledByOptimizer: boolean;
  lastError: string;
}

export interface TimingSample {
  pluginId: string;
  pluginName: string;
  version: string;
  ms: number;
  capturedAt: string;
}

export interface StartupRunStatus {
  state: StartupRunState;
  lastStartedAt: string;
  lastCompletedAt: string;
  pendingPluginIds: string[];
  completedPhases: PluginPhase[];
  message: string;
}

export interface RibbonLayoutSnapshot {
  hiddenItems: Record<string, boolean>;
}

export interface RibbonLayoutSnapshots {
  desktop?: RibbonLayoutSnapshot;
  mobile?: RibbonLayoutSnapshot;
}

export interface ALoaderState {
  managedPlugins: ManagedPluginEntry[];
  originalEnabledPlugins: string[];
  ribbonLayoutSnapshots: RibbonLayoutSnapshots;
  timingSamples: TimingSample[];
  lastRunStatus: StartupRunStatus;
  pauseNextStartup: boolean;
  optimizerEnabled: boolean;
  interruptedStartupRuns: number;
}

export const PHASE_ORDER: PluginPhase[] = [
  "early",
  "idleLong"
];

export const PHASE_LABELS: Record<PluginPhase, string> = {
  early: "启动时加载",
  idleLong: "稍后加载"
};

export function createDefaultRunStatus(): StartupRunStatus {
  return {
    state: "idle",
    lastStartedAt: "",
    lastCompletedAt: "",
    pendingPluginIds: [],
    completedPhases: [],
    message: "还没有安排任何启动优化任务。"
  };
}

export function createDefaultState(): ALoaderState {
  return {
    managedPlugins: [],
    originalEnabledPlugins: [],
    ribbonLayoutSnapshots: {},
    timingSamples: [],
    lastRunStatus: createDefaultRunStatus(),
    pauseNextStartup: false,
    optimizerEnabled: false,
    interruptedStartupRuns: 0
  };
}

export function isPluginPhase(value: string): value is PluginPhase {
  return PHASE_ORDER.includes(value as PluginPhase);
}
