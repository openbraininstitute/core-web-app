import { isPlainObject } from '@/features/scan-config/components/utils';

import type { Config, ConfigValue } from '@/features/scan-config/types';

export type TConfigUpdate = Config | ((previous: Config) => Config);

export interface IScanConfigStore {
  getSnapshot: () => Config;
  subscribe: (listener: () => void) => () => void;
  /** An updater runs on the latest config, so updates made in a row never overwrite each other. */
  set: (update: TConfigUpdate) => void;
}

export function createScanConfigStore(initial: Config): IScanConfigStore {
  let config = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => config,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (update) => {
      const next = typeof update === 'function' ? update(config) : update;
      if (next === config) return;
      config = next;
      for (const listener of listeners) listener();
    },
  };
}

/** A root block, or one entry of a root dictionary when `entry` is given. */
export function readBlock(
  config: Config,
  rootElement: string,
  entry?: string
): ConfigValue | undefined {
  const root = config[rootElement];
  if (entry === undefined) return root;
  return isPlainObject(root) ? root[entry] : undefined;
}

/** Returns `config` itself when `entry` is given and its dictionary does not exist. */
export function writeBlock(
  config: Config,
  rootElement: string,
  entry: string | undefined,
  state: ConfigValue
): Config {
  if (entry === undefined) return { ...config, [rootElement]: state };
  const root = config[rootElement];
  if (!isPlainObject(root)) return config;
  return { ...config, [rootElement]: { ...root, [entry]: state } };
}

/**
 * A reader of one slice of the store. It returns the previous slice while the new one is equal,
 * so `useSyncExternalStore` sees no change and the component does not re-render.
 */
export function createSliceReader<TSlice>(
  store: IScanConfigStore,
  selector: (config: Config) => TSlice,
  isEqual: (previous: TSlice, next: TSlice) => boolean
): () => TSlice {
  let cached: { config: Config; slice: TSlice } | undefined;

  return () => {
    const config = store.getSnapshot();
    if (cached?.config === config) return cached.slice;
    const next = selector(config);
    const slice = cached && isEqual(cached.slice, next) ? cached.slice : next;
    cached = { config, slice };
    return slice;
  };
}
