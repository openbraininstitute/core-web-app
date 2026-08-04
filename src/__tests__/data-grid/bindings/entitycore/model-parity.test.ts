import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { analysisNotebookResultSchema } from '@/features/data-grid/bindings/entitycore/schemas/analysis-notebook-result';
import { analysisNotebookTemplateSchema } from '@/features/data-grid/bindings/entitycore/schemas/analysis-notebook-template';
import { emodelSchema } from '@/features/data-grid/bindings/entitycore/schemas/emodel';
import { ionChannelModelSchema } from '@/features/data-grid/bindings/entitycore/schemas/ion-channel-model';
import { meModelCircuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/me-model-circuit';
import { memodelSchema } from '@/features/data-grid/bindings/entitycore/schemas/memodel';
import { singleNeuronSynaptomeSchema } from '@/features/data-grid/bindings/entitycore/schemas/single-neuron-synaptome';
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
 * Per-entity parity harness for the model + notebook batch (Groups 2/3/7). Locks the
 * serialized query params (filters → `field__op`, sort → order_by) and the
 * context-resolved column set/order to the legacy listing — the two invariants that
 * guarantee no regression. Legacy constraint keys come from the field-defs
 * (`fields-defs/{common,model,experimental,analysis-notebook-template}`), which are
 * the source of truth.
 */

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}
function ctx(
  dataType: string,
  section: IGridContext['section'] = WorkspaceSection.Data
): IGridContext {
  return { dataType, section };
}
function ids<Row>(schema: IGridSchema<Row>, c: IGridContext): string[] {
  return resolveColumns(schema, c).map((col) => col.id);
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
function boolTrue(columnId: string): TFilterModel {
  return {
    [columnId]: {
      columnId,
      operator: OperatorId.Bool,
      value: { kind: FilterValueKind.Boolean, value: true },
    },
  };
}
function sortDesc(columnId: string): Partial<IGridQuery> {
  return { sort: [{ columnId, direction: SortDirection.Desc }] };
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
      // AUXILIARY — declared, hidden until ticked in the chooser's "More columns"
      'exemplarHasSegmentedSpines',
      'ionChannelModels',
      'strainName',
    ]);
  });

  it('the auxiliary columns carry the filters they replaced, with the right sortability', () => {
    const resolved = resolveColumns(s, ctx('emodel'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual(['exemplarHasSegmentedSpines', 'ionChannelModels', 'strainName']);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    expect(
      serializeQuery(query({ filters: boolTrue('exemplarHasSegmentedSpines') }), s)
        .exemplar_morphology__has_segmented_spines
    ).toBe(true);
    expect(
      serializeQuery(query({ filters: ilike('ionChannelModels') }), s)
        .ion_channel_model__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('strainName') }), s).strain__name__ilike).toBe(
      '%foo%'
    );

    // Only `ion_channel_model__name` is in EModelFilter.Constants.ordering_model_fields
    expect(s.columns.find((c) => c.id === 'ionChannelModels')?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc('ionChannelModels')), s).order_by).toEqual([
      '-ion_channel_model__name',
    ]);
    expect(s.columns.find((c) => c.id === 'exemplarHasSegmentedSpines')?.sortable).toBe(false);
    expect(s.columns.find((c) => c.id === 'strainName')?.sortable).toBe(false);
  });

  it('the ion-channel-model cell joins the to-many relation the row actually carries', () => {
    const column = s.columns.find((c) => c.id === 'ionChannelModels');
    // `EModelReadExpanded` (the list response) carries `ion_channel_models`, so this
    // is a real value, not a blank column over a filter-only field.
    expect(
      column?.getValue?.({
        ion_channel_models: [{ name: 'Kv1.1' }, { name: 'Nav1.6' }],
      } as never)
    ).toBe('Kv1.1, Nav1.6');
    expect(column?.getValue?.({} as never)).toBe('');
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
  it('sorts: species/morphology/score/contributions bind their EModelFilter order keys', () => {
    // `species__name` IS in EModelFilter.Constants.ordering_model_fields.
    expect(s.columns.find((c) => c.id === 'species')?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc('species')), s).order_by).toEqual(['-species__name']);
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
  it('Response is display-only; morphology facet-filters and score range-filters', () => {
    expect(s.columns.find((c) => c.id === 'eModelResponse')?.filter).toBeUndefined();
    expect(
      serializeQuery(query({ filters: setIn('exemplarMorphology') }), s)
        .exemplar_morphology__name__in
    ).toEqual(['x']);
    const scored = serializeQuery(query({ filters: range('eModelScore', 1, 9) }), s);
    expect(scored.score__gte).toBe(1);
    expect(scored.score__lte).toBe(9);
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
      // AUXILIARY — declared, hidden until ticked in the chooser's "More columns"
      'morphologyName',
      'morphologyHasSegmentedSpines',
      'emodelName',
      'emodelScore',
      'strainName',
      'contributions',
    ]);
  });

  it('the auxiliary columns carry the filters they replaced, and NONE of them sorts', () => {
    const resolved = resolveColumns(s, ctx('memodel'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual([
      'morphologyName',
      'morphologyHasSegmentedSpines',
      'emodelName',
      'emodelScore',
      'strainName',
      'contributions',
    ]);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    expect(
      serializeQuery(query({ filters: ilike('morphologyName') }), s).morphology__name__ilike
    ).toBe('%foo%');
    expect(
      serializeQuery(query({ filters: boolTrue('morphologyHasSegmentedSpines') }), s)
        .morphology__has_segmented_spines
    ).toBe(true);
    expect(serializeQuery(query({ filters: ilike('emodelName') }), s).emodel__name__ilike).toBe(
      '%foo%'
    );
    const scored = serializeQuery(query({ filters: range('emodelScore', 0, 10) }), s);
    expect(scored.emodel__score__gte).toBe(0);
    expect(scored.emodel__score__lte).toBe(10);
    expect(serializeQuery(query({ filters: ilike('strainName') }), s).strain__name__ilike).toBe(
      '%foo%'
    );
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);

    // MEModelFilter.Constants.ordering_model_fields lists none of these six
    for (const id of aux) {
      expect(s.columns.find((c) => c.id === id)?.sortable).toBe(false);
    }
  });

  /**
   * `MEModelRead` embeds the FULL `CellMorphologyRead` / `EModelRead` (not a nested
   * minimal read) and carries `strain`, so these are real values — not blank columns
   * over filter-only fields.
   */
  it('the nested cells read values the list response actually returns', () => {
    const row = {
      morphology: { name: 'L5 TPC', has_segmented_spines: true },
      emodel: { name: 'cADpyr', score: 42 },
      strain: { name: 'C57BL/6J' },
    } as never;
    expect(s.columns.find((c) => c.id === 'morphologyName')?.getValue?.(row)).toBe('L5 TPC');
    expect(s.columns.find((c) => c.id === 'morphologyHasSegmentedSpines')?.getValue?.(row)).toBe(
      'Yes'
    );
    expect(s.columns.find((c) => c.id === 'emodelName')?.getValue?.(row)).toBe('cADpyr');
    expect(s.columns.find((c) => c.id === 'emodelScore')?.getValue?.(row)).toBe('42');
    expect(s.columns.find((c) => c.id === 'strainName')?.getValue?.(row)).toBe('C57BL/6J');
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
  it('description is display-only; me-model + species filter on their me_model__ keys', () => {
    expect(s.columns.find((c) => c.id === 'description')?.filter).toBeUndefined();
    expect(serializeQuery(query({ filters: setIn('me_model') }), s).me_model__name__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: ilike('species') }), s).me_model__species__name__ilike
    ).toBe('%foo%');
    // Neither is in SingleNeuronSynaptomeFilter's ordering fields.
    expect(s.columns.find((c) => c.id === 'me_model')?.sortable).toBeFalsy();
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
      // AUXILIARY — declared, hidden until ticked in the chooser's "More columns"
      'nmodlSuffix',
      'conductanceName',
      'maxPermeabilityName',
      'isStochastic',
      'strainName',
      'subjectName',
      'contributions',
    ]);
  });

  it('the auxiliary columns carry the filters they replaced', () => {
    const resolved = resolveColumns(s, ctx('ion_channel_model'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual([
      'nmodlSuffix',
      'conductanceName',
      'maxPermeabilityName',
      'isStochastic',
      'strainName',
      'subjectName',
      'contributions',
    ]);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    // the three NMODL text scalars are BARE exact matches — no `__in`, no `__ilike`
    for (const [id, field] of [
      ['nmodlSuffix', 'nmodl_suffix'],
      ['conductanceName', 'conductance_name'],
      ['maxPermeabilityName', 'max_permeability_name'],
    ] as const) {
      const column = s.columns.find((c) => c.id === id);
      expect(column?.filter?.operators).toEqual([OperatorId.Eq]);
      const eq: TFilterModel = {
        [id]: {
          columnId: id,
          operator: OperatorId.Eq,
          value: { kind: FilterValueKind.Text, text: 'v' },
        },
      };
      expect(serializeQuery(query({ filters: eq }), s)[field]).toBe('v');
    }
    expect(serializeQuery(query({ filters: boolTrue('isStochastic') }), s).is_stochastic).toBe(
      true
    );
    expect(
      serializeQuery(query({ filters: ilike('strainName') }), s).subject__strain__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('subjectName') }), s).subject__name__ilike).toBe(
      '%foo%'
    );
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
  });

  it('only Contributors is non-sortable — the other six ARE in ordering_model_fields', () => {
    for (const id of [
      'nmodlSuffix',
      'conductanceName',
      'maxPermeabilityName',
      'isStochastic',
      'strainName',
      'subjectName',
    ]) {
      expect(s.columns.find((c) => c.id === id)?.sortable).toBe(true);
    }
    expect(s.columns.find((c) => c.id === 'contributions')?.sortable).toBe(false);
    // `subject__name` IS listed here — one of the few endpoints that sorts it
    expect(serializeQuery(query(sortDesc('subjectName')), s).order_by).toEqual(['-subject__name']);
    expect(serializeQuery(query(sortDesc('nmodlSuffix')), s).order_by).toEqual(['-nmodl_suffix']);
  });

  /**
   * The `subject__*` filter params address the NESTED subject the list response
   * carries (`IonChannelModelExpanded` → `ScientificArtifactRead` → `SubjectReadMixin`),
   * so the two subject cells must read `subject.…`, not the hand-written TS type's
   * top-level `strain`. Reading the wrong one would ship two blank columns.
   */
  it('the subject cells read the NESTED subject the list response actually returns', () => {
    const row = { subject: { name: 'Rat 12', strain: { name: 'C57BL/6J' } } } as never;
    expect(s.columns.find((c) => c.id === 'subjectName')?.getValue?.(row)).toBe('Rat 12');
    expect(s.columns.find((c) => c.id === 'strainName')?.getValue?.(row)).toBe('C57BL/6J');
  });
  it('species uses the subject__species__name facet; temperature range-serializes', () => {
    expect(
      serializeQuery(query({ filters: setIn('species') }), s).subject__species__name__in
    ).toEqual(['x']);
    const temp: TFilterModel = {
      temperatureCelsius: {
        columnId: 'temperatureCelsius',
        operator: OperatorId.Range,
        value: { kind: FilterValueKind.Range, min: 20, max: 40 },
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
  it('update date sorts on update_date and date-range-filters on update_date__gte/__lte', () => {
    const dated = serializeQuery(
      query({ filters: dateRange('updateDate', '2026-01-01', '2026-02-01') }),
      s
    );
    expect(dated.update_date__gte).toBe('2026-01-01');
    expect(dated.update_date__lte).toBe('2026-02-01');
    expect(serializeQuery(query(sortDesc('updateDate')), s).order_by).toEqual(['-update_date']);
    expect(s.columns.find((c) => c.id === 'description')?.filter).toBeUndefined();
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
  });
});
