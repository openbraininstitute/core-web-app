'use client';

import { isEqual } from 'es-toolkit';
import { createContext, use, useCallback, useMemo, useSyncExternalStore } from 'react';

import { entryNames } from '@/features/scan-config/commands';
import { useConfigValidator } from '@/features/scan-config/components/hooks';
import { errorsUnder } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import {
  createDerivedReader,
  createSliceReader,
  entrySummariesOf,
  readBlock,
  writeBlock,
} from '@/features/scan-config/store';

import type { ErrorObject } from 'ajv';
import type { ReactNode } from 'react';
import type { IScanConfigStore, TEntrySummary } from '@/features/scan-config/store';
import type { Config, ConfigSchema, ConfigValue } from '@/features/scan-config/types';

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

type TConfigErrors = ErrorObject[] | null;

const ScanConfigErrorsContext = createContext<(() => TConfigErrors) | null>(null);

/**
 * Validates the config against the schema once per change, for every reader below it.
 * Read the result with `useConfigErrors` or `useHasConfigErrors`.
 */
export function ScanConfigErrorsProvider({
  schema,
  initialConfig,
  children,
}: {
  schema: ConfigSchema;
  initialConfig?: Config;
  children: ReactNode;
}) {
  const store = useScanConfigStore();
  const validate = useConfigValidator({ initialConfig, schema });
  const getErrors = useMemo(() => createSliceReader(store, validate, isEqual), [store, validate]);

  return <ScanConfigErrorsContext value={getErrors}>{children}</ScanConfigErrorsContext>;
}

function useErrorsReader(): () => TConfigErrors {
  const getErrors = use(ScanConfigErrorsContext);
  if (!getErrors) {
    throw new Error('useConfigErrors must be used inside a ScanConfigErrorsProvider');
  }
  return getErrors;
}

export function useConfigErrors(): TConfigErrors {
  const getErrors = useErrorsReader();
  return useSyncExternalStore(useScanConfigStore().subscribe, getErrors, getErrors);
}

/** Whether a path (`/section` or `/section/entry`) has schema errors; re-renders only when that flips. */
export function useHasConfigErrors(pathPrefix: string): boolean {
  const getErrors = useErrorsReader();
  const hasErrors = () =>
    getErrors()?.some((error) => error.instancePath.startsWith(pathPrefix)) ?? false;
  return useSyncExternalStore(useScanConfigStore().subscribe, hasErrors, hasErrors);
}

/** The errors at or below a path, with paths relative to it; re-renders only when they change. */
export function useConfigErrorsUnder(path: string): ErrorObject[] {
  const getErrors = useErrorsReader();
  const getSlice = useMemo(
    () => createDerivedReader(getErrors, (errors) => errorsUnder(errors, path), isEqual),
    [getErrors, path]
  );
  return useSyncExternalStore(useScanConfigStore().subscribe, getSlice, getSlice);
}

export function useSetConfig(): IScanConfigStore['set'] {
  return useScanConfigStore().set;
}

/** Reads the latest config when called, for event handlers; the component does not subscribe. */
export function useGetConfig(): () => Config {
  return useScanConfigStore().getSnapshot;
}

const sameSummaries = (previous: TEntrySummary[], next: TEntrySummary[]) =>
  previous.length === next.length &&
  next.every((entry, index) => {
    const before = previous[index];
    return before?.name === entry.name && before.type === entry.type;
  });

/** The entries of one section, by name and type; re-renders only when that list changes. */
export function useEntrySummaries(rootElement: string): TEntrySummary[] {
  const select = useCallback(
    (config: Config) => entrySummariesOf(config[rootElement]),
    [rootElement]
  );
  return useConfigValue(select, sameSummaries);
}

/** The entries of each given dictionary, by name and type; re-renders only when one of the lists changes. */
export function useDictionaryEntries(dictionaries: string[]): Record<string, TEntrySummary[]> {
  const signature = dictionaries.join('\n');
  const select = useCallback(
    (config: Config) =>
      Object.fromEntries(signature.split('\n').map((key) => [key, entrySummariesOf(config[key])])),
    [signature]
  );
  return useConfigValue(select, isEqual);
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
