import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { FilterValueKind, OperatorId, resolveColumns } from '@/features/data-grid/core';
import { DATA_BROWSE_ALLOWED_ENTITIES } from '@/features/views/listing/data-browse-entities';
import { circuitScaleSplit } from '@/features/views/listing/splits/circuit-scale';
import {
  getListingSplit,
  LISTING_SPLITS,
  resolveListingSplitOption,
} from '@/features/views/listing/splits/registry';
import { scopeListing, withoutFilterFields } from '@/features/views/listing/splits/scope-listing';

import type { IGridContext, IGridSchema } from '@/features/data-grid/core';

const CIRCUIT = ExtendedEntitiesTypeDict.Circuit;
function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('expected a value');
  return value;
}
const CTX: IGridContext = {
  dataType: 'circuit',
  section: 'data',
  scope: 'project',
};

describe('circuit scale split config', () => {
  it('has one sub-item per scale except single, in enum order, with the agreed labels', () => {
    expect(circuitScaleSplit.options.map((o) => [o.slug, o.label])).toEqual([
      ['pair', 'Paired neurons'],
      ['small', 'Small microcircuits'],
      ['microcircuit', 'Microcircuits'],
      ['region', 'Region circuits'],
      ['system', 'System circuits'],
      ['whole-brain', 'Whole brain circuits'],
    ]);
    const scales = Object.values(CircuitScaleDictionary).filter((s) => s !== 'single');
    expect(circuitScaleSplit.options.map((o) => o.params)).toEqual(
      scales.map((s) => ({ scale__in: [s] }))
    );
    for (const option of circuitScaleSplit.options) expect(option.pinnedFields).toEqual(['scale']);
  });
});

describe('listing split registry', () => {
  it('resolves options by dataType + slug and misses otherwise', () => {
    expect(resolveListingSplitOption(CIRCUIT, 'whole-brain')?.params).toEqual({
      scale__in: ['whole_brain'],
    });
    expect(resolveListingSplitOption(CIRCUIT, 'bogus')).toBeUndefined();
    expect(resolveListingSplitOption(CIRCUIT, undefined)).toBeUndefined();
    expect(resolveListingSplitOption(ExtendedEntitiesTypeDict.Emodel, 'pair')).toBeUndefined();
  });

  it('is well formed: unique slugs, one split per type, routable and registered parents', () => {
    expect(new Set(LISTING_SPLITS.map((s) => s.dataType)).size).toBe(LISTING_SPLITS.length);
    for (const split of LISTING_SPLITS) {
      const slugs = split.options.map((o) => o.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(getListingSplit(split.dataType)).toBe(split);
      expect(DATA_BROWSE_ALLOWED_ENTITIES).toContain(split.dataType);
      expect(getEntityGridDefinition(split.dataType)).toBeDefined();
    }
  });
});

describe('withoutFilterFields', () => {
  const target = (field: string) => ({
    id: field,
    label: field,
    field,
    operators: ['in'],
  });
  const schema = {
    id: 'fixture',
    getRowId: (row: { id: string }) => row.id,
    columns: [
      { id: 'name', header: 'Name' },
      {
        id: 'scale',
        header: 'Scale',
        filter: { field: 'scale', operators: ['in'] },
      },
      {
        id: 'species',
        header: 'Species',
        filter: {
          operators: ['in'],
          targets: [target('scale'), target('species__name')],
        },
      },
    ],
    advancedFilters: [
      { id: 'only-scale', label: 'A', filters: [target('scale')] },
      {
        id: 'mixed',
        label: 'B',
        filters: [target('scale'), target('protocol')],
      },
    ],
  } as IGridSchema<{ id: string }>;

  it('drops pinned filters, keeps columns, and leaves the rest untouched', () => {
    const before = structuredClone(schema.columns.map(({ id }) => id));
    const out = withoutFilterFields(schema, ['scale']);

    expect(out.columns.map((c) => c.id)).toEqual(before);
    expect(out.columns[1].filter).toBeUndefined();
    expect(out.columns[2].filter?.targets?.map((t) => t.field)).toEqual(['species__name']);
    expect(out.columns[0]).toBe(schema.columns[0]);
    expect(out.advancedFilters?.map((g) => g.id)).toEqual(['mixed']);
    expect(out.advancedFilters?.[0].filters.map((f) => f.field)).toEqual(['protocol']);
    // input not mutated
    expect(schema.columns[1].filter).toBeDefined();
    expect(schema.advancedFilters).toHaveLength(2);
  });

  it('returns the same schema when there is nothing to pin', () => {
    expect(withoutFilterFields(schema, [])).toBe(schema);
  });
});

describe('scopeListing on the real circuit definition', () => {
  const definition = must(getEntityGridDefinition(CIRCUIT));
  const option = must(resolveListingSplitOption(CIRCUIT, 'whole-brain'));
  const scoped = scopeListing({ definition, extraQueryParams: { order_by: ['name'] } }, option);
  const filterAvailable = (schema: IGridSchema<never>, id: string) =>
    resolveColumns(schema, CTX).find((c) => c.id === id)?.filterAvailable;

  it('hides the Scale filter but keeps the column and the other filters', () => {
    expect(filterAvailable(circuitSchema as IGridSchema<never>, 'scale')).toBe(true);
    expect(filterAvailable(scoped.definition.schema, 'scale')).toBe(false);
    expect(scoped.definition.schema.columns.some((c) => c.id === 'scale')).toBe(true);
    expect(filterAvailable(scoped.definition.schema, 'brain_region')).toBe(true);
  });

  it('pins scale__in over a stale user filter and merges caller params', () => {
    const params = serializeQuery(
      {
        page: 1,
        pageSize: 20,
        sort: [],
        filters: {
          scale: {
            columnId: 'scale',
            operator: OperatorId.In,
            value: { kind: FilterValueKind.Set, values: ['region'] },
          },
        },
        params: scoped.extraQueryParams,
      },
      scoped.definition.schema
    );
    expect(params.scale__in).toEqual(['whole_brain']);
    expect(params.order_by).toEqual(['name']);
  });

  it('isolates per-listing state under the split slug', () => {
    expect(scoped.id).toBe('whole-brain');
    expect(scopeListing({ definition, id: 'base' }, option).id).toBe('base:whole-brain');
  });
});
