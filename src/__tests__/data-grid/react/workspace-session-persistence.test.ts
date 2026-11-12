import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { GridController } from '@/features/data-grid/core/grid-controller';
import { GridActionType } from '@/features/data-grid/core/state/grid-state';
import { createDefaultPersistence } from '@/features/data-grid/react/persistence/storage-persistence';
import { makeListingStateKey } from '@/ui/segments/data-table/elements/helpers';

import type { IFilterEntry } from '@/features/data-grid/core/domain/filter-model';
import type { IGridSchema } from '@/features/data-grid/core/domain/schema';

/** In Data a listing's filters follow it into any workspace; its page does not. */

interface Row {
  id: string;
}

const SCHEMA = {
  id: 'test',
  getRowId: (r: Row) => r.id,
  columns: [
    { id: 'mtype', header: 'M-type', filter: { operators: ['in'] } },
    { id: 'scope', header: 'Scope', filter: { operators: ['eq'] } },
  ],
} as unknown as IGridSchema<Row>;

const MTYPE = {
  columnId: 'mtype',
  operator: 'in',
  value: { kind: 'set', values: ['L5_TPC'] },
} as IFilterEntry;
const PROJECT_SCOPE = {
  columnId: 'scope',
  operator: 'eq',
  value: { kind: 'text', text: 'project' },
} as IFilterEntry;

const keyIn = (virtualLabId: string, projectId: string, section: string = WorkspaceSection.Data) =>
  makeListingStateKey({
    virtualLabId,
    projectId,
    section: section as typeof WorkspaceSection.Data,
    dataType: 'cell_morphology' as never,
    scope: 'combined' as never,
  });

const open = (virtualLabId: string, projectId: string) =>
  new GridController<Row>({
    schema: SCHEMA,
    context: { dataType: 'test' },
    instanceKey: keyIn(virtualLabId, projectId),
    persistence: createDefaultPersistence(undefined, undefined, `${virtualLabId}/${projectId}`),
    defaultPageSize: 10,
  });

// this file shares its worker with others: put the real storage back after each test
const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
beforeEach(() => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as Storage;
  Object.defineProperty(window, 'sessionStorage', { value: storage, configurable: true });
});
afterEach(() => {
  if (original) Object.defineProperty(window, 'sessionStorage', original);
  else Reflect.deleteProperty(window, 'sessionStorage');
});

describe('makeListingStateKey', () => {
  it('leaves the workspace out in Data only', () => {
    expect(keyIn('vlab-1', 'proj-1')).toBe(keyIn('vlab-2', 'proj-2'));
    expect(keyIn('vlab-1', 'proj-1', WorkspaceSection.Notebooks)).not.toBe(
      keyIn('vlab-2', 'proj-2', WorkspaceSection.Notebooks)
    );
  });
});

describe('Data listing state across workspaces', () => {
  const filterAndPage = (grid: GridController<Row>) => {
    for (const entry of [MTYPE, PROJECT_SCOPE]) {
      grid.store.dispatch({ type: GridActionType.SetFilter, columnId: entry.columnId, entry });
    }
    grid.store.dispatch({ type: GridActionType.SetPage, page: 7 });
  };

  it('keeps every filter, scope included, and resets the page in another workspace', () => {
    const first = open('vlab-1', 'proj-1');
    filterAndPage(first);
    first.dispose();

    const other = open('vlab-2', 'proj-2');
    const { filters, page } = other.store.getSnapshot();
    expect(filters.mtype).toMatchObject({ value: MTYPE.value });
    expect(filters.scope).toMatchObject({ value: PROJECT_SCOPE.value });
    expect(page).toBe(1);
    // storage holds the reset before any interaction, not the other workspace's page
    const stored = window.sessionStorage.getItem(
      `data-grid:202611091:state:${keyIn('vlab-2', 'proj-2')}`
    );
    expect(JSON.parse(stored as string).page).toBe(1);
    other.dispose();
  });

  it('keeps the page in the same workspace', () => {
    const first = open('vlab-1', 'proj-1');
    filterAndPage(first);
    first.dispose();

    const again = open('vlab-1', 'proj-1');
    expect(again.store.getSnapshot().page).toBe(7);
    again.dispose();
  });
});
