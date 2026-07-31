import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';

import { OperatorId, resolveColumns } from '../../../core';
import { serializeQuery } from '../query-serializer';
import { analysisNotebookResultSchema } from '../schemas/analysis-notebook-result';
import { analysisNotebookTemplateSchema } from '../schemas/analysis-notebook-template';
import { emodelSchema } from '../schemas/emodel';
import { ionChannelModelSchema } from '../schemas/ion-channel-model';
import { meModelCircuitSchema } from '../schemas/me-model-circuit';
import { memodelSchema } from '../schemas/memodel';
import { singleNeuronSynaptomeSchema } from '../schemas/single-neuron-synaptome';

import type { FilterModel, GridContext, GridQuery, GridSchema } from '../../../core';

/**
 * Per-entity parity harness for the model + notebook batch (Groups 2/3/7). Locks the
 * serialized query params (filters → `field__op`, sort → order_by) and the
 * context-resolved column set/order to the legacy listing — the two invariants that
 * guarantee no regression. Legacy constraint keys come from the field-defs
 * (`fields-defs/{common,model,experimental,analysis-notebook-template}`), which are
 * the source of truth.
 */

function query(over: Partial<GridQuery> = {}): GridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}
function ctx(dataType: string, section: WorkspaceSection = WorkspaceSection.Data): GridContext {
  return { dataType, section };
}
function ids<Row>(schema: GridSchema<Row>, c: GridContext): string[] {
  return resolveColumns(schema, c).map((col) => col.id);
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
function boolTrue(columnId: string): FilterModel {
  return {
    [columnId]: { columnId, operator: OperatorId.Bool, value: { kind: 'boolean', value: true } },
  };
}
function sortDesc(columnId: string): Partial<GridQuery> {
  return { sort: [{ columnId, direction: 'desc' }] };
}

describe('emodel parity', () => {
  const s = emodelSchema;
  it('columns match the legacy ViewDefForEmodel order', () => {
    expect(ids(s, ctx('emodel'))).toEqual([
      'name',
      'eModelResponse',
      'brainRegion',
      'species',
      'mtype',
      'etype',
      'exemplarMorphology',
      'eModelScore',
      'contributions',
      'registrationDate',
    ]);
  });
  it('name ilike + mtype/etype/species/contribution facets serialize to legacy keys', () => {
    expect(serializeQuery(query({ filters: ilike('name') }), s).name__ilike).toBe('%foo%');
    expect(serializeQuery(query({ filters: setIn('mtype') }), s).mtype__pref_label__in).toEqual([
      'x',
    ]);
    expect(serializeQuery(query({ filters: setIn('etype') }), s).etype__pref_label__in).toEqual([
      'x',
    ]);
    expect(serializeQuery(query({ filters: setIn('species') }), s).species__name__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
  });
  it('sorts: species is NOT sortable; morphology/score/contributions bind their legacy order keys', () => {
    expect(s.columns.find((c) => c.id === 'species')?.sortable).toBeFalsy();
    expect(serializeQuery(query(sortDesc('exemplarMorphology')), s).order_by).toEqual([
      '-exemplar_morphology__name',
    ]);
    expect(serializeQuery(query(sortDesc('eModelScore')), s).order_by).toEqual(['-score']);
    expect(serializeQuery(query(sortDesc('contributions')), s).order_by).toEqual([
      '-contribution__pref_label',
    ]);
    expect(serializeQuery(query(sortDesc('registrationDate')), s).order_by).toEqual([
      '-creation_date',
    ]);
  });
  it('Response / morphology / score carry no column filter', () => {
    for (const id of ['eModelResponse', 'exemplarMorphology', 'eModelScore']) {
      expect(s.columns.find((c) => c.id === id)?.filter).toBeUndefined();
    }
  });
});

describe('memodel parity', () => {
  const s = memodelSchema;
  it('columns match the legacy ViewDefForMemodel order', () => {
    expect(ids(s, ctx('memodel'))).toEqual([
      'name',
      'meModelMorphologyPreview',
      'meModelTracePreview',
      'validationStatus',
      'brainRegion',
      'species',
      'mtype',
      'etype',
      'createdBy',
      'registrationDate',
    ]);
  });
  it('mtype/etype/species facets + createdBy serialize to legacy keys', () => {
    expect(serializeQuery(query({ filters: setIn('mtype') }), s).mtype__pref_label__in).toEqual([
      'x',
    ]);
    expect(serializeQuery(query({ filters: setIn('etype') }), s).etype__pref_label__in).toEqual([
      'x',
    ]);
    expect(serializeQuery(query({ filters: setIn('species') }), s).species__name__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: setIn('createdBy') }), s).created_by__pref_label__in
    ).toEqual(['x']);
  });
  it('sorts: species/validation are NOT sortable; brainRegion/createdBy bind legacy keys', () => {
    expect(s.columns.find((c) => c.id === 'species')?.sortable).toBeFalsy();
    expect(s.columns.find((c) => c.id === 'validationStatus')?.sortable).toBeFalsy();
    expect(serializeQuery(query(sortDesc('brainRegion')), s).order_by).toEqual([
      '-brain_region__name',
    ]);
    expect(serializeQuery(query(sortDesc('createdBy')), s).order_by).toEqual([
      '-created_by__pref_label',
    ]);
  });
});

describe('me_model_circuit parity', () => {
  const s = meModelCircuitSchema;
  it('reuses the memodel column set verbatim', () => {
    expect(ids(s, ctx('me_model_circuit'))).toEqual(ids(memodelSchema, ctx('memodel')));
  });
  it('mtype/created_by facets serialize identically to memodel', () => {
    expect(serializeQuery(query({ filters: setIn('mtype') }), s).mtype__pref_label__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: setIn('createdBy') }), s).created_by__pref_label__in
    ).toEqual(['x']);
  });
});

describe('single_neuron_synaptome parity', () => {
  const s = singleNeuronSynaptomeSchema;
  it('columns match the legacy ViewDefForSingleNeuronSynaptome order', () => {
    expect(ids(s, ctx('single_neuron_synaptome'))).toEqual([
      'name',
      'description',
      'me_model',
      'mtype',
      'etype',
      'brainRegion',
      'species',
      'createdBy',
      'registrationDate',
    ]);
  });
  it('m-type/e-type filter+sort through the me_model relation keys', () => {
    expect(
      serializeQuery(query({ filters: setIn('mtype') }), s).me_model__mtype__pref_label__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: setIn('etype') }), s).me_model__etype__pref_label__in
    ).toEqual(['x']);
    expect(serializeQuery(query(sortDesc('mtype')), s).order_by).toEqual([
      '-me_model__mtype__pref_label',
    ]);
    expect(serializeQuery(query(sortDesc('etype')), s).order_by).toEqual([
      '-me_model__etype__pref_label',
    ]);
  });
  it('description / me-model / species are display-only (no column filter)', () => {
    for (const id of ['description', 'me_model', 'species']) {
      expect(s.columns.find((c) => c.id === id)?.filter).toBeUndefined();
    }
    expect(s.columns.find((c) => c.id === 'species')?.sortable).toBeFalsy();
  });
  it('createdBy sorts + facet-filters on created_by__pref_label', () => {
    expect(
      serializeQuery(query({ filters: setIn('createdBy') }), s).created_by__pref_label__in
    ).toEqual(['x']);
    expect(serializeQuery(query(sortDesc('createdBy')), s).order_by).toEqual([
      '-created_by__pref_label',
    ]);
  });
});

describe('ion_channel_model parity', () => {
  const s = ionChannelModelSchema;
  it('columns match the legacy ViewDefForIonChannelModel order', () => {
    expect(ids(s, ctx('ion_channel_model'))).toEqual([
      'preview',
      'name',
      'brainRegion',
      'species',
      'temperatureCelsius',
      'isTemperatureDependent',
      'isLjpCorrected',
      'registrationDate',
    ]);
  });
  it('species uses the subject__species__name facet; temperature range-serializes', () => {
    expect(
      serializeQuery(query({ filters: setIn('species') }), s).subject__species__name__in
    ).toEqual(['x']);
    const temp: FilterModel = {
      temperatureCelsius: {
        columnId: 'temperatureCelsius',
        operator: OperatorId.Range,
        value: { kind: 'range', min: 20, max: 40 },
      },
    };
    const p = serializeQuery(query({ filters: temp }), s);
    expect(p.temperature_celsius__gte).toBe(20);
    expect(p.temperature_celsius__lte).toBe(40);
  });
  it('boolean facets serialize to the bare field name (no __op suffix) and sort on it', () => {
    const dep = serializeQuery(query({ filters: boolTrue('isTemperatureDependent') }), s);
    expect(dep.is_temperature_dependent).toBe(true);
    const ljp = serializeQuery(query({ filters: boolTrue('isLjpCorrected') }), s);
    expect(ljp.is_ljp_corrected).toBe(true);
    expect(serializeQuery(query(sortDesc('isTemperatureDependent')), s).order_by).toEqual([
      '-is_temperature_dependent',
    ]);
    expect(serializeQuery(query(sortDesc('isLjpCorrected')), s).order_by).toEqual([
      '-is_ljp_corrected',
    ]);
    expect(serializeQuery(query(sortDesc('temperatureCelsius')), s).order_by).toEqual([
      '-temperature_celsius',
    ]);
    expect(serializeQuery(query(sortDesc('species')), s).order_by).toEqual([
      '-subject__species__name',
    ]);
  });
});

describe('analysis_notebook_template parity', () => {
  const s = analysisNotebookTemplateSchema;
  it('columns match the legacy viewDefForNotebook order', () => {
    expect(ids(s, ctx('analysis_notebook_template', WorkspaceSection.Notebooks))).toEqual([
      'name',
      'description',
      'notebook_scale',
      'contributions',
      'registrationDate',
    ]);
  });
  it('name ilike + contribution facet serialize to legacy keys; scale/description display-only', () => {
    expect(serializeQuery(query({ filters: ilike('name') }), s).name__ilike).toBe('%foo%');
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
    expect(s.columns.find((c) => c.id === 'notebook_scale')?.filter).toBeUndefined();
    expect(s.columns.find((c) => c.id === 'notebook_scale')?.sortable).toBeFalsy();
    expect(s.columns.find((c) => c.id === 'description')?.filter).toBeUndefined();
    expect(s.columns.find((c) => c.id === 'contributions')?.sortable).toBeFalsy();
  });
});

describe('analysis_notebook_result parity', () => {
  const s = analysisNotebookResultSchema;
  it('columns match the legacy viewDefForNotebookResult order', () => {
    expect(ids(s, ctx('analysis_notebook_result', WorkspaceSection.Notebooks))).toEqual([
      'notebook_image_preview',
      'name',
      'description',
      'contributions',
      'updateDate',
    ]);
  });
  it('update date is display + sortable on updated_at with no column filter', () => {
    const upd = s.columns.find((c) => c.id === 'updateDate');
    expect(upd?.filter).toBeUndefined();
    expect(serializeQuery(query(sortDesc('updateDate')), s).order_by).toEqual(['-updated_at']);
    expect(s.columns.find((c) => c.id === 'description')?.filter).toBeUndefined();
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
  });
});
