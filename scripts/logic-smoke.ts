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

const currentDir = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(dirname(currentDir), "manifest.json"), "utf8")
) as { id: string; version: string };

if (manifest.id !== "a-loader" || manifest.version !== "0.4.4") {
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
if (!summary || summary.count !== 4 || summary.ms !== 25) {
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

console.log("logic-smoke: ok");
