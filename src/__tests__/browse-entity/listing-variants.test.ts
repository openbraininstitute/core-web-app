import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { FilterValueKind, OperatorId, resolveColumns } from '@/features/data-grid/core';
import { DATA_BROWSE_ALLOWED_ENTITIES } from '@/features/views/listing/data-browse-entities';
import { circuitScaleVariants } from '@/features/views/listing/variants/circuit-scale';
import {
  getVariantGroup,
  LISTING_VARIANT_GROUPS,
  resolveEntityVariant,
  resolveListingVariant,
} from '@/features/views/listing/variants/registry';
import { scopeListing, withoutFilterFields } from '@/features/views/listing/variants/scope-listing';

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

describe('circuit scale variants config', () => {
  it('has one sub-item per scale except single, in enum order, with the agreed labels', () => {
    expect(circuitScaleVariants.variants.map((o) => [o.slug, o.label])).toEqual([
      ['pair', 'Paired neuron circuits'],
      ['small', 'Small microcircuits'],
      ['microcircuit', 'Microcircuits'],
      ['region', 'Region circuits'],
      ['system', 'System circuits'],
      ['whole-brain', 'Whole brain circuits'],
    ]);
    const scales = Object.values(CircuitScaleDictionary).filter((s) => s !== 'single');
    expect(circuitScaleVariants.variants.map((o) => o.params)).toEqual(
      scales.map((s) => ({ scale__in: [s] }))
    );
    for (const variant of circuitScaleVariants.variants)
      expect(variant.pinnedFields).toEqual(['scale']);
  });
});

describe('listing variants registry', () => {
  it('resolves variants by dataType + slug and misses otherwise', () => {
    expect(resolveListingVariant(CIRCUIT, 'whole-brain')?.params).toEqual({
      scale__in: ['whole_brain'],
    });
    expect(resolveListingVariant(CIRCUIT, 'bogus')).toBeUndefined();
    expect(resolveListingVariant(CIRCUIT, undefined)).toBeUndefined();
    expect(resolveListingVariant(ExtendedEntitiesTypeDict.Emodel, 'pair')).toBeUndefined();
  });

  it('is well formed: unique slugs, one variant group per type, routable and registered parents', () => {
    expect(new Set(LISTING_VARIANT_GROUPS.map((s) => s.dataType)).size).toBe(
      LISTING_VARIANT_GROUPS.length
    );
    for (const group of LISTING_VARIANT_GROUPS) {
      const slugs = group.variants.map((o) => o.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(getVariantGroup(group.dataType)).toBe(group);
      expect(DATA_BROWSE_ALLOWED_ENTITIES).toContain(group.dataType);
      expect(getEntityGridDefinition(group.dataType)).toBeDefined();
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
  const variant = must(resolveListingVariant(CIRCUIT, 'whole-brain'));
  const scoped = scopeListing({ definition, extraQueryParams: { order_by: ['name'] } }, variant);
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

  it('isolates per-listing state under the variant slug', () => {
    expect(scoped.id).toBe('whole-brain');
    expect(scopeListing({ definition, id: 'base' }, variant).id).toBe('base:whole-brain');
  });
});

describe('resolveEntityVariant', () => {
  it('maps an entity to its scale variant; single and other types have none', () => {
    expect(
      resolveEntityVariant(CIRCUIT, {
        scale: CircuitScaleDictionary.WholeBrain,
      })?.slug
    ).toBe('whole-brain');
    expect(resolveEntityVariant(CIRCUIT, { scale: CircuitScaleDictionary.Single })).toBeUndefined();
    expect(resolveEntityVariant('emodel', { scale: 'pair' })).toBeUndefined();
  });
});
