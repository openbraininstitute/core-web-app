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
 * A reader of a value derived from a source. It returns the previous value while the new one is
 * equal, so `useSyncExternalStore` sees no change and the component does not re-render.
 */
export function createDerivedReader<TSource, TSlice>(
  getSource: () => TSource,
  selector: (source: TSource) => TSlice,
  isEqual: (previous: TSlice, next: TSlice) => boolean
): () => TSlice {
  let cached: { source: TSource; slice: TSlice } | undefined;

  return () => {
    const source = getSource();
    if (cached && cached.source === source) return cached.slice;
    const next = selector(source);
    const slice = cached && isEqual(cached.slice, next) ? cached.slice : next;
    cached = { source, slice };
    return slice;
  };
}

/** A reader of one slice of the store; see `createDerivedReader`. */
export function createSliceReader<TSlice>(
  store: IScanConfigStore,
  selector: (config: Config) => TSlice,
  isEqual: (previous: TSlice, next: TSlice) => boolean
): () => TSlice {
  return createDerivedReader(store.getSnapshot, selector, isEqual);
}

export type TEntrySummary = { name: string; type: string | undefined };

/** The name and block type of each entry of a section; empty when it holds no entries. */
export function entrySummariesOf(section: ConfigValue | undefined): TEntrySummary[] {
  if (!isPlainObject(section)) return [];

  return Object.entries(section).map(([name, entry]) => ({
    name,
    type: isPlainObject(entry) && typeof entry.type === 'string' ? entry.type : undefined,
  }));
}

/** Whether `instancePath` is `path` itself or below it, by whole path segments. */
export function isAtOrBelow(instancePath: string, path: string): boolean {
  return instancePath === path || instancePath.startsWith(`${path}/`);
}

export interface IReportedIssues {
  getSnapshot: () => ReadonlyMap<string, string>;
  subscribe: (listener: () => void) => () => void;
  /** Sets the message of a path, or removes the path when there is no message. */
  report: (path: string, message: string | undefined) => void;
}

/** The issues that fields report themselves, by path (`/section/entry/field`). */
export function createReportedIssues(): IReportedIssues {
  let issues: ReadonlyMap<string, string> = new Map();
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => issues,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    report: (path, message) => {
      if (issues.get(path) === message) return;
      const next = new Map(issues);
      if (message === undefined) next.delete(path);
      else next.set(path, message);
      issues = next;
      for (const listener of listeners) listener();
    },
  };
}
