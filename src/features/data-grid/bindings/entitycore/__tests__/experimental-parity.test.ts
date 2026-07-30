import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';

import { OperatorId, resolveColumns } from '../../../core';
import { serializeQuery } from '../query-serializer';
import { electricalCellRecordingSchema } from '../schemas/electrical-cell-recording';
import { emCellMeshSchema } from '../schemas/em-cell-mesh';
import { experimentalBoutonDensitySchema } from '../schemas/experimental-bouton-density';
import { experimentalNeuronDensitySchema } from '../schemas/experimental-neuron-density';
import { experimentalSynapsesPerConnectionSchema } from '../schemas/experimental-synapses-per-connection';
import { ionChannelRecordingSchema } from '../schemas/ion-channel-recording';
import { universalCellMorphologySchema } from '../schemas/universal-cell-morphology';

import type { FilterModel, GridContext, GridQuery, GridSchema } from '../../../core';

/**
 * Per-entity parity harness for the experimental batch: locks the serialized query
 * params (filters → `field__op`, sort → order_by) and the context-resolved column
 * set/order to the legacy listing, the two invariants that guarantee no regression.
 * The exact legacy constraint keys are the source of truth (from the field-defs).
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
function setInSingle(columnId: string): FilterModel {
  return {
    [columnId]: {
      columnId,
      operator: OperatorId.InSingleUnderscore,
      value: { kind: 'set', values: ['x'] },
    },
  };
}
function sortDesc(columnId: string): Partial<GridQuery> {
  return { sort: [{ columnId, direction: 'desc' }] };
}

describe('electrical_cell_recording parity', () => {
  const s = electricalCellRecordingSchema;
  it('columns match the legacy order', () => {
    expect(ids(s, dataCtx('electrical_cell_recording'))).toEqual([
      'preview',
      'brainRegion',
      'species',
      'etype',
      'name',
      'contributions',
      'registrationDate',
    ]);
  });
  it('etype/species/contribution facets serialize to the legacy __in keys', () => {
    expect(serializeQuery(query({ filters: setIn('etype') }), s).etype__pref_label__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: setIn('species') }), s).subject__species__name__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
  });
  it('default sort is -creation_date', () => {
    expect(
      serializeQuery(query({ sort: [{ columnId: 'registrationDate', direction: 'desc' }] }), s)
        .order_by
    ).toEqual(['-creation_date']);
  });
});

describe('ion_channel_recording parity', () => {
  const s = ionChannelRecordingSchema;
  it('columns match the legacy order', () => {
    expect(ids(s, dataCtx('ion_channel_recording'))).toEqual([
      'preview',
      'brainRegion',
      'species',
      'ionChannel',
      'temperature',
      'cellLine',
      'name',
      'contributions',
      'registrationDate',
    ]);
  });
  it('ion channel / cell line ilike + temperature range serialize to legacy keys', () => {
    expect(
      serializeQuery(query({ filters: ilike('ionChannel') }), s).ion_channel__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('cellLine') }), s).cell_line__ilike).toBe('%foo%');
    const temp: FilterModel = {
      temperature: {
        columnId: 'temperature',
        operator: OperatorId.Range,
        value: { kind: 'range', min: 20, max: 40 },
      },
    };
    const p = serializeQuery(query({ filters: temp }), s);
    expect(p.temperature__gte).toBe(20);
    expect(p.temperature__lte).toBe(40);
  });
});

describe('universal_cell_morphology parity', () => {
  const s = universalCellMorphologySchema;
  it('data section hides the build-workflow-only generation/protocol columns', () => {
    expect(ids(s, dataCtx('universal_cell_morphology'))).toEqual([
      'preview',
      'brainRegion',
      'species',
      'mtype',
      'name',
      'contributions',
      'registrationDate',
    ]);
  });
  it('build-workflow section reveals generation type + protocol design', () => {
    const cols = ids(s, {
      dataType: 'universal_cell_morphology',
      section: WorkspaceSection.BuildWorkflow,
    });
    expect(cols).toContain('generationType');
    expect(cols).toContain('protocolDesign');
  });
  it('generation/protocol serialize to the legacy protocol __in keys', () => {
    const gen: FilterModel = {
      generationType: {
        columnId: 'generationType',
        operator: OperatorId.In,
        value: { kind: 'set', values: ['digital_reconstruction'] },
      },
    };
    expect(
      serializeQuery(query({ filters: gen }), s).cell_morphology_protocol__generation_type__in
    ).toEqual(['digital_reconstruction']);
  });
  it('m-type is not sortable but still filters as mtype__pref_label__in', () => {
    expect(s.columns.find((c) => c.id === 'mtype')?.sortable).toBe(false);
    expect(serializeQuery(query({ filters: setIn('mtype') }), s).mtype__pref_label__in).toEqual([
      'x',
    ]);
  });
});

describe('experimental_neuron_density parity', () => {
  const s = experimentalNeuronDensitySchema;
  it('columns match the legacy order', () => {
    expect(ids(s, dataCtx('experimental_neuron_density'))).toEqual([
      'brainRegion',
      'species',
      'mtype',
      'etype',
      'density',
      'numberOfMeasurements',
      'name',
      'subjectAge',
      'contributions',
      'registrationDate',
    ]);
  });
  it('species/mtype/etype/contribution facets serialize to legacy __in keys', () => {
    expect(
      serializeQuery(query({ filters: setIn('species') }), s).subject__species__name__in
    ).toEqual(['x']);
    expect(serializeQuery(query({ filters: setIn('mtype') }), s).mtype__pref_label__in).toEqual([
      'x',
    ]);
    expect(serializeQuery(query({ filters: setIn('etype') }), s).etype__pref_label__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
  });
  it('density is a non-sortable, non-filterable measurement column; age sorts on subject__age_value', () => {
    const density = s.columns.find((c) => c.id === 'density');
    expect(density?.sortable).toBeFalsy();
    expect(density?.filter).toBeUndefined();
    expect(serializeQuery(query(sortDesc('subjectAge')), s).order_by).toEqual([
      '-subject__age_value',
    ]);
  });
  it('default sort is -creation_date', () => {
    expect(serializeQuery(query(sortDesc('registrationDate')), s).order_by).toEqual([
      '-creation_date',
    ]);
  });
});

describe('experimental_bouton_density parity', () => {
  const s = experimentalBoutonDensitySchema;
  it('columns match the legacy order', () => {
    expect(ids(s, dataCtx('experimental_bouton_density'))).toEqual([
      'brainRegion',
      'species',
      'mtype',
      'meanStd',
      'sem',
      'numberOfMeasurements',
      'contributions',
    ]);
  });
  it('measurement columns sort on the legacy measurement_*__value keys', () => {
    expect(s.columns.find((c) => c.id === 'meanStd')?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc('meanStd')), s).order_by).toEqual([
      '-measurement_mean__value',
    ]);
    expect(serializeQuery(query(sortDesc('sem')), s).order_by).toEqual([
      '-measurement_standard_error__value',
    ]);
    expect(serializeQuery(query(sortDesc('numberOfMeasurements')), s).order_by).toEqual([
      '-measurement_sample_size__value',
    ]);
  });
});

describe('experimental_synapses_per_connection parity', () => {
  const s = experimentalSynapsesPerConnectionSchema;
  it('columns match the legacy order', () => {
    expect(ids(s, dataCtx('experimental_synapses_per_connection'))).toEqual([
      'preRegion',
      'postRegion',
      'preMtype',
      'postMtype',
      'meanStd',
      'species',
      'subjectAge',
      'contributions',
    ]);
  });
  it('pre/post region + cell-type filters serialize to legacy keys (post_region uses SINGLE underscore)', () => {
    expect(serializeQuery(query({ filters: setIn('preRegion') }), s).pre_region__name__in).toEqual([
      'x',
    ]);
    // the gotcha: post_region__name_in — single underscore before `in`
    const post = serializeQuery(query({ filters: setInSingle('postRegion') }), s);
    expect(post.post_region__name_in).toEqual(['x']);
    expect(post.post_region__name__in).toBeUndefined();
    expect(
      serializeQuery(query({ filters: setIn('preMtype') }), s).pre_mtype__pref_label__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: setIn('postMtype') }), s).post_mtype__pref_label__in
    ).toEqual(['x']);
  });
  it('mean ± std is not sortable for this entity', () => {
    expect(s.columns.find((c) => c.id === 'meanStd')?.sortable).toBeFalsy();
  });
});

describe('em_cell_mesh parity', () => {
  const s = emCellMeshSchema;
  it('columns match the legacy order', () => {
    expect(ids(s, dataCtx('em_cell_mesh'))).toEqual([
      'name',
      'brainRegion',
      'species',
      'releaseVersion',
      'emDataset',
      'registrationDate',
    ]);
  });
  it('version facet + dataset ilike serialize to legacy keys; species not sortable', () => {
    expect(
      serializeQuery(query({ filters: setIn('releaseVersion') }), s).release_version__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: ilike('emDataset') }), s)
        .em_dense_reconstruction_dataset__name__ilike
    ).toBe('%foo%');
    expect(s.columns.find((c) => c.id === 'species')?.sortable).toBe(false);
  });
});
