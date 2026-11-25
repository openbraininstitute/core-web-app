'use client';

import { isEqual } from 'es-toolkit';
import { createContext, use, useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { entryNames } from '@/features/scan-config/commands';
import { useValidateSchema } from '@/features/scan-config/components/hooks';
import { createSliceReader, readBlock, writeBlock } from '@/features/scan-config/store';

import type { ReactNode } from 'react';
import type {
  Config,
  ConfigSchema,
  ConfigValue,
  IScanConfigStore,
  TConfigErrors,
} from '@/features/scan-config/types';

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

/**
 * Reads one slice of the config; the component re-renders only when that slice changes.
 * Pass `isEqual` when the selector builds a new value each time (a list of names, a filter).
 */
export function useConfigValue<TSlice>(
  selector: (config: Config) => TSlice,
  isEqual: (previous: TSlice, next: TSlice) => boolean = Object.is
): TSlice {
  const store = useScanConfigStore();
  const getSlice = useMemo(
    () => createSliceReader(store, selector, isEqual),
    [store, selector, isEqual]
  );

  return useSyncExternalStore(store.subscribe, getSlice, getSlice);
}

const wholeConfig = (config: Config) => config;

/** The whole config: the caller re-renders on every edit. Prefer `useConfigValue` with a slice. */
export function useWholeConfig(): Config {
  return useConfigValue(wholeConfig);
}

const ScanConfigErrorsContext = createContext<TConfigErrors | undefined>(undefined);

/** Validates the config against the schema in one place; read the result with `useConfigErrors`. */
export function ScanConfigErrorsProvider({
  schema,
  initialConfig,
  children,
}: {
  schema: ConfigSchema;
  initialConfig?: Config;
  children: ReactNode;
}) {
  const config = useWholeConfig();
  const errors = useValidateSchema({ initialConfig, config, schema });
  const [stableErrors, setStableErrors] = useState(errors);
  if (!isEqual(stableErrors, errors)) setStableErrors(errors);

  return <ScanConfigErrorsContext value={stableErrors}>{children}</ScanConfigErrorsContext>;
}

export function useConfigErrors(): TConfigErrors {
  const errors = use(ScanConfigErrorsContext);
  if (errors === undefined) {
    throw new Error('useConfigErrors must be used inside a ScanConfigErrorsProvider');
  }
  return errors;
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

const sameNames = (previous: Set<string>, next: Set<string>) =>
  previous.size === next.size && [...next].every((name) => previous.has(name));

/** Every entry name in use; the caller re-renders only when a name is added, removed or renamed. */
export function useEntryNames(schema: ConfigSchema): Set<string> {
  const selectNames = useCallback((config: Config) => entryNames(config, schema), [schema]);
  return useConfigValue(selectNames, sameNames);
}
