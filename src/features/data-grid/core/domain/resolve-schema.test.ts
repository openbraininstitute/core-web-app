import { describe, expect, it } from 'vitest';

import { byContext } from './contextual';
import { mergeColumnDef } from './merge-column';
import { defaultHiddenColumnIds, isSelectionEnabled, resolveColumns } from './resolve-schema';

import type { GridContext } from './grid-context';
import type { GridSchema } from './schema';

type Row = { id: string };

const ctx = (over: Partial<GridContext> = {}): GridContext => ({
  dataType: 'cell_morphology',
  section: 'data',
  scope: 'project',
  ...over,
});

const schema: GridSchema<Row> = {
  id: 'test',
  columns: [
    { id: 'name', header: 'Name', filter: { operators: ['ilike'] } },
    {
      id: 'projectOnly',
      header: 'Project only',
      available: (c) => c.scope === 'project',
    },
    {
      id: 'guarded',
      header: 'Guarded filter',
      filter: { operators: ['in'], available: (c) => c.section === 'data' },
    },
  ],
  getRowId: (r) => r.id,
  selection: { enabled: (c) => c.scope !== 'public' },
};

describe('resolveColumns', () => {
  it('keeps contextually available columns and computes filter availability', () => {
    const cols = resolveColumns(schema, ctx());
    expect(cols.map((c) => c.id)).toEqual(['name', 'projectOnly', 'guarded']);
    expect(cols.find((c) => c.id === 'name')?.filterAvailable).toBe(true);
    expect(cols.find((c) => c.id === 'guarded')?.filterAvailable).toBe(true);
  });

  it('drops columns and filters unavailable in the context', () => {
    const cols = resolveColumns(schema, ctx({ scope: 'public', section: 'other' }));
    expect(cols.map((c) => c.id)).toEqual(['name', 'guarded']);
    expect(cols.find((c) => c.id === 'guarded')?.filterAvailable).toBe(false);
  });

  it('preserves declaration order when no column declares an order', () => {
    expect(resolveColumns(schema, ctx()).map((c) => c.id)).toEqual([
      'name',
      'projectOnly',
      'guarded',
    ]);
  });

  it('orders by contextual `order` ("where"), ties keep declaration order', () => {
    const ordered: GridSchema<Row> = {
      id: 't',
      getRowId: (r) => r.id,
      columns: [
        { id: 'a', header: 'A', order: 3 },
        { id: 'b', header: 'B', order: 1 },
        { id: 'c', header: 'C' }, // no order → declaration slot (index 2)
        {
          id: 'd',
          header: 'D',
          // moves to the front only in the build section
          order: byContext<number>({
            default: 5,
            rules: [{ when: { section: 'build' }, value: 0 }],
          }),
        },
      ],
    };
    expect(resolveColumns(ordered, ctx({ section: 'data' })).map((c) => c.id)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
    expect(resolveColumns(ordered, ctx({ section: 'build' })).map((c) => c.id)).toEqual([
      'd',
      'b',
      'c',
      'a',
    ]);
  });

  it('resolves contextual default-hidden columns', () => {
    const withHidden: GridSchema<Row> = {
      id: 't',
      getRowId: (r) => r.id,
      columns: [
        { id: 'always', header: 'Always' },
        {
          id: 'peek',
          header: 'Peek',
          hiddenByDefault: byContext<boolean>({
            default: true,
            rules: [{ when: { scope: 'project' }, value: false }],
          }),
        },
      ],
    };
    expect(defaultHiddenColumnIds(withHidden, ctx({ scope: 'public' }))).toEqual(['peek']);
    expect(defaultHiddenColumnIds(withHidden, ctx({ scope: 'project' }))).toEqual([]);
  });
});

describe('isSelectionEnabled', () => {
  it('resolves the contextual selection flag; defaults to false without a spec', () => {
    expect(isSelectionEnabled(schema, ctx())).toBe(true);
    expect(isSelectionEnabled(schema, ctx({ scope: 'public' }))).toBe(false);
    expect(isSelectionEnabled({ ...schema, selection: undefined }, ctx())).toBe(false);
  });
});

describe('mergeColumnDef', () => {
  const base = {
    id: 'name',
    header: 'Name',
    width: { width: 200, minWidth: 120 },
    filter: { operators: ['ilike', 'eq'], description: 'base' },
    cellRendererParams: { a: 1 },
  };

  it('deep-merges width, filter and cellRendererParams', () => {
    const merged = mergeColumnDef(base, {
      width: { width: 260 },
      filter: { description: 'override' },
      cellRendererParams: { b: 2 },
    });
    expect(merged.width).toEqual({ width: 260, minWidth: 120 });
    expect(merged.filter).toEqual({ operators: ['ilike', 'eq'], description: 'override' });
    expect(merged.cellRendererParams).toEqual({ a: 1, b: 2 });
  });

  it('returns the base untouched without overrides', () => {
    expect(mergeColumnDef(base)).toBe(base);
  });
});
