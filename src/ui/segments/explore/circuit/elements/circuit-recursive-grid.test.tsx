import { describe, expect, it } from 'vitest';

import { adaptCircuitColumns, interleaveCircuitRows } from './circuit-recursive-grid';

import type { ColumnProps } from 'antd/es/table';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

/** Minimal circuit-ish row; only `id`/`sub_circuits` matter to the pure helpers. */
function circuit(id: string, subIds: string[] = []): ICircuit {
  return {
    id,
    name: `circuit-${id}`,
    sub_circuits: subIds.map((s) => circuit(s)),
  } as unknown as ICircuit;
}

describe('interleaveCircuitRows', () => {
  it('returns a copy of the rows when nothing is expanded', () => {
    const rows = [circuit('a', ['a1']), circuit('b')];
    const out = interleaveCircuitRows(rows, [], 0);
    expect(out).toHaveLength(2);
    expect(out).not.toBe(rows);
    expect(out).toEqual(rows);
  });

  it('inserts a detail row after an expanded circuit that has subcircuits', () => {
    const rows = [circuit('a', ['a1', 'a2']), circuit('b')];
    const out = interleaveCircuitRows(rows, ['a'], 0);
    expect(out).toHaveLength(3);
    const detail = out[1] as { __circuitDetail: true; parentId: string; depth: number };
    expect(detail.__circuitDetail).toBe(true);
    expect(detail.parentId).toBe('a');
    expect(detail.depth).toBe(0);
  });

  it('carries the parent depth onto the synthetic detail row', () => {
    const out = interleaveCircuitRows([circuit('a', ['a1'])], ['a'], 3);
    const detail = out[1] as { depth: number };
    expect(detail.depth).toBe(3);
  });

  it('never inserts a detail row for an expanded circuit with no subcircuits', () => {
    const out = interleaveCircuitRows([circuit('a')], ['a'], 0);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(circuit('a'));
  });
});

describe('adaptCircuitColumns', () => {
  const columns: Array<ColumnProps<ICircuit>> = [
    {
      key: 'name',
      title: <span>Name header</span>,
      width: 220,
      align: 'right',
      render: (_v, record) => `name:${record.id}`,
    },
    { key: 'width_string', title: 'W', width: '150px' },
  ];

  it('maps antd key/title/align/width onto the SimpleColumn shape', () => {
    const [name] = adaptCircuitColumns(columns);
    expect(name.id).toBe('name');
    expect(name.header).toBe('name');
    expect(name.headerNode).toBeTruthy();
    expect(name.align).toBe('right');
    expect(name.width).toEqual({ width: 220 });
  });

  it('parses a string width into a number', () => {
    const [, w] = adaptCircuitColumns(columns);
    expect(w.width).toEqual({ width: 150 });
  });

  it('wraps the antd render(value, record, index) into renderCell(row)', () => {
    const [name] = adaptCircuitColumns(columns);
    expect(name.renderCell?.(circuit('z'))).toBe('name:z');
  });

  it('falls back to a field lookup when the column has no render', () => {
    const [col] = adaptCircuitColumns([{ key: 'name', title: 'Name' }]);
    const row = { id: 'x', name: 'Alpha' } as unknown as ICircuit;
    expect(col.renderCell?.(row)).toBe('Alpha');
  });
});
