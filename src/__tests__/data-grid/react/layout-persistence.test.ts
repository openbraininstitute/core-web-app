import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GridController } from '@/features/data-grid/core/grid-controller';
import { GridActionType } from '@/features/data-grid/core/state/grid-state';

import type { IColumnModel } from '@/features/data-grid/core/domain/column-model';
import type { IGridSchema } from '@/features/data-grid/core/domain/schema';

/**
 * Pins grid persistence: the column layout is durable (localStorage) while browse state
 * stays in the tab's sessionStorage. The two slices are scoped DIFFERENTLY on purpose —
 * layout by section + entity type, session state by the full `instanceKey` — and
 * several tests below exist to pin exactly that difference.
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

/** The layout slice is scoped to section + entity type only. */
const LAYOUT_KEY = 'data/test-entity';

async function makeController(instanceKey: string = KEY, layoutKey: string = LAYOUT_KEY) {
  const { createDefaultPersistence } = await persistenceModule();
  return new GridController<Row>({
    schema: SCHEMA,
    context: { dataType: 'test' },
    instanceKey,
    persistence: createDefaultPersistence(layoutKey),
    defaultPageSize: 10,
  });
}

/**
 * This environment supplies no `window.localStorage`/`sessionStorage`, so install a
 * minimal in-memory `Storage`; a real map is what makes the "second session" assertions
 * meaningful.
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

    const local = window.localStorage.getItem(`data-grid:v1:l:${LAYOUT_KEY}`);
    expect(local).toBeTruthy();
    expect(JSON.parse(local as string)).toMatchObject({ hiddenColumns: ['species'] });
    expect(window.sessionStorage.getItem(`data-grid:v1:l:${LAYOUT_KEY}`)).toBeNull();
  });

  it('keeps filters OUT of the durable layout slice', async () => {
    const controller = await makeController();
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: 'name',
      filter: { operator: 'contains', value: 'x' },
    });
    controller.dispose();

    const local = JSON.parse(window.localStorage.getItem(`data-grid:v1:l:${LAYOUT_KEY}`) as string);
    expect(local).not.toHaveProperty('filters');
    expect(window.sessionStorage.getItem(`data-grid:v1:s:${KEY}`)).toBeTruthy();
  });

  it('remembers an AUXILIARY column the user switched on', async () => {
    const first = await makeController();
    expect(first.store.getSnapshot().hiddenColumns).toContain('aux');
    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: [] });
    first.dispose();

    const next = await makeController();
    expect(next.store.getSnapshot().hiddenColumns).not.toContain('aux');
    next.dispose();
  });

  it('leaves an untouched auxiliary column hidden in a later session', async () => {
    const first = await makeController();
    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: ['aux', 'species'] });
    first.dispose();

    const next = await makeController();
    expect(next.store.getSnapshot().hiddenColumns).toContain('aux');
    next.dispose();
  });

  it('keeps saving after a disconnect/reconnect cycle', async () => {
    const first = await makeController();
    const disconnect = first.connect();
    disconnect();
    first.connect();

    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: [] });
    first.dispose();

    const next = await makeController();
    expect(next.store.getSnapshot().hiddenColumns).not.toContain('aux');
    next.dispose();
  });

  /**
   * The stored `columnOrder` doubles as "the columns this layout knows about". A
   * layout saved before a column existed must widen to include it, or the next save
   * writes the short list straight back and the user's tick reverts on the reload
   * after that.
   */
  it('remembers a column ticked on top of a layout saved before it existed', async () => {
    const { createDefaultPersistence } = await persistenceModule();
    // A layout from an older schema: no `aux` in either list.
    window.localStorage.setItem(
      `data-grid:v1:l:${LAYOUT_KEY}`,
      JSON.stringify({ hiddenColumns: [], columnOrder: ['name', 'species', 'region'] })
    );

    const first = await makeController();
    expect(first.store.getSnapshot().hiddenColumns).toContain('aux'); // unknown → schema default
    expect(first.store.getSnapshot().columnOrder).toContain('aux');
    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: [] });
    first.dispose();

    const next = new GridController<Row>({
      schema: SCHEMA,
      context: { dataType: 'test' },
      instanceKey: KEY,
      persistence: createDefaultPersistence(LAYOUT_KEY),
      defaultPageSize: 10,
    });
    expect(next.store.getSnapshot().hiddenColumns).not.toContain('aux');
    next.dispose();
  });

  it('hides an auxiliary column added AFTER the layout was saved', async () => {
    const first = await makeController();
    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: [] });
    first.dispose();

    const { createDefaultPersistence } = await persistenceModule();
    const withNewColumn = new GridController<Row>({
      schema: {
        ...SCHEMA,
        columns: [...COLUMNS, { id: 'newAux', header: 'New aux', auxiliary: true }],
      },
      context: { dataType: 'test' },
      instanceKey: KEY,
      persistence: createDefaultPersistence(LAYOUT_KEY),
      defaultPageSize: 10,
    });
    const hidden = withNewColumn.store.getSnapshot().hiddenColumns;
    expect(hidden).toContain('newAux');
    expect(hidden).not.toContain('aux'); // …without undoing the user's own choice
    withNewColumn.dispose();
  });

  it('follows the entity type across projects and scopes', async () => {
    const first = await makeController('vlab/proj-a/data/test-entity/private');
    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: ['species'] });
    first.dispose();

    const elsewhere = await makeController('vlab/proj-b/data/test-entity/public');
    expect(elsewhere.store.getSnapshot().hiddenColumns).toContain('species');
    elsewhere.dispose();
  });

  it('keeps a different entity type on its own layout', async () => {
    const first = await makeController();
    first.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: ['species'] });
    first.dispose();

    const other = await makeController(KEY, 'data/other-entity');
    expect(other.store.getSnapshot().hiddenColumns).not.toContain('species');
    other.dispose();
  });

  it('keeps the same entity type on separate layouts per section', async () => {
    const inData = await makeController(KEY, 'data/test-entity');
    inData.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: ['species'] });
    inData.dispose();

    const inBuild = await makeController(KEY, 'build/test-entity');
    expect(inBuild.store.getSnapshot().hiddenColumns).not.toContain('species');
    inBuild.dispose();
  });

  it('keeps FILTERS per listing even though the layout is shared', async () => {
    const first = await makeController('vlab/proj-a/data/test-entity/private');
    first.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: 'name',
      filter: { operator: 'contains', value: 'x' },
    });
    first.dispose();

    const elsewhere = await makeController('vlab/proj-b/data/test-entity/public');
    expect(elsewhere.store.getSnapshot().filters).toEqual({});
    elsewhere.dispose();
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

    expect(window.localStorage.getItem(`data-grid:v1:l:${LAYOUT_KEY}`)).toBeNull();
  });

  it('ignores a layout saved while the flag was on, without deleting it', async () => {
    const stored = JSON.stringify({ hiddenColumns: ['species'], columnOrder: ['species', 'name'] });
    window.localStorage.setItem(`data-grid:v1:l:${LAYOUT_KEY}`, stored);

    const controller = await makeController();
    expect(controller.store.getSnapshot().hiddenColumns).not.toContain('species');
    expect(controller.store.getSnapshot().columnOrder).toEqual(COLUMNS.map((c) => c.id));
    controller.dispose();

    expect(window.localStorage.getItem(`data-grid:v1:l:${LAYOUT_KEY}`)).toBe(stored);
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
