import type { App, PluginManifest } from "obsidian";

export interface InternalPluginManager {
  manifests: Record<string, PluginManifest>;
  plugins: Record<string, unknown>;
  enabledPlugins: Set<string>;
  requestSaveConfig(): void;
  enablePlugin(pluginId: string, flag?: boolean): Promise<boolean>;
  disablePlugin(pluginId: string, flag?: boolean): Promise<void>;
}

export interface InternalCorePluginManager {
  getEnabledPlugins(): string[];
}

export interface InternalSettingManager {
  open(): void;
  openTabById(id: string): void;
}

export interface InternalApp extends App {
  plugins: InternalPluginManager;
  internalPlugins: InternalCorePluginManager;
  setting?: InternalSettingManager;
}

