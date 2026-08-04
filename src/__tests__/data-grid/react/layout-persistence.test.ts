import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GridController } from '@/features/data-grid/core/grid-controller';
import { GridActionType } from '@/features/data-grid/core/state/grid-state';

import type { IColumnModel } from '@/features/data-grid/core/domain/column-model';
import type { IGridSchema } from '@/features/data-grid/core/domain/schema';

/**
 * The DURABLE half of grid persistence: a user's column layout (visibility, order,
 * widths) must survive closing the browser, while the transient browse state
 * (filters/sort/page/search) must not leak out of the tab's sessionStorage.
 *
 * These drive a real {@link GridController} against a live storage and then build a
 * SECOND controller with the same `instanceKey` — standing in for "the user comes
 * back tomorrow" — so the assertions cover the whole save → load → reconcile round
 * trip rather than the storage adapter in isolation.
 */

interface Row {
  id: string;
}

const COLUMNS: Array<IColumnModel<Row>> = [
  { id: 'name', header: 'Name' },
  { id: 'species', header: 'Species' },
  { id: 'region', header: 'Region' },
  { id: 'aux', header: 'Aux', auxiliary: true },
];

const SCHEMA: IGridSchema<Row> = { id: 'test', getRowId: (r) => r.id, columns: COLUMNS };

const KEY = 'vlab/proj/data/test-entity';

/** Import the module fresh so the config flag is re-read per test. */
async function persistenceModule() {
  return import('@/features/data-grid/react/persistence/storage-persistence');
}

async function makeController() {
  const { createDefaultPersistence } = await persistenceModule();
  return new GridController<Row>({
    schema: SCHEMA,
    context: { dataType: 'test' },
    instanceKey: KEY,
    persistence: createDefaultPersistence(),
    defaultPageSize: 10,
  });
}

/**
 * This environment does not supply `window.localStorage`/`sessionStorage`, so the
 * suite installs a minimal in-memory `Storage`. The adapters only use
 * getItem/setItem/removeItem, and driving those against a real map is what makes
 * the "second session" assertions meaningful.
 */
function installStorage(name: 'localStorage' | 'sessionStorage') {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
  Object.defineProperty(window, name, { value: storage, configurable: true, writable: true });
}

beforeEach(() => {
  vi.resetModules();
  installStorage('localStorage');
  installStorage('sessionStorage');
});

afterEach(() => {
  vi.doUnmock('@/features/data-grid/config');
});

describe('column layout persistence (flag ON)', () => {
  beforeEach(() => {
    vi.doMock('@/features/data-grid/config', () => ({ PERSIST_COLUMN_LAYOUT: true }));
  });

  it('restores hidden columns in a later session', async () => {
    const first = await makeController();
    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: ['species'] });
    first.dispose();

    const next = await makeController();
    expect(next.store.getSnapshot().hiddenColumns).toContain('species');
    next.dispose();
  });

  it('restores a reordered column layout in a later session', async () => {
    const order = ['region', 'name', 'species', 'aux'];
    const first = await makeController();
    first.store.dispatch({ type: GridActionType.SetColumnOrder, order });
    first.dispose();

    const next = await makeController();
    expect(next.store.getSnapshot().columnOrder).toEqual(order);
    next.dispose();
  });

  it('restores resized column widths in a later session', async () => {
    const first = await makeController();
    first.store.dispatch({ type: GridActionType.SetColumnWidth, columnId: 'name', width: 420 });
    first.dispose();

    const next = await makeController();
    expect(next.store.getSnapshot().columnWidths.name).toBe(420);
    next.dispose();
  });

  it('writes the layout to localStorage, never to sessionStorage', async () => {
    const controller = await makeController();
    controller.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: ['species'] });
    controller.dispose();

    const local = window.localStorage.getItem(`data-grid:v1:l:${KEY}`);
    expect(local).toBeTruthy();
    expect(JSON.parse(local as string)).toMatchObject({ hiddenColumns: ['species'] });
    expect(window.sessionStorage.getItem(`data-grid:v1:l:${KEY}`)).toBeNull();
  });

  it('keeps filters OUT of the durable layout slice', async () => {
    const controller = await makeController();
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: 'name',
      filter: { operator: 'contains', value: 'x' },
    });
    controller.dispose();

    const local = JSON.parse(window.localStorage.getItem(`data-grid:v1:l:${KEY}`) as string);
    expect(local).not.toHaveProperty('filters');
    // …while the session slice does carry them, so a tab-local filter still survives
    // a soft navigation.
    expect(window.sessionStorage.getItem(`data-grid:v1:s:${KEY}`)).toBeTruthy();
  });

  it('keeps each listing independent — one grid’s layout never reaches another', async () => {
    const { createDefaultPersistence } = await persistenceModule();
    const first = await makeController();
    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: ['species'] });
    first.dispose();

    const other = new GridController<Row>({
      schema: SCHEMA,
      context: { dataType: 'test' },
      instanceKey: 'vlab/proj/data/other-entity',
      persistence: createDefaultPersistence(),
      defaultPageSize: 10,
    });
    expect(other.store.getSnapshot().hiddenColumns).not.toContain('species');
    other.dispose();
  });
});

describe('column layout persistence (flag OFF)', () => {
  beforeEach(() => {
    vi.doMock('@/features/data-grid/config', () => ({ PERSIST_COLUMN_LAYOUT: false }));
  });

  it('writes nothing to localStorage', async () => {
    const controller = await makeController();
    controller.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: ['species'] });
    controller.dispose();

    expect(window.localStorage.getItem(`data-grid:v1:l:${KEY}`)).toBeNull();
  });

  it('ignores a layout saved while the flag was on, without deleting it', async () => {
    const stored = JSON.stringify({ hiddenColumns: ['species'], columnOrder: ['species', 'name'] });
    window.localStorage.setItem(`data-grid:v1:l:${KEY}`, stored);

    const controller = await makeController();
    // opens on the schema defaults…
    expect(controller.store.getSnapshot().hiddenColumns).not.toContain('species');
    expect(controller.store.getSnapshot().columnOrder).toEqual(COLUMNS.map((c) => c.id));
    controller.dispose();

    // …and the saved layout is still there for when the flag flips back on.
    expect(window.localStorage.getItem(`data-grid:v1:l:${KEY}`)).toBe(stored);
  });

  it('leaves the session slice (filters/sort/page) working', async () => {
    const controller = await makeController();
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: 'name',
      filter: { operator: 'contains', value: 'x' },
    });
    controller.dispose();

    expect(window.sessionStorage.getItem(`data-grid:v1:s:${KEY}`)).toBeTruthy();
  });
});
