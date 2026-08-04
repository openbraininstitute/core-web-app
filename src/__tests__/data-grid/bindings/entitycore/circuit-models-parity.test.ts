import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import {
  brainRegionGridDefinition,
  microCircuitGridDefinition,
  pairedNeuronCircuitGridDefinition,
  singleNeuronCircuitGridDefinition,
  smallMicroCircuitGridDefinition,
  wholeBrainGridDefinition,
} from '@/features/data-grid/bindings/entitycore/schemas/circuit-models';
import { extracellularRecordingArraySchema } from '@/features/data-grid/bindings/entitycore/schemas/extracellular-recording-array';
import { singleNeuronSimulationSchema } from '@/features/data-grid/bindings/entitycore/schemas/single-neuron-simulation';
import { singleNeuronSynaptomeSimulationSchema } from '@/features/data-grid/bindings/entitycore/schemas/single-neuron-synaptome-simulation';
import {
  FilterValueKind,
  OperatorId,
  resolveColumns,
  SortDirection,
} from '@/features/data-grid/core';

import type {
  IGridContext,
  IGridQuery,
  IGridSchema,
  TFilterModel,
} from '@/features/data-grid/core';

/**
 * Parity harness for the 9 model/simulation schemas: locks the resolved column set/order,
 * the serialized filter params and each column's sortability to the legacy view-defs and
 * field-defs.
 */

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}
const dataCtx = (dataType: string): IGridContext => ({ dataType, section: WorkspaceSection.Data });

function ids<Row>(schema: IGridSchema<Row>, ctx: IGridContext): string[] {
  return resolveColumns(schema, ctx).map((c) => c.id);
}
function col<Row>(schema: IGridSchema<Row>, id: string) {
  return schema.columns.find((c) => c.id === id);
}
function setIn(columnId: string): TFilterModel {
  return {
    [columnId]: {
      columnId,
      operator: OperatorId.In,
      value: { kind: FilterValueKind.Set, values: ['x'] },
    },
  };
}
function ilike(columnId: string): TFilterModel {
  return {
    [columnId]: {
      columnId,
      operator: OperatorId.Ilike,
      value: { kind: FilterValueKind.Text, text: 'foo' },
    },
  };
}
function range(columnId: string, min: number, max: number): TFilterModel {
  return {
    [columnId]: {
      columnId,
      operator: OperatorId.Range,
      value: { kind: FilterValueKind.Range, min, max },
    },
  };
}
function dateRange(columnId: string, from: string, to: string): TFilterModel {
  return {
    [columnId]: {
      columnId,
      operator: OperatorId.DateRange,
      value: { kind: FilterValueKind.DateRange, from, to },
    },
  };
}
function sortDesc(columnId: string): Partial<IGridQuery> {
  return { sort: [{ columnId, direction: SortDirection.Desc }] };
}

const CIRCUIT_FAMILY_COLUMNS = [
  EntityCoreFields.Name,
  EntityCoreFields.Description,
  EntityCoreFields.BrainRegion,
  EntityCoreFields.SpeciesName,
  EntityCoreFields.CircuitScale,
  EntityCoreFields.CircuitNumberNeurons,
  EntityCoreFields.CircuitNumberSynapses,
  EntityCoreFields.CircuitNumberConnections,
  EntityCoreFields.CircuitTargetSimulator,
  'lifecycleStatus',
  EntityCoreFields.CreatedBy,
  EntityCoreFields.RegistrationDate,
];

/** Filters shared by every circuit-family listing (independent of per-type sortability). */
function assertCircuitFamilyFilters(schema: IGridSchema<unknown>) {
  expect(serializeQuery(query({ filters: ilike(EntityCoreFields.Name) }), schema).name__ilike).toBe(
    '%foo%'
  );
  expect(col(schema, EntityCoreFields.Description)?.filter).toBeUndefined();
  expect(
    serializeQuery(query({ filters: setIn(EntityCoreFields.BrainRegion) }), schema)
      .brain_region__name__in
  ).toEqual(['x']);
  // scale stays unfiltered: each dataType narrows `scale__in` in the domain config, and a
  // user-supplied scale would override that narrowing
  expect(col(schema, EntityCoreFields.CircuitScale)?.filter).toBeUndefined();
  const neurons = serializeQuery(
    query({ filters: range(EntityCoreFields.CircuitNumberNeurons, 10, 1000) }),
    schema
  );
  expect(neurons.number_neurons__gte).toBe(10);
  expect(neurons.number_neurons__lte).toBe(1000);
  expect(
    serializeQuery(query({ filters: range(EntityCoreFields.CircuitNumberSynapses, 1, 2) }), schema)
      .number_synapses__gte
  ).toBe(1);
  expect(
    serializeQuery(
      query({ filters: range(EntityCoreFields.CircuitNumberConnections, 1, 2) }),
      schema
    ).number_connections__lte
  ).toBe(2);
  expect(
    serializeQuery(query({ filters: setIn(EntityCoreFields.CreatedBy) }), schema)
      .created_by__pref_label__in
  ).toEqual(['x']);
  const dated = serializeQuery(
    query({ filters: dateRange(EntityCoreFields.RegistrationDate, '2026-01-01', '2026-02-01') }),
    schema
  );
  expect(dated.creation_date__gte).toBe('2026-01-01');
  expect(dated.creation_date__lte).toBe('2026-02-01');
}

describe.each([
  ['micro_circuit', microCircuitGridDefinition],
  ['small_micro_circuit', smallMicroCircuitGridDefinition],
  ['paired_neuron_circuit', pairedNeuronCircuitGridDefinition],
] as const)('%s parity (circuit-like family)', (dataType, def) => {
  const s = def.schema as IGridSchema<unknown>;
  it('routes under the expected dataType', () => {
    expect(def.dataType).toBe(dataType);
  });
  it('columns match the legacy view-def order', () => {
    expect(ids(s, dataCtx(dataType))).toEqual(CIRCUIT_FAMILY_COLUMNS);
  });
  it('serializes the legacy filters (name/species/numbers/target/createdBy/date)', () => {
    assertCircuitFamilyFilters(s);
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.SpeciesName) }), s)
        .subject__species__name__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.CircuitTargetSimulator) }), s)
        .target_simulator__in
    ).toEqual(['x']);
  });
  it('sortability follows CircuitFilter.ordering_model_fields (species included)', () => {
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.SpeciesName)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CircuitScale)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CircuitNumberNeurons)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CircuitTargetSimulator)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc(EntityCoreFields.CircuitScale)), s).order_by).toEqual([
      '-scale',
    ]);
    expect(serializeQuery(query(sortDesc(EntityCoreFields.CreatedBy)), s).order_by).toEqual([
      '-created_by__pref_label',
    ]);
  });
});

describe('whole_brain parity', () => {
  const s = wholeBrainGridDefinition.schema as IGridSchema<unknown>;
  it('columns match the legacy view-def order', () => {
    expect(ids(s, dataCtx('whole_brain'))).toEqual(CIRCUIT_FAMILY_COLUMNS);
  });
  it('serializes the same filters, incl. the species facet', () => {
    assertCircuitFamilyFilters(s);
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.SpeciesName) }), s)
        .subject__species__name__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.CircuitTargetSimulator) }), s)
        .target_simulator__in
    ).toEqual(['x']);
  });
  it('every CircuitFilter ordering field is sortable (same endpoint as the rest)', () => {
    expect(col(s, EntityCoreFields.CircuitTargetSimulator)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.SpeciesName)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CircuitScale)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CircuitNumberNeurons)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(true);
  });
});

describe('single_neuron_circuit parity', () => {
  const s = singleNeuronCircuitGridDefinition.schema as IGridSchema<unknown>;
  it('drops the legacy Download action column; starts at Name', () => {
    expect(ids(s, dataCtx('single_neuron_circuit'))).toEqual(CIRCUIT_FAMILY_COLUMNS);
    expect(singleNeuronCircuitGridDefinition.schema.selection?.enabled).toBe(true);
  });
  it('serializes the legacy filters incl. species facet', () => {
    assertCircuitFamilyFilters(s);
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.SpeciesName) }), s)
        .subject__species__name__in
    ).toEqual(['x']);
  });
  it('species IS server-sortable (`subject__species__name` is a CircuitFilter order field)', () => {
    expect(col(s, EntityCoreFields.SpeciesName)?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc(EntityCoreFields.SpeciesName)), s).order_by).toEqual([
      '-subject__species__name',
    ]);
    expect(col(s, EntityCoreFields.CircuitNumberNeurons)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(true);
  });
});

describe('brain_region parity', () => {
  const s = brainRegionGridDefinition.schema as IGridSchema<unknown>;
  it('columns follow the legacy order and OMIT Target simulator', () => {
    expect(ids(s, dataCtx('brain_region'))).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.SpeciesName,
      EntityCoreFields.CircuitScale,
      EntityCoreFields.CircuitNumberNeurons,
      EntityCoreFields.CircuitNumberSynapses,
      EntityCoreFields.CircuitNumberConnections,
      'lifecycleStatus',
      EntityCoreFields.CreatedBy,
      EntityCoreFields.RegistrationDate,
    ]);
    expect(col(s, EntityCoreFields.CircuitTargetSimulator)).toBeUndefined();
  });
  it('serializes name/species/numbers/createdBy/date filters', () => {
    assertCircuitFamilyFilters(s);
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.SpeciesName) }), s)
        .subject__species__name__in
    ).toEqual(['x']);
  });
  it('sorts like the rest of the family (same /circuit endpoint + CircuitFilter)', () => {
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.SpeciesName)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CircuitScale)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CircuitNumberNeurons)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.RegistrationDate)?.sortable).toBe(true);
  });
});

describe('simulatable_extracellular_recording_array parity', () => {
  const s = extracellularRecordingArraySchema as IGridSchema<unknown>;
  it('columns match the legacy view-def order', () => {
    expect(ids(s, dataCtx('simulatable_extracellular_recording_array'))).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.RecordingArrayCircuit,
      EntityCoreFields.ElectrodeType,
      'lifecycleStatus',
      EntityCoreFields.CreatedBy,
      EntityCoreFields.RegistrationDate,
      // auxiliary — hidden until ticked in the chooser
      'contributions',
    ]);
  });
  it('name ilike + createdBy facet + registration DateRange serialize to legacy keys', () => {
    expect(serializeQuery(query({ filters: ilike(EntityCoreFields.Name) }), s).name__ilike).toBe(
      '%foo%'
    );
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.CreatedBy) }), s)
        .created_by__pref_label__in
    ).toEqual(['x']);
    const dated = serializeQuery(
      query({ filters: dateRange(EntityCoreFields.RegistrationDate, '2026-01-01', '2026-02-01') }),
      s
    );
    expect(dated.creation_date__gte).toBe('2026-01-01');
  });
  it('Description / Circuit stay display-only; createdBy not sortable', () => {
    expect(col(s, EntityCoreFields.Description)?.filter).toBeUndefined();
    expect(col(s, EntityCoreFields.RecordingArrayCircuit)?.filter).toBeUndefined();
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBeFalsy();
    expect(col(s, EntityCoreFields.RegistrationDate)?.sortable).toBe(true);
  });

  it('electrode type filters on its own column, bare exact match, still unsortable', () => {
    const column = col(s, EntityCoreFields.ElectrodeType);
    expect(column?.auxiliary).toBeFalsy();
    expect(column?.sortable).toBe(false);
    expect(column?.filter?.field).toBe('electrode_type');
    expect(column?.filter?.operators).toEqual([OperatorId.Eq]);
    expect(column?.filter?.targets?.[0]?.operators).toEqual([OperatorId.Eq]);
    const eq: TFilterModel = {
      [EntityCoreFields.ElectrodeType]: {
        columnId: EntityCoreFields.ElectrodeType,
        operator: OperatorId.Eq,
        value: { kind: FilterValueKind.Text, text: 'neuropixels_v1' },
      },
    };
    expect(serializeQuery(query({ filters: eq }), s).electrode_type).toBe('neuropixels_v1');
  });

  it('the auxiliary Contributors column carries its filter and does NOT sort', () => {
    const resolved = resolveColumns(s, dataCtx('simulatable_extracellular_recording_array'));
    expect(resolved.filter((c) => c.auxiliary).map((c) => c.id)).toEqual(['contributions']);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual([
      'contributions',
    ]);
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
    expect(col(s, 'contributions')?.sortable).toBe(false);
  });
});

describe('single_neuron_simulation parity', () => {
  const s = singleNeuronSimulationSchema as IGridSchema<unknown>;
  it('columns match the legacy view-def order', () => {
    expect(ids(s, dataCtx('single_neuron_simulation'))).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.SimulationModel,
      EntityCoreFields.SimulationStimulus,
      EntityCoreFields.SimulationResponse,
      EntityCoreFields.InjectionLocation,
      EntityCoreFields.RecordingLocation,
      EntityCoreFields.BrainRegion,
      'lifecycleStatus',
      EntityCoreFields.CreatedBy,
      EntityCoreFields.RegistrationDate,
    ]);
  });
  it('name/createdBy/registration serialize; simulation columns are display-only', () => {
    expect(serializeQuery(query({ filters: ilike(EntityCoreFields.Name) }), s).name__ilike).toBe(
      '%foo%'
    );
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.CreatedBy) }), s)
        .created_by__pref_label__in
    ).toEqual(['x']);
    for (const id of [
      EntityCoreFields.SimulationStimulus,
      EntityCoreFields.SimulationResponse,
      EntityCoreFields.InjectionLocation,
      EntityCoreFields.RecordingLocation,
    ]) {
      expect(col(s, id)?.filter).toBeUndefined();
      expect(col(s, id)?.sortable).toBeFalsy();
    }
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.SimulationModel) }), s)
        .me_model__name__in
    ).toEqual(['x']);
    expect(col(s, EntityCoreFields.SimulationModel)?.sortable).toBeFalsy();
  });
  it('brain region + created by are server-sortable (in the field-def order.types)', () => {
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(true);
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.BrainRegion) }), s)
        .brain_region__name__in
    ).toEqual(['x']);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc(EntityCoreFields.CreatedBy)), s).order_by).toEqual([
      '-created_by__pref_label',
    ]);
  });
});

describe('single_neuron_synaptome_simulation parity', () => {
  const s = singleNeuronSynaptomeSimulationSchema as IGridSchema<unknown>;
  it('columns match the legacy view-def order', () => {
    expect(ids(s, dataCtx('single_neuron_synaptome_simulation'))).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.SimulationStimulus,
      EntityCoreFields.SimulationResponse,
      EntityCoreFields.SynaptomeModelName,
      EntityCoreFields.BrainRegion,
      'lifecycleStatus',
      EntityCoreFields.CreatedBy,
      EntityCoreFields.RegistrationDate,
    ]);
  });
  it('name/createdBy serialize; description + synaptome + stimulus/response display-only', () => {
    expect(serializeQuery(query({ filters: ilike(EntityCoreFields.Name) }), s).name__ilike).toBe(
      '%foo%'
    );
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.CreatedBy) }), s)
        .created_by__pref_label__in
    ).toEqual(['x']);
    for (const id of [
      EntityCoreFields.Description,
      EntityCoreFields.SimulationStimulus,
      EntityCoreFields.SimulationResponse,
    ]) {
      expect(col(s, id)?.filter).toBeUndefined();
    }
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.SynaptomeModelName) }), s)
        .synaptome__name__in
    ).toEqual(['x']);
    expect(col(s, EntityCoreFields.SynaptomeModelName)?.sortable).toBeFalsy();
  });
  it('brain region + created by are server-sortable', () => {
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(true);
  });
});
