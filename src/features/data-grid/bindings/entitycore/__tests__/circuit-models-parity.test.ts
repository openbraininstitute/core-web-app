import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { FilterValueKind, OperatorId, resolveColumns, SortDirection } from '../../../core';
import { serializeQuery } from '../query-serializer';
import {
  brainRegionGridDefinition,
  microCircuitGridDefinition,
  pairedNeuronCircuitGridDefinition,
  singleNeuronCircuitGridDefinition,
  smallMicroCircuitGridDefinition,
  wholeBrainGridDefinition,
} from '../schemas/circuit-models';
import { extracellularRecordingArraySchema } from '../schemas/extracellular-recording-array';
import { singleNeuronSimulationSchema } from '../schemas/single-neuron-simulation';
import { singleNeuronSynaptomeSimulationSchema } from '../schemas/single-neuron-synaptome-simulation';

import type { IGridContext, IGridQuery, IGridSchema, TFilterModel } from '../../../core';

/**
 * Parity harness for the 9 model/simulation schemas flipped to AG Grid. Locks (a) the
 * context-resolved column set/order to the legacy `view-defs/*`, (b) the serialized filter
 * params (`field__op`) to the legacy field-def constraints, and (c) each column's declared
 * sortability to its field-def `order.types` membership — the invariants that guarantee no
 * regression when the router flips these dataTypes.
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
  EntityCoreFields.CreatedBy,
  EntityCoreFields.RegistrationDate,
];

/** Filters shared by every circuit-family listing (independent of per-type sortability). */
function assertCircuitFamilyFilters(schema: IGridSchema<unknown>) {
  // Name ilike, Description display-only (legacy `isFilterable: false`).
  expect(serializeQuery(query({ filters: ilike(EntityCoreFields.Name) }), schema).name__ilike).toBe(
    '%foo%'
  );
  expect(col(schema, EntityCoreFields.Description)?.filter).toBeUndefined();
  // Brain region has no filter (region gating owns it); Scale has no filter for these types.
  expect(col(schema, EntityCoreFields.BrainRegion)?.filter).toBeUndefined();
  expect(col(schema, EntityCoreFields.CircuitScale)?.filter).toBeUndefined();
  // Number-of-* ValueRange → field__gte/__lte.
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
  // Created by facet → created_by__pref_label__in.
  expect(
    serializeQuery(query({ filters: setIn(EntityCoreFields.CreatedBy) }), schema)
      .created_by__pref_label__in
  ).toEqual(['x']);
  // Registration date DateRange → creation_date__gte/__lte.
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
  it('sortability mirrors the field-def order.types (species NOT sortable here)', () => {
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.SpeciesName)?.sortable).toBe(false);
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
  it('serializes the same filters, but Species is display-only (no legacy filter rule)', () => {
    assertCircuitFamilyFilters(s);
    expect(col(s, EntityCoreFields.SpeciesName)?.filter).toBeUndefined();
    expect(
      serializeQuery(query({ filters: setIn(EntityCoreFields.CircuitTargetSimulator) }), s)
        .target_simulator__in
    ).toEqual(['x']);
  });
  it('only Target simulator + Name/Registration date are sortable (whole_brain order.types)', () => {
    expect(col(s, EntityCoreFields.CircuitTargetSimulator)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(false);
    expect(col(s, EntityCoreFields.SpeciesName)?.sortable).toBe(false);
    expect(col(s, EntityCoreFields.CircuitScale)?.sortable).toBe(false);
    expect(col(s, EntityCoreFields.CircuitNumberNeurons)?.sortable).toBe(false);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(false);
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
  it('species IS server-sortable here (only family member in species order.types)', () => {
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
  it('nothing but Name/Registration date is sortable (brain_region in no order.types)', () => {
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(false);
    expect(col(s, EntityCoreFields.SpeciesName)?.sortable).toBe(false);
    expect(col(s, EntityCoreFields.CircuitScale)?.sortable).toBe(false);
    expect(col(s, EntityCoreFields.CircuitNumberNeurons)?.sortable).toBe(false);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(false);
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
      EntityCoreFields.CreatedBy,
      EntityCoreFields.RegistrationDate,
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
  it('Description / Circuit / Electrode type are display-only; createdBy not sortable', () => {
    expect(col(s, EntityCoreFields.Description)?.filter).toBeUndefined();
    expect(col(s, EntityCoreFields.RecordingArrayCircuit)?.filter).toBeUndefined();
    expect(col(s, EntityCoreFields.ElectrodeType)?.filter).toBeUndefined();
    expect(col(s, EntityCoreFields.ElectrodeType)?.sortable).toBeFalsy();
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBeFalsy();
    expect(col(s, EntityCoreFields.RegistrationDate)?.sortable).toBe(true);
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
      EntityCoreFields.SimulationModel,
      EntityCoreFields.SimulationStimulus,
      EntityCoreFields.SimulationResponse,
      EntityCoreFields.InjectionLocation,
      EntityCoreFields.RecordingLocation,
    ]) {
      expect(col(s, id)?.filter).toBeUndefined();
      expect(col(s, id)?.sortable).toBeFalsy();
    }
  });
  it('brain region + created by are server-sortable (in the field-def order.types)', () => {
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.BrainRegion)?.filter).toBeUndefined();
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
      EntityCoreFields.SynaptomeModelName,
    ]) {
      expect(col(s, id)?.filter).toBeUndefined();
    }
  });
  it('brain region + created by are server-sortable', () => {
    expect(col(s, EntityCoreFields.BrainRegion)?.sortable).toBe(true);
    expect(col(s, EntityCoreFields.CreatedBy)?.sortable).toBe(true);
  });
});
