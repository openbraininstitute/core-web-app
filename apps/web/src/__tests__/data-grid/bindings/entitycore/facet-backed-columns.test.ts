import { describe, expect, it } from 'vitest';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { cellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/cell-morphology';
import { electricalCellRecordingSchema } from '@/features/data-grid/bindings/entitycore/schemas/electrical-cell-recording';
import { emodelSchema } from '@/features/data-grid/bindings/entitycore/schemas/emodel';
import { experimentalBoutonDensitySchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-bouton-density';
import { experimentalNeuronDensitySchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-neuron-density';
import { experimentalSynapsesPerConnectionSchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-synapses-per-connection';
import { synthesizedCellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/synthesized-cell-morphology';
import {
  FilterOptionsKind,
  FilterValueKind,
  OperatorId,
  resolveFilterTargets,
} from '@/features/data-grid/core';

import type { IGridQuery, IGridSchema, TFilterModel } from '@/features/data-grid/core';

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

function setIn(columnId: string, values: string[]): TFilterModel {
  return {
    [columnId]: {
      columnId,
      operator: OperatorId.In,
      value: { kind: FilterValueKind.Set, values },
    },
  };
}

function column<Row>(schema: IGridSchema<Row>, id: string) {
  const found = schema.columns.find((c) => c.id === id);
  if (!found) throw new Error(`${schema.id} has no ${id} column`);
  return found;
}

/** Every listing whose endpoint returns a `strain` facet bucket. */
const STRAIN_LISTINGS: ReadonlyArray<[string, IGridSchema<never>]> = [
  ['cell_morphology', cellMorphologySchema as IGridSchema<never>],
  ['electrical_cell_recording', electricalCellRecordingSchema as IGridSchema<never>],
  ['experimental_neuron_density', experimentalNeuronDensitySchema as IGridSchema<never>],
  ['experimental_bouton_density', experimentalBoutonDensitySchema as IGridSchema<never>],
  [
    'experimental_synapses_per_connection',
    experimentalSynapsesPerConnectionSchema as IGridSchema<never>,
  ],
  ['synthesized_cell_morphology', synthesizedCellMorphologySchema as IGridSchema<never>],
];

describe('strain filters from the server facet', () => {
  it.each(STRAIN_LISTINGS)('%s picks strains from the facet bucket', (_name, schema) => {
    const [target] = resolveFilterTargets(column(schema, 'strainName'));
    expect(target?.facetKey).toBe('strain');
    expect(target?.options).toEqual({ kind: FilterOptionsKind.Facets });
    // `In` leads, so the picker opens on the checklist rather than a text box
    expect(target?.operators[0]).toBe(OperatorId.In);
    // free entry would swap the facet checklist for a paste-a-list textarea
    expect(target?.freeEntry).toBeUndefined();
  });

  it.each(STRAIN_LISTINGS)('%s serializes to subject__strain__name__in', (_name, schema) => {
    expect(
      serializeQuery(query({ filters: setIn('strainName', ['C57BL/6J']) }), schema)
        .subject__strain__name__in
    ).toEqual(['C57BL/6J']);
  });
});

describe('emodel ion channel models', () => {
  const ionChannelModels = column(emodelSchema, 'ionChannelModels');

  it('picks models from the ion_channel_model facet bucket', () => {
    const [target] = resolveFilterTargets(ionChannelModels);
    expect(target?.facetKey).toBe('ion_channel_model');
    expect(target?.options).toEqual({ kind: FilterOptionsKind.Facets });
    expect(target?.operators[0]).toBe(OperatorId.In);
    expect(target?.freeEntry).toBeUndefined();
  });

  it('serializes to the existential ion_channel_model__name__in', () => {
    expect(
      serializeQuery(query({ filters: setIn('ionChannelModels', ['Kv1.1']) }), emodelSchema)
        .ion_channel_model__name__in
    ).toEqual(['Kv1.1']);
  });

  it('renders through the list cell while keeping the joined names as the value', () => {
    expect(ionChannelModels.cellRenderer).toBe('ionChannelModels');
    expect(
      ionChannelModels.getValue?.({
        ion_channel_models: [{ name: 'Kv1.1' }, { name: 'Nav1.6' }],
      } as never)
    ).toBe('Kv1.1, Nav1.6');
  });
});
