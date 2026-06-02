import esbuild from "esbuild";
import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const pluginId = "a-plugins";
const outputFile = path.join(rootDir, "main.js");
const configuredVaultRoot = process.env.A_PLUGINS_VAULT_ROOT;
const runtimeDir = configuredVaultRoot
  ? path.join(path.resolve(configuredVaultRoot), ".obsidian", "plugins", pluginId)
  : "";
const artifactSyncScript = process.env.OBSIDIAN_PLUGIN_ARTIFACT_SYNC_SCRIPT
  ? path.resolve(process.env.OBSIDIAN_PLUGIN_ARTIFACT_SYNC_SCRIPT)
  : path.join(rootDir, "scripts", "sync-runtime-artifacts.mjs");
const configuredRuntimeConfig = process.env.A_PLUGINS_RUNTIME_CONFIG;
const runtimeConfig = configuredRuntimeConfig
  ? path.resolve(configuredRuntimeConfig)
  : path.join(rootDir, "runtime-artifacts.local.json");

async function copySingleRuntimeAssets() {
  await mkdir(runtimeDir, { recursive: true });
  await Promise.all([
    copyFile(outputFile, path.join(runtimeDir, "main.js")),
    copyFile(path.join(rootDir, "manifest.json"), path.join(runtimeDir, "manifest.json")),
    copyFile(path.join(rootDir, "styles.css"), path.join(runtimeDir, "styles.css")),
    copyFile(path.join(rootDir, "versions.json"), path.join(runtimeDir, "versions.json"))
  ]);
}

async function syncRuntimeAssets() {
  if (existsSync(runtimeConfig) && existsSync(artifactSyncScript)) {
    const { syncRuntimeArtifacts } = await import(pathToFileURL(artifactSyncScript).href);
    const summary = await syncRuntimeArtifacts({
      projectRoot: rootDir,
      configFile: runtimeConfig
    });
    console.log(`Synced runtime artifacts to ${summary.targetCount} target(s).`);
    return;
  }

  if (existsSync(runtimeConfig) && !existsSync(artifactSyncScript)) {
    console.warn(`Runtime artifact sync script not found: ${artifactSyncScript}`);
  }

  if (configuredVaultRoot) {
    await copySingleRuntimeAssets();
    return;
  }

  console.log("Skipped runtime artifact sync; set A_PLUGINS_VAULT_ROOT or A_PLUGINS_RUNTIME_CONFIG to enable it.");
}

await esbuild.build({
  entryPoints: [path.join(rootDir, "src", "main.ts")],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
  outfile: outputFile,
  sourcemap: process.argv.includes("production") ? false : "inline",
  minify: process.argv.includes("production"),
  external: ["obsidian", "electron"],
  logLevel: "info"
});

await syncRuntimeAssets();
