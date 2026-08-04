import { describe, expect, it } from 'vitest';

import { cellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/cell-morphology';
import {
  FLAT_ADVANCED_FILTER_GROUP_ID,
  flatAdvancedFilters,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import { universalCellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/universal-cell-morphology';
import {
  advancedFilterKey,
  byContext,
  OperatorId,
  resolveAdvancedFilterGroups,
} from '@/features/data-grid/core';

import type { IAdvancedFilterGroup, IGridSchema } from '@/features/data-grid/core';

const groups: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'protocol',
    label: 'Protocol',
    description: 'How each morphology was produced.',
    filters: [
      { id: 'name', label: 'Protocol name', field: 'proto__name', operators: [OperatorId.Ilike] },
    ],
  },
  {
    id: 'record',
    label: 'Record',
    filters: [{ id: 'name', label: 'Name', field: 'name', operators: [OperatorId.Ilike] }],
  },
];

describe('flatAdvancedFilters', () => {
  it('collapses several groups into exactly one', () => {
    const flat = flatAdvancedFilters(groups);
    expect(flat).toHaveLength(1);
    expect(flat[0].id).toBe(FLAT_ADVANCED_FILTER_GROUP_ID);
    expect(flat[0].filters.map((f) => f.label)).toEqual(['Protocol name', 'Name']);
  });

  it('re-namespaces filter ids so same-named filters cannot collide on one key', () => {
    const flat = flatAdvancedFilters(groups);
    const keys = flat[0].filters.map((f) => advancedFilterKey(flat[0].id, f.id));
    expect(keys).toEqual(['adv:filters:protocol_name', 'adv:filters:record_name']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps the wire field untouched — flattening is presentation only', () => {
    expect(flatAdvancedFilters(groups)[0].filters.map((f) => f.field)).toEqual([
      'proto__name',
      'name',
    ]);
  });

  it('is a no-op for a schema that already has one group (its keys stay stable)', () => {
    const one = [groups[0]];
    expect(flatAdvancedFilters(one)).toBe(one);
  });

  it('pushes a group-level availability rule down onto filters that declare none', () => {
    const gated = byContext<boolean>({ default: false });
    const flat = flatAdvancedFilters([
      { ...groups[0], available: gated },
      { ...groups[1], filters: [{ ...groups[1].filters[0], available: true }] },
    ]);
    expect(flat[0].filters[0].available).toBe(gated);
    expect(flat[0].filters[1].available).toBe(true);
  });
});

describe('experimental entity schemas', () => {
  it('universal cell morphology resolves to a single group, so its popover has no tabs', () => {
    const resolved = resolveAdvancedFilterGroups(
      universalCellMorphologySchema as IGridSchema<unknown>,
      { dataType: 'universal_cell_morphology' }
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0].filters.length).toBeGreaterThan(5);
    expect(resolved[0].filters.map((f) => f.def.label)).toContain('Generation type');
    expect(resolved[0].filters.map((f) => f.def.label)).toContain('Strain');
  });

  /** With one declared group `flatAdvancedFilters` short-circuits: keys are not re-namespaced. */
  it('cell morphology is down to one declared group, so the ids are not re-namespaced', () => {
    const resolved = resolveAdvancedFilterGroups(cellMorphologySchema as IGridSchema<unknown>, {
      dataType: 'cell_morphology',
    });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('common');
    expect(resolved[0].filters.map((f) => f.key)).toEqual([advancedFilterKey('common', 'id')]);
  });
});
