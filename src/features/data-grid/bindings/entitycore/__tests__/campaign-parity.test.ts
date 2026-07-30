import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';

import { OperatorId, resolveColumns } from '../../../core';
import { serializeQuery } from '../query-serializer';
import {
  ionChannelModelSimulationGridDefinition,
  memodelCircuitSimulationGridDefinition,
  microcircuitSimulationGridDefinition,
  pairedNeuronCircuitSimulationGridDefinition,
  regionCircuitSimulationGridDefinition,
  singleNeuronCircuitSimulationGridDefinition,
  smallMicrocircuitSimulationGridDefinition,
  wholeBrainCircuitSimulationGridDefinition,
} from '../schemas/circuit-simulations';

import type { FilterModel, GridContext, GridQuery, GridSchema } from '../../../core';
import type { EntityGridDefinition } from '../registry';
import type { CampaignRow } from '../schemas/campaign-common';

/**
 * T-05 parity harness for the expandable circuit-simulation dataTypes. Locks (a) the
 * collapsed-row column set/order to the legacy view-def, (b) the presence + wiring of
 * the full-width detail spec (isExpandable honored, renderDetail supplied), and (c) the
 * serialized filter/sort params to the legacy `field__op` keys — the invariants that
 * guarantee no regression when the router flips these dataTypes to AG Grid detail rows.
 */

function query(over: Partial<GridQuery> = {}): GridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}
const dataCtx = (dataType: string): GridContext => ({ dataType, section: WorkspaceSection.Data });

function ids<Row>(schema: GridSchema<Row>, ctx: GridContext): string[] {
  return resolveColumns(schema, ctx).map((c) => c.id);
}
function setIn(columnId: string): FilterModel {
  return {
    [columnId]: { columnId, operator: OperatorId.In, value: { kind: 'set', values: ['x'] } },
  };
}
function ilike(columnId: string): FilterModel {
  return {
    [columnId]: { columnId, operator: OperatorId.Ilike, value: { kind: 'text', text: 'foo' } },
  };
}

const STANDARD_COLUMNS = [
  'name',
  'description',
  'circuitName',
  'createdBy',
  'registrationDate',
  'status',
];

/** Shared assertions common to every flipped simulation-campaign definition. */
function assertCampaignDetail(def: EntityGridDefinition<CampaignRow>, dataType: string) {
  it('exposes a full-width detail spec with all rows expandable', () => {
    const detail = def.schema.detail;
    expect(detail).toBeDefined();
    expect(detail?.isExpandable?.({ id: 'row-1' })).toBe(true);
    expect(detail?.minHeight).toBeGreaterThan(0);
    expect(detail?.rendererKey).toBeTruthy();
  });
  it('supplies a renderDetail fn and registers the status cell renderer', () => {
    expect(typeof def.renderDetail).toBe('function');
    expect(typeof def.registerCellRenderers).toBe('function');
  });
  it('routes under the expected dataType', () => {
    expect(def.dataType).toBe(dataType);
  });
  it('serializes name/createdBy/registration filters + default sort to the legacy keys', () => {
    const s = def.schema;
    expect(serializeQuery(query({ filters: ilike('name') }), s).name__ilike).toBe('%foo%');
    expect(
      serializeQuery(query({ filters: setIn('createdBy') }), s).created_by__pref_label__in
    ).toEqual(['x']);
    const dateFilter: FilterModel = {
      registrationDate: {
        columnId: 'registrationDate',
        operator: OperatorId.DateRange,
        value: { kind: 'dateRange', from: '2026-01-01', to: '2026-02-01' },
      },
    };
    const dated = serializeQuery(query({ filters: dateFilter }), s);
    expect(dated.creation_date__gte).toBe('2026-01-01');
    expect(dated.creation_date__lte).toBe('2026-02-01');
    expect(
      serializeQuery(query({ sort: [{ columnId: 'registrationDate', direction: 'desc' }] }), s)
        .order_by
    ).toEqual(['-creation_date']);
  });
}

describe.each([
  ['region_circuit_simulation', regionCircuitSimulationGridDefinition],
  ['whole_brain_circuit_simulation', wholeBrainCircuitSimulationGridDefinition],
  ['microcircuit_simulation', microcircuitSimulationGridDefinition],
  ['small_microcircuit_simulation', smallMicrocircuitSimulationGridDefinition],
  ['paired_neuron_circuit_simulation', pairedNeuronCircuitSimulationGridDefinition],
  ['single_neuron_circuit_simulation', singleNeuronCircuitSimulationGridDefinition],
] as const)('%s parity', (dataType, def) => {
  it('columns match the legacy view-def order', () => {
    expect(ids(def.schema, dataCtx(dataType))).toEqual(STANDARD_COLUMNS);
  });
  assertCampaignDetail(def, dataType);
});

describe('me_model_circuit_simulation parity', () => {
  const def = memodelCircuitSimulationGridDefinition;
  it('inserts a Species column after Created by (legacy memodel view-def)', () => {
    expect(ids(def.schema, dataCtx('me_model_circuit_simulation'))).toEqual([
      'name',
      'description',
      'circuitName',
      'createdBy',
      'species',
      'registrationDate',
      'status',
    ]);
  });
  it('species facet serializes to the legacy species__name__in (NOT subject__…)', () => {
    const p = serializeQuery(query({ filters: setIn('species') }), def.schema);
    expect(p.species__name__in).toEqual(['x']);
    expect(p.subject__species__name__in).toBeUndefined();
  });
  assertCampaignDetail(def, 'me_model_circuit_simulation');
});

describe('ion_channel_model_simulation parity', () => {
  const def = ionChannelModelSimulationGridDefinition;
  it('omits the Circuit column (legacy ion-channel view-def has no circuit)', () => {
    expect(ids(def.schema, dataCtx('ion_channel_model_simulation'))).toEqual([
      'name',
      'description',
      'createdBy',
      'registrationDate',
      'status',
    ]);
  });
  assertCampaignDetail(def, 'ion_channel_model_simulation');
});
