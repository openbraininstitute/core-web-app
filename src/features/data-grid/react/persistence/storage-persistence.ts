import type { GridState, StatePersistence } from '../../core';

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
] as const satisfies ReadonlyArray<keyof GridState>;
const LOCAL_KEYS = [
  'columnOrder',
  'hiddenColumns',
  'columnWidths',
] as const satisfies ReadonlyArray<keyof GridState>;

function pick(state: GridState, keys: ReadonlyArray<keyof GridState>): Partial<GridState> {
  const out: Partial<GridState> = {};
  for (const key of keys) {
    (out as Record<string, unknown>)[key] = state[key];
  }
  return out;
}

function createStoragePersistence(
  getStorage: () => Storage | undefined,
  namespace: string,
  keys: ReadonlyArray<keyof GridState>
): StatePersistence {
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
        return raw ? (JSON.parse(raw) as Partial<GridState>) : null;
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
export function createSessionStatePersistence(): StatePersistence {
  return createStoragePersistence(
    () => (typeof window !== 'undefined' ? window.sessionStorage : undefined),
    'data-grid:v1:s:',
    SESSION_KEYS
  );
}

/** Local slice: durable column layout (order, visibility, widths). */
export function createLocalLayoutPersistence(): StatePersistence {
  return createStoragePersistence(
    () => (typeof window !== 'undefined' ? window.localStorage : undefined),
    'data-grid:v1:l:',
    LOCAL_KEYS
  );
}

/** The standard pair used by entity listings. */
export function createDefaultPersistence(): StatePersistence[] {
  return [createSessionStatePersistence(), createLocalLayoutPersistence()];
}
