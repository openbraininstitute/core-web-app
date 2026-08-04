import { PERSIST_COLUMN_LAYOUT } from '../../config';

import type { IGridState, IStatePersistence } from '../../core';

/**
 * Two persistence slices, deliberately stored apart:
 * - the SESSION slice is the transient browse state (filters/sort/page/search) that
 *   should reset when the tab closes — matching the legacy sessionStorage snapshots;
 * - the LOCAL slice is the user's durable view layout (column order/visibility/
 *   widths) that should survive across sessions.
 * Selection and expansion are intentionally never persisted.
 *
 * Keys are namespaced `data-grid:v1:*` so legacy table snapshots are never touched
 * (rollback to the antd table stays safe), and versioned so a future breaking state
 * shape can simply bump the namespace.
 */
const SESSION_KEYS = [
  'filters',
  'sort',
  'page',
  'pageSize',
  'quickFilter',
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
  keys: ReadonlyArray<keyof IGridState>
): IStatePersistence {
  const storage = (): Storage | undefined => {
    try {
      return getStorage();
    } catch {
      return undefined;
    }
  };
  const storageKey = (key: string) => `${namespace}${key}`;

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

/**
 * A persistence adapter that remembers nothing — used when a slice is switched off,
 * so callers keep a uniform adapter list instead of branching on the flag.
 */
const NO_PERSISTENCE: IStatePersistence = {
  load: () => null,
  save: () => {},
  clear: () => {},
};

/**
 * Local slice: durable column layout (order, visibility, widths), surviving across
 * browser sessions.
 *
 * Gated by {@link PERSIST_COLUMN_LAYOUT}. When that flag is off this returns the
 * no-op adapter, so nothing is written AND nothing already written is read back —
 * the grid always opens on the schema's defaults. Stored layouts are left in place
 * rather than deleted, so turning the flag back on restores them.
 */
export function createLocalLayoutPersistence(): IStatePersistence {
  if (!PERSIST_COLUMN_LAYOUT) return NO_PERSISTENCE;
  return createStoragePersistence(
    () => (typeof window !== 'undefined' ? window.localStorage : undefined),
    'data-grid:v1:l:',
    LOCAL_KEYS
  );
}

/**
 * The standard pair used by entity listings: the always-on session slice plus the
 * flag-gated layout slice.
 */
export function createDefaultPersistence(): IStatePersistence[] {
  return [createSessionStatePersistence(), createLocalLayoutPersistence()];
}
