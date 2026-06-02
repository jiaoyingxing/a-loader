import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ARTIFACTS = ["main.js", "manifest.json", "styles.css", "versions.json"];
const DEFAULT_REQUIRED_ARTIFACTS = ["main.js", "manifest.json"];

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readPluginId(projectRoot) {
  const manifest = await readJson(path.join(projectRoot, "manifest.json"));
  if (!manifest.id || typeof manifest.id !== "string") {
    throw new Error("manifest.json is missing a string id.");
  }
  return manifest.id;
}

function normalizeTarget(target, pluginId) {
  const rawPath = typeof target === "string"
    ? target
    : target?.pluginDir ?? target?.runtime ?? target?.vault ?? target?.path;

  if (!rawPath || typeof rawPath !== "string") {
    throw new Error("Runtime target must be a vault path or plugin directory path.");
  }

  const resolved = path.resolve(rawPath);
  if (typeof target === "object" && (target.pluginDir || target.runtime)) {
    return resolved;
  }
  if (typeof target === "object" && target.vault) {
    return path.join(resolved, ".obsidian", "plugins", pluginId);
  }

  const base = path.basename(resolved).toLowerCase();
  const parent = path.basename(path.dirname(resolved)).toLowerCase();
  const grandparent = path.basename(path.dirname(path.dirname(resolved))).toLowerCase();
  const pluginIdLower = pluginId.toLowerCase();

  if (base === pluginIdLower && parent === "plugins" && grandparent === ".obsidian") {
    return resolved;
  }
  if (base === "plugins" && parent === ".obsidian") {
    return path.join(resolved, pluginId);
  }
  if (base === ".obsidian") {
    return path.join(resolved, "plugins", pluginId);
  }
  return path.join(resolved, ".obsidian", "plugins", pluginId);
}

function samePath(left, right) {
  const leftResolved = path.resolve(left);
  const rightResolved = path.resolve(right);
  return process.platform === "win32"
    ? leftResolved.toLowerCase() === rightResolved.toLowerCase()
    : leftResolved === rightResolved;
}

export async function syncRuntimeArtifacts(input = {}) {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  const configFile = input.configFile ? path.resolve(input.configFile) : "";
  const config = configFile ? await readJson(configFile) : {};
  const pluginId = input.pluginId ?? config.pluginId ?? await readPluginId(projectRoot);
  const targets = input.targets ?? config.targets ?? [];
  const artifacts = input.artifacts ?? config.artifacts ?? DEFAULT_ARTIFACTS;
  const requiredArtifacts = new Set(input.requiredArtifacts ?? config.requiredArtifacts ?? DEFAULT_REQUIRED_ARTIFACTS);

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("No runtime targets configured.");
  }

  const availableArtifacts = [];
  for (const artifactName of artifacts) {
    const artifactPath = path.resolve(projectRoot, artifactName);
    if (existsSync(artifactPath)) {
      availableArtifacts.push({ name: artifactName, path: artifactPath });
    } else if (requiredArtifacts.has(artifactName)) {
      throw new Error(`Required artifact is missing: ${artifactName}`);
    }
  }

  for (const target of targets) {
    const pluginDir = normalizeTarget(target, pluginId);
    await mkdir(pluginDir, { recursive: true });
    for (const artifact of availableArtifacts) {
      const destination = path.join(pluginDir, artifact.name);
      if (!samePath(artifact.path, destination)) {
        await copyFile(artifact.path, destination);
      }
    }
  }

  return {
    pluginId,
    targetCount: targets.length,
    copiedCount: availableArtifacts.length * targets.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projectRoot = process.argv[2] ?? process.cwd();
  const configFile = process.argv[3] ?? "";
  const summary = await syncRuntimeArtifacts({ projectRoot, configFile });
  console.log(`Synced runtime artifacts to ${summary.targetCount} target(s).`);
}
