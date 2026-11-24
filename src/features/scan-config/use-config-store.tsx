'use client';

import { createContext, use, useSyncExternalStore } from 'react';

import type { ReactNode } from 'react';
import type { IScanConfigStore } from '@/features/scan-config/store';
import type { Config } from '@/features/scan-config/types';

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
