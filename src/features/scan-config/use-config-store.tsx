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
import { errorsUnder } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { fieldIssuesOf, issueAt } from '@/features/scan-config/issues';
import {
  createBlockScope,
  createDerivedReader,
  createReportedIssues,
  createSliceReader,
  entrySummariesOf,
  isAtOrBelow,
  readBlock,
  withField,
  writeBlock,
} from '@/features/scan-config/store';

import type { ErrorObject } from 'ajv';
import type { ReactNode } from 'react';
import type { TFieldIssue } from '@/features/scan-config/issues';
import type {
  IBlockScope,
  IReportedIssues,
  IScanConfigStore,
  TBlockState,
  TEntrySummary,
} from '@/features/scan-config/store';
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

interface IScanConfigIssues {
  getErrors: () => TConfigErrors;
  getFieldIssues: () => TFieldIssue[];
  reported: IReportedIssues;
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
  const issues = useMemo(() => {
    const getErrors = createSliceReader(store, validate, isEqual);
    const getFieldIssues = createSliceReader(
      store,
      (config) => fieldIssuesOf(getErrors(), config),
      isEqual
    );
    return { getErrors, getFieldIssues, reported };
  }, [store, validate, reported]);

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

/** Subscribes to both sources of issues: the config (schema errors) and the reported issues. */
function useIssuesSubscription() {
  const { subscribe: subscribeToConfig } = useScanConfigStore();
  const { reported } = useScanConfigIssues();

  return useCallback(
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
}

/**
 * Whether a path (`''` for the whole form, `/section`, `/section/entry`) has an issue, from the
 * schema or reported by a field; re-renders only when that flips.
 */
export function useHasIssues(path: string): boolean {
  const { getErrors, reported } = useScanConfigIssues();
  const subscribe = useIssuesSubscription();
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

/**
 * The schema issue to show at a field, or `undefined`; re-renders only when that message changes.
 * Issues a field reports itself are not here: the field shows those.
 */
export function useFieldIssue(path: string | undefined): string | undefined {
  const { getFieldIssues } = useScanConfigIssues();
  const getMessage = () => (path === undefined ? undefined : issueAt(getFieldIssues(), path));

  return useSyncExternalStore(useScanConfigStore().subscribe, getMessage, getMessage);
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

/** Whether a root block, or one entry of a root dictionary, exists as an object. */
export function useHasBlock(rootElement: string, entry?: string): boolean {
  const select = useCallback(
    (config: Config) => isPlainObject(readBlock(config, rootElement, entry)),
    [rootElement, entry]
  );
  return useConfigValue(select);
}

/** One property of a block (its `type`, say); re-renders only when that property changes. */
export function useBlockProperty(
  rootElement: string,
  entry: string | undefined,
  key: string
): ConfigValue | undefined {
  const select = useCallback(
    (config: Config) => {
      const block = readBlock(config, rootElement, entry);
      return isPlainObject(block) ? block[key] : undefined;
    },
    [rootElement, entry, key]
  );
  return useConfigValue(select);
}

const BlockScopeContext = createContext<IBlockScope | null>(null);

/**
 * Gives the fields below it one block to read and write. With a `preview`, fields read it instead
 * of the stored block.
 */
export function BlockScopeProvider({
  rootElement,
  entry,
  preview,
  children,
}: {
  rootElement: string;
  entry?: string;
  preview?: TBlockState | null;
  children: ReactNode;
}) {
  const store = useScanConfigStore();
  const scope = useMemo(() => {
    const stored = createBlockScope(store, rootElement, entry);
    return preview ? { ...stored, getSnapshot: () => preview } : stored;
  }, [store, rootElement, entry, preview]);

  return <BlockScopeContext value={scope}>{children}</BlockScopeContext>;
}

const noSubscription = () => () => {};

/**
 * A block scope over a block held in props (a nested object): fields below read `state` and
 * write the whole block back with `setState`. They re-render when the props change.
 */
export function PropsBlockScopeProvider({
  state,
  setState,
  children,
}: {
  state: TBlockState;
  setState: (next: TBlockState) => void;
  children: ReactNode;
}) {
  const scope = useMemo<IBlockScope>(
    () => ({
      getSnapshot: () => state,
      subscribe: noSubscription,
      update: (updater) => setState(updater(state)),
    }),
    [state, setState]
  );

  return <BlockScopeContext value={scope}>{children}</BlockScopeContext>;
}

function useBlockScope(): IBlockScope {
  const scope = use(BlockScopeContext);
  if (!scope) throw new Error('A field must be rendered inside a BlockScopeProvider');
  return scope;
}

/**
 * Reads one slice of the block in scope; the component re-renders only when that slice changes.
 * Pass `isEqual` when the selector builds a new value each time.
 */
export function useBlockValue<TSlice>(
  selector: (block: TBlockState) => TSlice,
  isEqual: (previous: TSlice, next: TSlice) => boolean = Object.is
): TSlice {
  const scope = useBlockScope();
  const getSlice = useMemo(
    () => createDerivedReader(scope.getSnapshot, selector, isEqual),
    [scope, selector, isEqual]
  );

  return useSyncExternalStore(scope.subscribe, getSlice, getSlice);
}

/** Writes the block in scope with an updater, for a field that writes more than its own key. */
export function useUpdateBlock(): IBlockScope['update'] {
  return useBlockScope().update;
}

export type TSetFieldValue = (next: ConfigValue | undefined) => void;

/**
 * The value of one field of the block in scope and its setter; the caller re-renders only when
 * that value changes. Setting `undefined` removes the key.
 */
export function useField(key: string): readonly [ConfigValue | undefined, TSetFieldValue] {
  const { update } = useBlockScope();
  const selectValue = useCallback((block: TBlockState) => block[key], [key]);
  const value = useBlockValue(selectValue);
  const setValue = useCallback<TSetFieldValue>(
    (next) => update((previous) => withField(previous, key, next)),
    [update, key]
  );

  return [value, setValue] as const;
}

const sameNames = (previous: Set<string>, next: Set<string>) =>
  previous.size === next.size && [...next].every((name) => previous.has(name));

/** Every entry name in use; the caller re-renders only when a name is added, removed or renamed. */
export function useEntryNames(schema: ConfigSchema): Set<string> {
  const selectNames = useCallback((config: Config) => entryNames(config, schema), [schema]);
  return useConfigValue(selectNames, sameNames);
}
