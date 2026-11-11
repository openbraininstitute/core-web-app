import { describe, expect, it } from 'vitest';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { buildColDefs } from '@/features/data-grid/renderers/aggrid/col-def-mapper';
import {
  EMPTY_PLACEHOLDER,
  EMPTY_PLACEHOLDER_CLASS,
  isEmptyCellValue,
  keepsBlankWhenEmpty,
} from '@/features/data-grid/renderers/aggrid/empty-cell';

import type { ColDef } from 'ag-grid-community';
import type { IResolvedColumn } from '@/features/data-grid/core';

interface Row {
  id: string;
}

function col(id: string, over: Partial<IResolvedColumn<Row>> = {}): IResolvedColumn<Row> {
  return { id, header: id, filterAvailable: false, hiddenByDefaultResolved: false, ...over };
}

const OPTIONS = { hidden: new Set<string>(), columnWidths: {} };

/** Invoke a colDef's valueFormatter with a plain data row. */
function format(def: ColDef<Row> | undefined, value: unknown): unknown {
  const fn = def?.valueFormatter;
  if (typeof fn !== 'function') return undefined;
  return fn({ value, data: { id: 'r1' } } as never);
}

describe('isEmptyCellValue', () => {
  it('treats absent, blank-string and empty-collection values as empty', () => {
    expect(isEmptyCellValue(null)).toBe(true);
    expect(isEmptyCellValue(undefined)).toBe(true);
    expect(isEmptyCellValue('')).toBe(true);
    expect(isEmptyCellValue('   ')).toBe(true);
    expect(isEmptyCellValue([])).toBe(true);
  });

  it('treats 0 / false / real text as REAL values, never empty', () => {
    expect(isEmptyCellValue(0)).toBe(false);
    expect(isEmptyCellValue(false)).toBe(false);
    expect(isEmptyCellValue('L5')).toBe(false);
  });
});

describe('keepsBlankWhenEmpty', () => {
  it('keeps a column with its own cell renderer blank', () => {
    expect(keepsBlankWhenEmpty({ id: 'status', cellRenderer: 'campaignStatus' })).toBe(true);
  });

  it('keeps the expander HOST column blank', () => {
    expect(keepsBlankWhenEmpty({ id: 'name' }, 'name')).toBe(true);
  });

  it('keeps the circuit Subcircuits column blank (deliberate)', () => {
    expect(keepsBlankWhenEmpty({ id: EntityCoreFields.CircuitSubCircuit })).toBe(true);
  });

  it('substitutes the placeholder for an ordinary value column', () => {
    expect(keepsBlankWhenEmpty({ id: 'species' })).toBe(false);
  });
});

describe('buildColDefs — empty cells show the shared placeholder', () => {
  it('a plain value column formats empty values as the placeholder, greyed', () => {
    const [def] = buildColDefs([col('species')], OPTIONS);
    expect(format(def, '')).toBe(EMPTY_PLACEHOLDER);
    expect(format(def, null)).toBe(EMPTY_PLACEHOLDER);
    expect(format(def, 'Mus musculus')).toBe('Mus musculus');
    // 0 is a real measurement, not an empty cell
    expect(format(def, 0)).toBe('0');
    expect(def?.cellClassRules?.[EMPTY_PLACEHOLDER_CLASS]).toBeTypeOf('function');
  });

  it('leaves renderer-owned, expander-host and deliberately-blank columns alone', () => {
    const defs = buildColDefs(
      [
        col('status', { cellRenderer: 'campaignStatus' }),
        col(EntityCoreFields.CircuitSubCircuit),
        col('name'),
      ],
      { ...OPTIONS, withExpandColumn: true, expandColumn: { columnId: 'name' } }
    );
    for (const def of defs) expect(def.valueFormatter).toBeUndefined();
  });
});
