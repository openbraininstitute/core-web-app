'use client';

import { isEqual } from 'es-toolkit';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { entryNames } from '@/features/scan-config/commands';
import { useConfigValidator } from '@/features/scan-config/components/hooks';
import {
  createDerivedReader,
  createReportedIssues,
  createSliceReader,
  entrySummariesOf,
  errorsUnder,
  isAtOrBelow,
  readBlock,
  writeBlock,
} from '@/features/scan-config/store';

import type { ErrorObject } from 'ajv';
import type { ReactNode } from 'react';
import type {
  Config,
  ConfigSchema,
  ConfigValue,
  IScanConfigIssues,
  IScanConfigStore,
  TConfigErrors,
  TEntrySummary,
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

const ScanConfigIssuesContext = createContext<IScanConfigIssues | null>(null);

/**
 * Holds every issue of the form for the readers below it: the schema errors, validated once per
 * config change, and the issues that fields report with `useReportIssue`.
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
  const [reported] = useState(createReportedIssues);
  const issues = useMemo(
    () => ({ getErrors: createSliceReader(store, validate, isEqual), reported }),
    [store, validate, reported]
  );

  return <ScanConfigIssuesContext value={issues}>{children}</ScanConfigIssuesContext>;
}

function useScanConfigIssues(): IScanConfigIssues {
  const issues = use(ScanConfigIssuesContext);
  if (!issues) {
    throw new Error('The issues of the form must be read inside a ScanConfigErrorsProvider');
  }
  return issues;
}

function useErrorsReader(): () => TConfigErrors {
  return useScanConfigIssues().getErrors;
}

export function useConfigErrors(): TConfigErrors {
  const getErrors = useErrorsReader();
  return useSyncExternalStore(useScanConfigStore().subscribe, getErrors, getErrors);
}

const toIssuePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

/**
 * Whether a path (`''` for the whole form, `/section`, `/section/entry`) has an issue, from the
 * schema or reported by a field; re-renders only when that flips.
 */
export function useHasIssues(path: string): boolean {
  const { subscribe: subscribeToConfig } = useScanConfigStore();
  const { getErrors, reported } = useScanConfigIssues();
  const subscribe = useCallback(
    (listener: () => void) => {
      const stopConfig = subscribeToConfig(listener);
      const stopReported = reported.subscribe(listener);
      return () => {
        stopConfig();
        stopReported();
      };
    },
    [subscribeToConfig, reported]
  );
  const hasIssues = () =>
    (getErrors()?.some((error) => isAtOrBelow(error.instancePath, path)) ?? false) ||
    [...reported.getSnapshot().keys()].some((reportedPath) => isAtOrBelow(reportedPath, path));

  return useSyncExternalStore(subscribe, hasIssues, hasIssues);
}

/**
 * Reports an issue the schema cannot express, for as long as the caller is mounted and gives a
 * message. A path without a leading slash is read as `/path`.
 */
export function useReportIssue(path: string | undefined, message: string | undefined) {
  const { reported } = useScanConfigIssues();

  useEffect(() => {
    if (!path) return;
    const issuePath = toIssuePath(path);
    reported.report(issuePath, message);
    return () => reported.report(issuePath, undefined);
  }, [reported, path, message]);
}

/** The issues reported by fields, message by path. */
export function useReportedIssues(): ReadonlyMap<string, string> {
  const { reported } = useScanConfigIssues();
  return useSyncExternalStore(reported.subscribe, reported.getSnapshot, reported.getSnapshot);
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
