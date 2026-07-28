import type {
  RibbonLayoutSnapshot,
  RibbonLayoutSnapshots
} from "./types.ts";

export type RibbonLayoutPlatform = keyof RibbonLayoutSnapshots;

export function normalizeRibbonLayoutSnapshots(value: unknown): RibbonLayoutSnapshots {
  if (!isRecord(value)) return {};

  const normalized: RibbonLayoutSnapshots = {};
  const desktop = normalizeRibbonLayoutSnapshot(value.desktop);
  const mobile = normalizeRibbonLayoutSnapshot(value.mobile);

  if (desktop) normalized.desktop = desktop;
  if (mobile) normalized.mobile = mobile;
  return normalized;
}

export function captureRibbonLayoutSnapshot(
  currentLayout: RibbonLayoutSnapshot,
  previousLayout: RibbonLayoutSnapshot | undefined,
  optimizerOwnedPluginIds: string[]
): RibbonLayoutSnapshot {
  const current = normalizeRibbonLayoutSnapshot(currentLayout) ?? { hiddenItems: {} };
  const previous = normalizeRibbonLayoutSnapshot(previousLayout);
  if (!previous) return current;

  const currentItemIds = new Set(Object.keys(current.hiddenItems));
  const previousOwnedItemIds = Object.keys(previous.hiddenItems).filter(itemId => {
    return belongsToPlugin(itemId, optimizerOwnedPluginIds);
  });

  if (previousOwnedItemIds.every(itemId => currentItemIds.has(itemId))) {
    return current;
  }

  const hiddenItems: Record<string, boolean> = {};
  for (const [itemId, wasHidden] of Object.entries(previous.hiddenItems)) {
    if (hasOwn(current.hiddenItems, itemId)) {
      hiddenItems[itemId] = current.hiddenItems[itemId];
    } else if (belongsToPlugin(itemId, optimizerOwnedPluginIds)) {
      hiddenItems[itemId] = wasHidden;
    }
  }

  for (const [itemId, isHidden] of Object.entries(current.hiddenItems)) {
    if (!hasOwn(hiddenItems, itemId)) {
      hiddenItems[itemId] = isHidden;
    }
  }

  return { hiddenItems };
}

export function restoreOwnedRibbonLayoutSnapshot(
  currentLayout: RibbonLayoutSnapshot,
  savedLayout: RibbonLayoutSnapshot | undefined,
  optimizerOwnedPluginIds: string[]
): RibbonLayoutSnapshot | null {
  const current = normalizeRibbonLayoutSnapshot(currentLayout) ?? { hiddenItems: {} };
  const saved = normalizeRibbonLayoutSnapshot(savedLayout);
  if (!saved) return null;

  const currentItemIds = new Set(Object.keys(current.hiddenItems));
  const hasRestorableOwnedItem = Object.keys(saved.hiddenItems).some(itemId => {
    return currentItemIds.has(itemId)
      && belongsToPlugin(itemId, optimizerOwnedPluginIds);
  });
  if (!hasRestorableOwnedItem) return null;

  const hiddenItems: Record<string, boolean> = {};
  for (const [itemId, savedHidden] of Object.entries(saved.hiddenItems)) {
    if (!currentItemIds.has(itemId)) continue;

    hiddenItems[itemId] = belongsToPlugin(itemId, optimizerOwnedPluginIds)
      ? savedHidden
      : current.hiddenItems[itemId];
  }

  for (const [itemId, currentHidden] of Object.entries(current.hiddenItems)) {
    if (!hasOwn(hiddenItems, itemId)) {
      hiddenItems[itemId] = currentHidden;
    }
  }

  const restored = { hiddenItems };
  return haveSameRibbonLayout(current, restored) ? null : restored;
}

function normalizeRibbonLayoutSnapshot(value: unknown): RibbonLayoutSnapshot | null {
  if (!isRecord(value) || !isRecord(value.hiddenItems)) return null;

  const hiddenItems: Record<string, boolean> = {};
  for (const [itemId, isHidden] of Object.entries(value.hiddenItems)) {
    if (typeof isHidden === "boolean") {
      hiddenItems[itemId] = isHidden;
    }
  }
  return { hiddenItems };
}

function belongsToPlugin(itemId: string, pluginIds: string[]): boolean {
  return pluginIds.some(pluginId => itemId.startsWith(`${pluginId}:`));
}

function haveSameRibbonLayout(
  left: RibbonLayoutSnapshot,
  right: RibbonLayoutSnapshot
): boolean {
  const leftEntries = Object.entries(left.hiddenItems);
  const rightEntries = Object.entries(right.hiddenItems);
  if (leftEntries.length !== rightEntries.length) return false;

  return leftEntries.every(([itemId, isHidden], index) => {
    const rightEntry = rightEntries[index];
    return rightEntry?.[0] === itemId && rightEntry[1] === isHidden;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, boolean>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
