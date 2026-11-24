'use client';

import { createContext, use, useCallback, useSyncExternalStore } from 'react';

import { readBlock, writeBlock } from '@/features/scan-config/store';

import type { ReactNode } from 'react';
import type { IScanConfigStore } from '@/features/scan-config/store';
import type { Config, ConfigValue } from '@/features/scan-config/types';

const ScanConfigStoreContext = createContext<IScanConfigStore | null>(null);

export function ScanConfigStoreProvider({
  store,
  children,
}: {
  store: IScanConfigStore;
  children: ReactNode;
}) {
  return <ScanConfigStoreContext value={store}>{children}</ScanConfigStoreContext>;
}

function useScanConfigStore(): IScanConfigStore {
  const store = use(ScanConfigStoreContext);
  if (!store) throw new Error('useScanConfigStore must be used inside a ScanConfigStoreProvider');
  return store;
}

/** Reads one slice of the config; the component re-renders only when that slice changes. */
export function useConfigValue<TSlice>(selector: (config: Config) => TSlice): TSlice {
  const store = useScanConfigStore();
  const getSlice = () => selector(store.getSnapshot());
  return useSyncExternalStore(store.subscribe, getSlice, getSlice);
}

export function useSetConfig(): IScanConfigStore['set'] {
  return useScanConfigStore().set;
}

/** One block of the config and its setter; `entry` selects one entry of a root dictionary. */
export function useBlockState(rootElement: string, entry?: string) {
  const { set } = useScanConfigStore();
  const state = useConfigValue((config) => readBlock(config, rootElement, entry));
  const setState = useCallback(
    (next: ConfigValue) => set((config) => writeBlock(config, rootElement, entry, next)),
    [set, rootElement, entry]
  );

  return [state, setState] as const;
}
