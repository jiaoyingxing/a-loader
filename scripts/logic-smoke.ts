import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PluginManifest } from "obsidian";
import {
  addTimingSample,
  getTimingSummary,
  normalizeManagedPlugins,
  normalizeTimingSamples,
  resolveVisibleEnabledPluginIds
} from "../src/plugin-registry.ts";
import {
  captureRibbonLayoutSnapshot,
  normalizeRibbonLayoutSnapshots,
  restoreOwnedRibbonLayoutSnapshot
} from "../src/ribbon-layout.ts";
import {
  armOwnedPluginIdsForDelayedLoad,
  completePhaseStatus,
  computeOptimizationPlan,
  createStartupRunStatus,
  getOptimizerOwnedPluginIds,
  restoreOwnedPluginIds,
  shouldRearmAfterPausedStartup
} from "../src/startup-plan.ts";

const currentDir = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(dirname(currentDir), "manifest.json"), "utf8")
) as { id: string; version: string };

if (manifest.id !== "a-plugins" || !manifest.version) {
  throw new Error(`Unexpected manifest metadata: ${JSON.stringify(manifest)}`);
}

const normalizedEntries = normalizeManagedPlugins(
  [
    { id: "alpha-plugin", name: "Alpha Plugin", version: "1.0.0" },
    { id: "beta-plugin", name: "Beta Plugin", version: "1.0.0" }
  ] as PluginManifest[],
  [
    {
      pluginId: "alpha-plugin",
      phase: "manual",
      order: 9,
      pinnedEarly: true,
      managedByOptimizer: false,
      disabledByOptimizer: true,
      lastError: "old error"
    },
    {
      pluginId: "beta-plugin",
      phase: "idleShort",
      order: 3,
      managedByOptimizer: false,
      disabledByOptimizer: false,
      lastError: ""
    }
  ] as never
);

if (normalizedEntries[0]?.phase !== "early") {
  throw new Error("Legacy pinnedEarly should migrate to phase=early.");
}

if ("managedByOptimizer" in (normalizedEntries[0] as unknown as Record<string, unknown>)) {
  throw new Error("Legacy managedByOptimizer should not remain in normalized entries.");
}

if (normalizedEntries[1]?.phase !== "idleLong") {
  throw new Error("Legacy delayed phases should collapse to the public delayed phase.");
}

const accumulatedSamples = [10, 30, 20, 500].reduce(
  (samples, ms, index) => addTimingSample(samples, {
    pluginId: "beta-plugin",
    pluginName: "Beta Plugin",
    version: "1.0.0",
    ms,
    capturedAt: new Date(2026, 0, index + 1).toISOString()
  }),
  [] as ReturnType<typeof normalizeTimingSamples>
);

const summary = getTimingSummary("beta-plugin", { timingSamples: accumulatedSamples } as never);
if (
  !summary
  || summary.count !== 4
  || summary.latestMs !== 500
  || summary.averageMs !== 140
) {
  throw new Error(`Unexpected timing summary: ${JSON.stringify(summary)}`);
}

const withLegacyOfficialSample = normalizeTimingSamples([
  ...accumulatedSamples,
  {
    source: "official-report",
    pluginId: "beta-plugin",
    pluginName: "Beta Plugin",
    version: "1.0.0",
    ms: 999,
    capturedAt: new Date(2026, 0, 5).toISOString()
  } as never
]);

if (withLegacyOfficialSample.length !== accumulatedSamples.length) {
  throw new Error("Legacy official-report timing samples should be discarded.");
}

const visibleEnabled = resolveVisibleEnabledPluginIds({
  pluginIds: ["early-plugin", "delayed-plugin", "externally-disabled-plugin"],
  entries: [
    {
      pluginId: "early-plugin",
      disabledByOptimizer: false
    },
    {
      pluginId: "delayed-plugin",
      disabledByOptimizer: true
    },
    {
      pluginId: "externally-disabled-plugin",
      disabledByOptimizer: false
    }
  ],
  originalEnabledPluginIds: [
    "early-plugin",
    "delayed-plugin",
    "externally-disabled-plugin"
  ],
  liveEnabledPluginIds: ["early-plugin"],
  loadedPluginIds: [],
  pendingPluginIds: ["delayed-plugin"]
});

if (
  visibleEnabled.includes("externally-disabled-plugin")
  || !visibleEnabled.includes("early-plugin")
  || !visibleEnabled.includes("delayed-plugin")
) {
  throw new Error(`Unexpected visible enabled plugins: ${JSON.stringify(visibleEnabled)}`);
}

const plan = computeOptimizationPlan(
  [
    {
      pluginId: "early-plugin",
      phase: "early",
      order: 0,
      disabledByOptimizer: false,
      lastError: "stale"
    },
    {
      pluginId: "delayed-plugin",
      phase: "idleLong",
      order: 1,
      disabledByOptimizer: false,
      lastError: ""
    }
  ],
  ["early-plugin", "delayed-plugin"]
);

if (
  !plan.optimizerEnabled
  || plan.controlledIds.length !== 1
  || plan.controlledIds[0] !== "delayed-plugin"
  || plan.lastRunStatus.state !== "idle"
  || !plan.managedPlugins.find(entry => entry.pluginId === "delayed-plugin")?.disabledByOptimizer
  || plan.managedPlugins.find(entry => entry.pluginId === "early-plugin")?.lastError !== ""
) {
  throw new Error(`Unexpected optimization plan: ${JSON.stringify(plan)}`);
}

const runStatus = createStartupRunStatus(["delayed-plugin", "second-plugin"]);
if (
  runStatus.state !== "running"
  || runStatus.pendingPluginIds.length !== 2
  || runStatus.completedPhases.length !== 0
) {
  throw new Error(`Unexpected startup run status: ${JSON.stringify(runStatus)}`);
}

const completedRunStatus = completePhaseStatus(
  {
    ...runStatus,
    pendingPluginIds: []
  },
  "idleLong"
);

if (
  completedRunStatus.state !== "completed"
  || completedRunStatus.completedPhases[0] !== "idleLong"
  || !completedRunStatus.lastCompletedAt
) {
  throw new Error(`Unexpected completed phase status: ${JSON.stringify(completedRunStatus)}`);
}

const optimizerOwnedPluginIds = getOptimizerOwnedPluginIds(
  plan.managedPlugins,
  plan.originalEnabledPlugins
);
const restoredEnabledPluginIds = restoreOwnedPluginIds(
  ["a-plugins", "user-enabled-later"],
  optimizerOwnedPluginIds
);

if (
  !restoredEnabledPluginIds.includes("delayed-plugin")
  || !restoredEnabledPluginIds.includes("user-enabled-later")
) {
  throw new Error(
    `Restoring optimizer-owned plugins must preserve unrelated enabled plugins: ${JSON.stringify(restoredEnabledPluginIds)}`
  );
}

const rearmedEnabledPluginIds = armOwnedPluginIdsForDelayedLoad(
  restoredEnabledPluginIds,
  optimizerOwnedPluginIds
);
if (
  rearmedEnabledPluginIds.includes("delayed-plugin")
  || !rearmedEnabledPluginIds.includes("user-enabled-later")
) {
  throw new Error(
    `Rearming delayed loading must remove only optimizer-owned plugins: ${JSON.stringify(rearmedEnabledPluginIds)}`
  );
}

if (
  shouldRearmAfterPausedStartup(true, "paused", true)
  || !shouldRearmAfterPausedStartup(true, "paused", false)
) {
  throw new Error("A paused startup must be rearmed only after the one-shot pause is consumed.");
}

const ribbonSnapshot = {
  hiddenItems: {
    "switcher:Open quick switcher": false,
    "delayed-plugin:Open delayed plugin": true,
    "graph:Open graph": false,
    "second-delayed-plugin:Open second delayed plugin": false
  }
};
const ribbonWithoutDelayedPlugins = {
  hiddenItems: {
    "switcher:Open quick switcher": false,
    "graph:Open graph": true,
    "new-plugin:Open new plugin": false
  }
};
const capturedIncompleteRibbon = captureRibbonLayoutSnapshot(
  ribbonWithoutDelayedPlugins,
  ribbonSnapshot,
  ["delayed-plugin", "second-delayed-plugin"]
);

if (
  Object.keys(capturedIncompleteRibbon.hiddenItems).join("|")
    !== [
      "switcher:Open quick switcher",
      "delayed-plugin:Open delayed plugin",
      "graph:Open graph",
      "second-delayed-plugin:Open second delayed plugin",
      "new-plugin:Open new plugin"
    ].join("|")
  || capturedIncompleteRibbon.hiddenItems["graph:Open graph"] !== true
) {
  throw new Error(
    `An incomplete startup ribbon must retain missing owned items and live unrelated visibility: ${JSON.stringify(capturedIncompleteRibbon)}`
  );
}

const completeCurrentRibbon = {
  hiddenItems: {
    "graph:Open graph": true,
    "delayed-plugin:Open delayed plugin": false,
    "switcher:Open quick switcher": false,
    "second-delayed-plugin:Open second delayed plugin": true
  }
};
const capturedCompleteRibbon = captureRibbonLayoutSnapshot(
  completeCurrentRibbon,
  ribbonSnapshot,
  ["delayed-plugin", "second-delayed-plugin"]
);
if (
  JSON.stringify(capturedCompleteRibbon) !== JSON.stringify(completeCurrentRibbon)
) {
  throw new Error(
    `A complete live ribbon must replace the older snapshot so later user changes survive restart: ${JSON.stringify(capturedCompleteRibbon)}`
  );
}

const ribbonAfterDelayedPluginsRegister = {
  hiddenItems: {
    "switcher:Open quick switcher": false,
    "graph:Open graph": true,
    "new-plugin:Open new plugin": false,
    "delayed-plugin:Open delayed plugin": false,
    "second-delayed-plugin:Open second delayed plugin": false
  }
};
const restoredRibbon = restoreOwnedRibbonLayoutSnapshot(
  ribbonAfterDelayedPluginsRegister,
  ribbonSnapshot,
  ["delayed-plugin", "second-delayed-plugin"]
);

if (
  !restoredRibbon
  || Object.keys(restoredRibbon.hiddenItems).join("|")
    !== [
      "switcher:Open quick switcher",
      "delayed-plugin:Open delayed plugin",
      "graph:Open graph",
      "second-delayed-plugin:Open second delayed plugin",
      "new-plugin:Open new plugin"
    ].join("|")
  || restoredRibbon.hiddenItems["delayed-plugin:Open delayed plugin"] !== true
  || restoredRibbon.hiddenItems["graph:Open graph"] !== true
) {
  throw new Error(
    `Restoring delayed ribbon items must recover owned visibility and order while preserving unrelated live visibility: ${JSON.stringify(restoredRibbon)}`
  );
}

const normalizedPlatformRibbonSnapshots = normalizeRibbonLayoutSnapshots({
  desktop: ribbonSnapshot,
  mobile: {
    hiddenItems: {
      "delayed-plugin:Open delayed plugin": false,
      invalid: "true"
    }
  }
});
if (
  normalizedPlatformRibbonSnapshots.desktop?.hiddenItems[
    "delayed-plugin:Open delayed plugin"
  ] !== true
  || normalizedPlatformRibbonSnapshots.mobile?.hiddenItems.invalid !== undefined
  || normalizedPlatformRibbonSnapshots.mobile?.hiddenItems[
    "delayed-plugin:Open delayed plugin"
  ] !== false
) {
  throw new Error(
    `Desktop and mobile ribbon snapshots must stay isolated and normalized: ${JSON.stringify(normalizedPlatformRibbonSnapshots)}`
  );
}

console.log("logic-smoke: ok");
