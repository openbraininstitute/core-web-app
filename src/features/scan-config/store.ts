import type { Config } from '@/features/scan-config/types';

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
