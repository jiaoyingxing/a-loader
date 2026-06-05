import type { PluginManifest } from "obsidian";
import type { InternalApp } from "./internal-types";
import type {
  ManagedPluginEntry,
  PluginPhase,
  ALoaderState,
  TimingSample
} from "./types";
import { PHASE_ORDER } from "./types.ts";

const MAX_TIMING_SAMPLES_PER_PLUGIN = 20;
const LEGACY_DELAYED_PHASES = new Set(["layoutReady", "idleShort", "idleLong", "manual"]);

export interface TimingSummary {
  count: number;
  latestMs: number;
  averageMs: number;
  latestCapturedAt: string;
}

export interface EnabledPluginStateEntry {
  pluginId: string;
  disabledByOptimizer: boolean;
  lastError?: string;
}

export interface ResolveEnabledPluginIdsInput {
  pluginIds: string[];
  entries: EnabledPluginStateEntry[];
  originalEnabledPluginIds: string[];
  liveEnabledPluginIds: string[];
  loadedPluginIds: string[];
  pendingPluginIds: string[];
}

export function collectCommunityPluginManifests(
  app: InternalApp,
  selfPluginId: string
): PluginManifest[] {
  return Object.values(app.plugins.manifests)
    .filter(manifest => manifest.id !== selfPluginId)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
}

export function normalizeManagedPlugins(
  manifests: PluginManifest[],
  existingEntries: ManagedPluginEntry[]
): ManagedPluginEntry[] {
  const existingById = new Map(existingEntries.map(entry => [entry.pluginId, entry]));

  return manifests.map((manifest, index) => {
    const existing = existingById.get(manifest.id);
    if (existing) {
      const legacyEntry = existing as ManagedPluginEntry & {
        pinnedEarly?: boolean;
        phase?: string;
      };
      const legacyPinnedEarly = Boolean(legacyEntry.pinnedEarly);
      const rawPhase = legacyEntry.phase ?? "early";
      const phase: PluginPhase = legacyPinnedEarly
        ? "early"
        : normalizePhase(rawPhase);

      return {
        pluginId: manifest.id,
        phase,
        order: Number.isFinite(existing.order) ? existing.order : index,
        disabledByOptimizer: Boolean(existing.disabledByOptimizer),
        lastError: existing.lastError ?? ""
      };
    }

      return {
        pluginId: manifest.id,
        phase: "early",
        order: index,
        disabledByOptimizer: false,
        lastError: ""
      };
  });
}

export function resolveVisibleEnabledPluginIds(input: ResolveEnabledPluginIdsInput): string[] {
  const pluginIdSet = new Set(input.pluginIds);
  const liveEnabled = new Set(
    input.liveEnabledPluginIds.filter(pluginId => pluginIdSet.has(pluginId))
  );
  const originalEnabled = new Set(input.originalEnabledPluginIds);
  const loadedPlugins = new Set(input.loadedPluginIds);
  const pendingPlugins = new Set(input.pendingPluginIds);
  const entriesById = new Map(input.entries.map(entry => [entry.pluginId, entry]));
  const enabled = new Set<string>(liveEnabled);

  for (const pluginId of input.pluginIds) {
    const entry = entriesById.get(pluginId);
    if (!entry?.disabledByOptimizer || !originalEnabled.has(pluginId)) continue;

    const stillOwnedByOptimizer =
      loadedPlugins.has(pluginId)
      || pendingPlugins.has(pluginId)
      || Boolean(entry.lastError);

    if (stillOwnedByOptimizer) {
      enabled.add(pluginId);
    }
  }

  return input.pluginIds.filter(pluginId => enabled.has(pluginId));
}

export function formatMs(ms: number): string {
  return `${Math.round(ms).toLocaleString()}ms`;
}

export function addTimingSample(
  existingSamples: TimingSample[],
  sample: TimingSample
): TimingSample[] {
  return normalizeTimingSamples([...existingSamples, sample]);
}

export function normalizeTimingSamples(samples: TimingSample[]): TimingSample[] {
  const grouped = new Map<string, TimingSample[]>();

  for (const sample of samples) {
    if (!isUsableTimingSample(sample)) continue;

    const pluginSamples = grouped.get(sample.pluginId) ?? [];
    pluginSamples.push(sample);
    grouped.set(sample.pluginId, pluginSamples);
  }

  const normalized: TimingSample[] = [];
  for (const pluginSamples of grouped.values()) {
    normalized.push(
      ...pluginSamples
        .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
        .slice(0, MAX_TIMING_SAMPLES_PER_PLUGIN)
    );
  }

  return normalized.sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
}

function normalizePhase(rawPhase: string): PluginPhase {
  if (PHASE_ORDER.includes(rawPhase as PluginPhase)) {
    return rawPhase as PluginPhase;
  }

  return LEGACY_DELAYED_PHASES.has(rawPhase) ? "idleLong" : "early";
}

export function getTimingSummary(
  pluginId: string,
  state: ALoaderState
): TimingSummary | null {
  const samples = state.timingSamples
    .filter(sample => sample.pluginId === pluginId)
    .filter(isUsableTimingSample);

  if (samples.length === 0) return null;

  const average =
    samples.reduce((total, sample) => total + sample.ms, 0) / samples.length;
  const latestSample = samples
    .slice()
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0];

  return {
    count: samples.length,
    latestMs: latestSample.ms,
    averageMs: average,
    latestCapturedAt: latestSample.capturedAt
  };
}

function isUsableTimingSample(sample: TimingSample): boolean {
  const legacySource = (sample as TimingSample & { source?: string }).source;
  return (
    legacySource !== "official-report"
    && Boolean(sample.pluginId)
    && Number.isFinite(sample.ms)
    && sample.ms >= 0
    && Boolean(sample.capturedAt)
  );
}
