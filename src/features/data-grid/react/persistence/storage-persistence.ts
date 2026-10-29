import { PERSIST_COLUMN_LAYOUT } from '@/features/data-grid/config';

import type { IGridState, IStatePersistence } from '@/features/data-grid/core';

/**
 * Slices stored apart: session = transient browse state, cleared with the tab; local =
 * durable view layout; selection = in-memory basket (see `createSelectionPersistence`).
 * Expansion is never persisted. Keys are
 * namespaced `data-grid:<version>:*`; the session slice is at v2 after the
 * `quickFilter` → `freeTextSearch` rename, which a v1 entry cannot satisfy.
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

/** sessionStorage key prefix of the session slice; the full key appends the `instanceKey`. */
export const SESSION_NAMESPACE = 'data-grid:v2:s:';

/**
 * Same-tab sessionStorage change event, as `useSessionStorage` dispatches it: the `storage`
 * event only fires in other tabs. Its `key` is the full storage key.
 */
export const SESSION_STORAGE_EVENT = 'session-storage';

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
  {
    fixedKey,
    onChange,
  }: {
    /** when set, this slice ignores the controller's `instanceKey` and stores under this */
    fixedKey?: string;
    /** called with the storage key after the stored value changes */
    onChange?: (storageKey: string) => void;
  } = {}
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
        const next = JSON.stringify(pick(state, keys));
        // every store change saves every slice (a row selection saves the filters too):
        // skip the write and the change event when this slice did not change
        if (s.getItem(storageKey(key)) === next) return;
        s.setItem(storageKey(key), next);
        onChange?.(storageKey(key));
      } catch {
        /* ignore quota / serialization errors */
      }
    },
    clear(key) {
      const s = storage();
      if (!s) return;
      try {
        s.removeItem(storageKey(key));
        onChange?.(storageKey(key));
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
    SESSION_NAMESPACE,
    SESSION_KEYS,
    // lets the sidebar counts follow a listing's filters after its grid unmounts
    { onChange: (key) => window.dispatchEvent(new StorageEvent(SESSION_STORAGE_EVENT, { key })) }
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
    { fixedKey: layoutKey }
  );
}

/**
 * Selection baskets, in memory and keyed by {@link selectionKeyFor}. Not storage-backed:
 * the ids would outlive the entities they point at, and a reload should start clean.
 */
const selectionBaskets = new Map<string, string[]>();

/**
 * Selection slice: hands the basket to the controller at construction, so a scope/species
 * swap never renders with an empty selection. Without it the restore has to happen in an
 * effect, and everything downstream (the picker's `onChange`, the bulk-action row cache)
 * sees that empty frame first and reacts to it.
 */
export function createSelectionPersistence(selectionKey: string): IStatePersistence {
  return {
    load: () => {
      const selection = selectionBaskets.get(selectionKey);
      return selection ? { selection: [...selection] } : null;
    },
    save: (_key, state) => {
      selectionBaskets.set(selectionKey, state.selection);
    },
    clear: () => {
      selectionBaskets.delete(selectionKey);
    },
  };
}

/**
 * The standard set for entity listings: always-on session slice, flag-gated layout slice,
 * and — when `selectionKey` is given — the shared selection basket. `layoutKey` and
 * `selectionKey` scope their slices independently of the controller's `instanceKey` — see
 * {@link layoutKeyFor} and {@link selectionKeyFor}.
 */
export function createDefaultPersistence(
  layoutKey?: string,
  selectionKey?: string
): IStatePersistence[] {
  const slices = [createSessionStatePersistence(), createLocalLayoutPersistence(layoutKey)];
  if (selectionKey) slices.push(createSelectionPersistence(selectionKey));
  return slices;
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

/**
 * Selection key for an entity listing: everything that identifies the listing except the
 * parts a controller swap changes (scope, species, extra factors). That is what makes the
 * basket survive a scope toggle while never leaking into another project or entity type.
 */
export function selectionKeyFor(parts: {
  section: string;
  dataType: string;
  virtualLabId?: string;
  projectId?: string;
  id?: string;
}): string {
  const { section, dataType, virtualLabId = '', projectId = '', id = '' } = parts;
  return [virtualLabId, projectId, section, dataType, id].join('/');
}
