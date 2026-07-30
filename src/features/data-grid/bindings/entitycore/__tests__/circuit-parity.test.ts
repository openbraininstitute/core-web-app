import { describe, expect, it } from 'vitest';

import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { OperatorId } from '../../../core';
import { serializeQuery } from '../query-serializer';
import { circuitSchema } from '../schemas/circuit';

import type { TCoreFilter } from '@/entity-configuration/definitions/types';
import type { FilterModel, GridQuery } from '../../../core';

/**
 * Golden parity for the circuit FLAT branch. The circuit data source's flat view
 * delegates to `createEntitycorePagedDataSource` → `serializeQuery(circuitSchema)`,
 * so locking `serializeQuery` to the legacy `transformFiltersToQuery` oracle proves
 * the flat request params are byte-for-byte identical to the legacy circuit list.
 * Constraints mirror the circuit field-defs (`fields-defs/model.tsx`).
 */
function query(over: Partial<GridQuery> = {}): GridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

describe('circuit — column set/order parity with the legacy view-def', () => {
  it('exposes the legacy circuit columns (minus the antd-only Download action) in order', () => {
    const ids = circuitSchema.columns.map((c) => c.id);
    expect(ids).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.CircuitSubCircuit,
      EntityCoreFields.Description,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.SpeciesName,
      EntityCoreFields.CircuitScale,
      EntityCoreFields.CircuitNumberNeurons,
      EntityCoreFields.CircuitNumberSynapses,
      EntityCoreFields.CircuitNumberConnections,
      EntityCoreFields.CircuitBuildCategory,
      EntityCoreFields.CircuitTargetSimulator,
      EntityCoreFields.CircuitDerivationType,
      EntityCoreFields.ArtifactPublishedIn,
      EntityCoreFields.ArtifactExperimentDate,
    ]);
  });

  it('the Subcircuits column id matches EntityCoreFields.CircuitSubCircuit (the expander host)', () => {
    expect(circuitSchema.columns[1]?.id).toBe(EntityCoreFields.CircuitSubCircuit);
  });
});

describe('circuit — flat serialize parity with transformFiltersToQuery', () => {
  it('name contains → name__ilike (same wire value as the legacy `*foo*`)', () => {
    const legacy = transformFiltersToQuery([
      { field: 'name', type: 'Text', value: '*foo*', constraint: 'name__ilike' } as TCoreFilter,
    ]);
    const filters: FilterModel = {
      [EntityCoreFields.Name]: {
        columnId: EntityCoreFields.Name,
        operator: OperatorId.Ilike,
        value: { kind: 'text', text: 'foo' },
      },
    };
    const grid = serializeQuery(query({ filters }), circuitSchema);
    expect(grid.name__ilike).toBe(legacy.name__ilike);
    expect(grid.name__ilike).toBe('%foo%');
  });

  it('scale dropdown → scale__in (same key as the legacy DropdownList)', () => {
    const legacy = transformFiltersToQuery([
      {
        field: 'scale',
        type: 'CheckList',
        value: ['microcircuit'],
        constraint: 'scale__in',
      } as TCoreFilter,
    ]);
    const filters: FilterModel = {
      [EntityCoreFields.CircuitScale]: {
        columnId: EntityCoreFields.CircuitScale,
        operator: OperatorId.In,
        value: { kind: 'set', values: ['microcircuit'] },
      },
    };
    const grid = serializeQuery(query({ filters }), circuitSchema);
    expect(grid.scale__in).toEqual(legacy.scale__in);
    expect(grid.scale__in).toEqual(['microcircuit']);
  });

  it('number-of-neurons range → number_neurons__gte/__lte (same keys as the legacy ValueRange)', () => {
    const legacy = transformFiltersToQuery([
      {
        field: 'number_neurons',
        type: 'ValueRange',
        value: { gte: 10, lte: 1000 },
        constraint: { gte: 'number_neurons__gte', lte: 'number_neurons__lte' },
      } as unknown as TCoreFilter,
    ]);
    const filters: FilterModel = {
      [EntityCoreFields.CircuitNumberNeurons]: {
        columnId: EntityCoreFields.CircuitNumberNeurons,
        operator: OperatorId.Range,
        value: { kind: 'range', min: 10, max: 1000 },
      },
    };
    const grid = serializeQuery(query({ filters }), circuitSchema);
    expect(grid.number_neurons__gte).toBe(legacy.number_neurons__gte);
    expect(grid.number_neurons__lte).toBe(legacy.number_neurons__lte);
  });

  it('build category / target simulator dropdowns → __in with the legacy keys', () => {
    const legacy = transformFiltersToQuery([
      {
        field: 'build_category',
        type: 'CheckList',
        value: ['computational_model'],
        constraint: 'build_category__in',
      } as TCoreFilter,
      {
        field: 'target_simulator',
        type: 'CheckList',
        value: ['NEURON'],
        constraint: 'target_simulator__in',
      } as TCoreFilter,
    ]);
    const filters: FilterModel = {
      [EntityCoreFields.CircuitBuildCategory]: {
        columnId: EntityCoreFields.CircuitBuildCategory,
        operator: OperatorId.In,
        value: { kind: 'set', values: ['computational_model'] },
      },
      [EntityCoreFields.CircuitTargetSimulator]: {
        columnId: EntityCoreFields.CircuitTargetSimulator,
        operator: OperatorId.In,
        value: { kind: 'set', values: ['NEURON'] },
      },
    };
    const grid = serializeQuery(query({ filters }), circuitSchema);
    expect(grid.build_category__in).toEqual(legacy.build_category__in);
    expect(grid.target_simulator__in).toEqual(legacy.target_simulator__in);
  });

  it('derivation type → generated_derivation__derivation_type__in (issue #517 constraint)', () => {
    const legacy = transformFiltersToQuery([
      {
        field: 'derivation_type',
        type: 'CheckList',
        value: ['circuit_extraction'],
        constraint: 'generated_derivation__derivation_type__in',
      } as TCoreFilter,
    ]);
    const filters: FilterModel = {
      [EntityCoreFields.CircuitDerivationType]: {
        columnId: EntityCoreFields.CircuitDerivationType,
        operator: OperatorId.In,
        value: { kind: 'set', values: ['circuit_extraction'] },
      },
    };
    const grid = serializeQuery(query({ filters }), circuitSchema);
    expect(grid.generated_derivation__derivation_type__in).toEqual(
      legacy.generated_derivation__derivation_type__in
    );
  });

  it('species facet → subject__species__name__in (shared catalog column)', () => {
    const legacy = transformFiltersToQuery([
      {
        field: 'species',
        type: 'CheckList',
        value: ['Mus musculus'],
        constraint: 'subject__species__name__in',
      } as TCoreFilter,
    ]);
    const filters: FilterModel = {
      [EntityCoreFields.SpeciesName]: {
        columnId: EntityCoreFields.SpeciesName,
        operator: OperatorId.In,
        value: { kind: 'set', values: ['Mus musculus'] },
      },
    };
    const grid = serializeQuery(query({ filters }), circuitSchema);
    expect(grid.subject__species__name__in).toEqual(legacy.subject__species__name__in);
  });

  it('scale sort serializes to +scale / -scale; paging passes through', () => {
    expect(
      serializeQuery(
        query({ sort: [{ columnId: EntityCoreFields.CircuitScale, direction: 'asc' }] }),
        circuitSchema
      ).order_by
    ).toEqual(['+scale']);
    const paged = serializeQuery(query({ page: 3, pageSize: 50 }), circuitSchema);
    expect(paged.page).toBe(3);
    expect(paged.page_size).toBe(50);
  });

  it('no filters and no sort → no order_by (server default order, like legacy)', () => {
    const grid = serializeQuery(query(), circuitSchema);
    expect(grid.order_by).toBeUndefined();
  });
});
