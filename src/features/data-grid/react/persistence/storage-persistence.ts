import { PERSIST_COLUMN_LAYOUT } from '@/features/data-grid/config';

import type { IGridState, IStatePersistence } from '@/features/data-grid/core';

/**
 * Two slices stored apart: session = transient browse state, cleared with the tab;
 * local = durable view layout. Selection and expansion are never persisted. Keys are
 * namespaced `data-grid:v1:*`, versioned so a breaking state shape can bump it.
 */
const SESSION_KEYS = [
  'filters',
  'sort',
  'page',
  'pageSize',
  'freeTextSearch',
] as const satisfies ReadonlyArray<keyof IGridState>;
const LOCAL_KEYS = [
  'columnOrder',
  'hiddenColumns',
  'columnWidths',
] as const satisfies ReadonlyArray<keyof IGridState>;

function pick(state: IGridState, keys: ReadonlyArray<keyof IGridState>): Partial<IGridState> {
  const out: Partial<IGridState> = {};
  for (const key of keys) {
    (out as Record<string, unknown>)[key] = state[key];
  }
  return out;
}

function createStoragePersistence(
  getStorage: () => Storage | undefined,
  namespace: string,
  keys: ReadonlyArray<keyof IGridState>,
  /** when set, this slice ignores the controller's `instanceKey` and stores under this */
  fixedKey?: string
): IStatePersistence {
  const storage = (): Storage | undefined => {
    try {
      return getStorage();
    } catch {
      return undefined;
    }
  };
  const storageKey = (key: string) => `${namespace}${fixedKey ?? key}`;

  return {
    load(key) {
      const s = storage();
      if (!s) return null;
      try {
        const raw = s.getItem(storageKey(key));
        return raw ? (JSON.parse(raw) as Partial<IGridState>) : null;
      } catch {
        return null;
      }
    },
    save(key, state) {
      const s = storage();
      if (!s) return;
      try {
        s.setItem(storageKey(key), JSON.stringify(pick(state, keys)));
      } catch {
        /* ignore quota / serialization errors */
      }
    },
    clear(key) {
      const s = storage();
      if (!s) return;
      try {
        s.removeItem(storageKey(key));
      } catch {
        /* ignore */
      }
    },
  };
}

/** Session slice: browse state, cleared when the tab closes. */
export function createSessionStatePersistence(): IStatePersistence {
  return createStoragePersistence(
    () => (typeof window !== 'undefined' ? window.sessionStorage : undefined),
    'data-grid:v1:s:',
    SESSION_KEYS
  );
}

/** A persistence adapter that remembers nothing, for when a slice is switched off. */
const NO_PERSISTENCE: IStatePersistence = {
  load: () => null,
  save: () => {},
  clear: () => {},
};

/**
 * Local slice: durable column layout, gated by {@link PERSIST_COLUMN_LAYOUT}. With the
 * flag off nothing is written and nothing already written is read back, but stored
 * layouts are left in place so turning it back on restores them.
 */
export function createLocalLayoutPersistence(layoutKey?: string): IStatePersistence {
  if (!PERSIST_COLUMN_LAYOUT) return NO_PERSISTENCE;
  return createStoragePersistence(
    () => (typeof window !== 'undefined' ? window.localStorage : undefined),
    'data-grid:v1:l:',
    LOCAL_KEYS,
    layoutKey
  );
}

/**
 * The standard pair for entity listings: always-on session slice plus flag-gated layout
 * slice. `layoutKey` scopes the layout slice independently of the controller's
 * `instanceKey` — see {@link layoutKeyFor}.
 */
export function createDefaultPersistence(layoutKey?: string): IStatePersistence[] {
  return [createSessionStatePersistence(), createLocalLayoutPersistence(layoutKey)];
}

/**
 * Layout key for an entity listing: section + entity type and nothing else. Deliberately
 * narrower than `instanceKey`, which also carries lab/project/scope — including those
 * would give the user a different column layout per project and per scope toggle. The
 * session slice keeps the full `instanceKey`, since filters should not leak across them.
 */
export function layoutKeyFor(section: string, dataType: string): string {
  return `${section}/${dataType}`;
}
