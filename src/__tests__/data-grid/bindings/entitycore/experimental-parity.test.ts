import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { electricalCellRecordingSchema } from '@/features/data-grid/bindings/entitycore/schemas/electrical-cell-recording';
import { emCellMeshSchema } from '@/features/data-grid/bindings/entitycore/schemas/em-cell-mesh';
import { experimentalBoutonDensitySchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-bouton-density';
import { experimentalNeuronDensitySchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-neuron-density';
import { experimentalSynapsesPerConnectionSchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-synapses-per-connection';
import { ionChannelRecordingSchema } from '@/features/data-grid/bindings/entitycore/schemas/ion-channel-recording';
import { synthesizedCellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/synthesized-cell-morphology';
import { universalCellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/universal-cell-morphology';
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
 * Per-entity parity harness for the experimental batch: locks the serialized query
 * params (filters → `field__op`, sort → order_by) and the context-resolved column
 * set/order to the legacy listing, the two invariants that guarantee no regression.
 * The exact legacy constraint keys are the source of truth (from the field-defs).
 */

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}
const dataCtx = (dataType: string): IGridContext => ({ dataType, section: WorkspaceSection.Data });

function ids<Row>(schema: IGridSchema<Row>, ctx: IGridContext): string[] {
  return resolveColumns(schema, ctx).map((c) => c.id);
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
function setInSingle(columnId: string): TFilterModel {
  return {
    [columnId]: {
      columnId,
      operator: OperatorId.InSingleUnderscore,
      value: { kind: FilterValueKind.Set, values: ['x'] },
    },
  };
}
function sortDesc(columnId: string): Partial<IGridQuery> {
  return { sort: [{ columnId, direction: SortDirection.Desc }] };
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
      'lifecycleStatus',
      'contributions',
      'registrationDate',
      // AUXILIARY — declared, hidden until ticked in the chooser
      'recordingType',
      'recordingOrigin',
      'strainName',
      'subjectName',
    ]);
  });
  it('the auxiliary columns carry the filters they replaced, and NONE of them sorts', () => {
    const resolved = resolveColumns(s, dataCtx('electrical_cell_recording'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual(['recordingType', 'recordingOrigin', 'strainName', 'subjectName']);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    expect(
      serializeQuery(query({ filters: setIn('recordingType') }), s).recording_type__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: ilike('strainName') }), s).subject__strain__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('subjectName') }), s).subject__name__ilike).toBe(
      '%foo%'
    );

    // ElectricalCellRecordingFilter.Constants.ordering_model_fields lists none of them
    for (const id of aux) {
      expect(s.columns.find((c) => c.id === id)?.sortable).toBe(false);
    }
  });
  it('recording origin offers ONLY the bare param — the listing pins recording_origin__in', () => {
    const origin = s.columns.find((c) => c.id === 'recordingOrigin');
    expect(origin?.filter?.operators).toEqual([OperatorId.Eq]);
    expect(origin?.filter?.targets?.[0]?.operators).toEqual([OperatorId.Eq]);
    const eq: TFilterModel = {
      recordingOrigin: {
        columnId: 'recordingOrigin',
        operator: OperatorId.Eq,
        value: { kind: FilterValueKind.Text, text: 'in_vivo' },
      },
    };
    const params = serializeQuery(query({ filters: eq }), s);
    expect(params.recording_origin).toBe('in_vivo');
    expect(params.recording_origin__in).toBeUndefined();
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
      serializeQuery(
        query({ sort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }] }),
        s
      ).order_by
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
      'lifecycleStatus',
      'contributions',
      'registrationDate',
      // AUXILIARY — declared, hidden until ticked in the chooser
      'ionChannelLabel',
      'ionChannelGene',
      'validationPassed',
      'validationName',
      'recordingType',
      'strainName',
      'subjectName',
    ]);
  });
  it('the auxiliary columns carry the filters they replaced', () => {
    const resolved = resolveColumns(s, dataCtx('ion_channel_recording'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual([
      'ionChannelLabel',
      'ionChannelGene',
      'validationPassed',
      'validationName',
      'recordingType',
      'strainName',
      'subjectName',
    ]);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    const eq = (columnId: string, value: string): TFilterModel => ({
      [columnId]: {
        columnId,
        operator: OperatorId.Eq,
        value: { kind: FilterValueKind.Text, text: value },
      },
    });
    expect(
      serializeQuery(query({ filters: eq('ionChannelLabel', 'Kv1.1') }), s).ion_channel__label
    ).toBe('Kv1.1');
    expect(
      serializeQuery(query({ filters: eq('ionChannelGene', 'KCNA1') }), s).ion_channel__gene
    ).toBe('KCNA1');
    const passed: TFilterModel = {
      validationPassed: {
        columnId: 'validationPassed',
        operator: OperatorId.Bool,
        value: { kind: FilterValueKind.Boolean, value: true },
      },
    };
    expect(serializeQuery(query({ filters: passed }), s).validation_result__passed).toBe(true);
    expect(
      serializeQuery(query({ filters: ilike('validationName') }), s).validation_result__name__ilike
    ).toBe('%foo%');
    expect(
      serializeQuery(query({ filters: setIn('recordingType') }), s).recording_type__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: ilike('strainName') }), s).subject__strain__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('subjectName') }), s).subject__name__ilike).toBe(
      '%foo%'
    );
  });
  it('only the ion-channel scalars are in ordering_model_fields', () => {
    expect(serializeQuery(query(sortDesc('ionChannelLabel')), s).order_by).toEqual([
      '-ion_channel__label',
    ]);
    expect(serializeQuery(query(sortDesc('ionChannelGene')), s).order_by).toEqual([
      '-ion_channel__gene',
    ]);
    for (const id of [
      'validationPassed',
      'validationName',
      'recordingType',
      'strainName',
      'subjectName',
    ]) {
      expect(s.columns.find((c) => c.id === id)?.sortable).toBe(false);
    }
  });
  it('ion channel / cell line ilike + temperature range serialize to legacy keys', () => {
    expect(
      serializeQuery(query({ filters: ilike('ionChannel') }), s).ion_channel__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('cellLine') }), s).cell_line__ilike).toBe('%foo%');
    const temp: TFilterModel = {
      temperature: {
        columnId: 'temperature',
        operator: OperatorId.Range,
        value: { kind: FilterValueKind.Range, min: 20, max: 40 },
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
      'lifecycleStatus',
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
    const gen: TFilterModel = {
      generationType: {
        columnId: 'generationType',
        operator: OperatorId.In,
        value: { kind: FilterValueKind.Set, values: ['digital_reconstruction'] },
      },
    };
    expect(
      serializeQuery(query({ filters: gen }), s).cell_morphology_protocol__generation_type__in
    ).toEqual(['digital_reconstruction']);
  });
  it('m-type sorts + filters on mtype__pref_label (same CellMorphologyFilter as cell_morphology)', () => {
    expect(s.columns.find((c) => c.id === 'mtype')?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc('mtype')), s).order_by).toEqual(['-mtype__pref_label']);
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
      'lifecycleStatus',
      'contributions',
      'registrationDate',
      // AUXILIARY — declared, hidden until ticked in the chooser's "More columns"
      'strainName',
      'subjectName',
    ]);
  });
  it('the auxiliary columns are hidden by default and carry the subject filters', () => {
    const resolved = resolveColumns(s, dataCtx('experimental_neuron_density'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual(['strainName', 'subjectName']);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    expect(
      serializeQuery(query({ filters: ilike('strainName') }), s).subject__strain__name__ilike
    ).toBe('%foo%');
    expect(
      serializeQuery(query({ filters: setIn('strainName') }), s).subject__strain__name__in
    ).toEqual(['x']);
    expect(serializeQuery(query({ filters: ilike('subjectName') }), s).subject__name__ilike).toBe(
      '%foo%'
    );
    expect(serializeQuery(query({ filters: setIn('subjectName') }), s).subject__name__in).toEqual([
      'x',
    ]);
  });
  it('only subject__strain__name is sortable — subject__name is not in ordering_model_fields', () => {
    expect(s.columns.find((c) => c.id === 'strainName')?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc('strainName')), s).order_by).toEqual([
      '-subject__strain__name',
    ]);
    expect(s.columns.find((c) => c.id === 'subjectName')?.sortable).toBe(false);
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

describe('synthesized_cell_morphology parity', () => {
  const s = synthesizedCellMorphologySchema;
  it('columns match the legacy synthesized-morphology view-def order', () => {
    expect(ids(s, dataCtx('synthesized_cell_morphology'))).toEqual([
      'preview',
      'brainRegion',
      'species',
      'mtype',
      'name',
      'lifecycleStatus',
      'contributions',
      'registrationDate',
      // AUXILIARY — declared, hidden until ticked in the chooser's "More columns"
      'generationType',
      'protocolDesign',
      'protocolName',
      'protocolDocument',
      'strainName',
      'subjectName',
      'hasSegmentedSpines',
    ]);
  });

  it('the auxiliary columns carry the filters they replaced', () => {
    const resolved = resolveColumns(s, dataCtx('synthesized_cell_morphology'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual([
      'generationType',
      'protocolDesign',
      'protocolName',
      'protocolDocument',
      'strainName',
      'subjectName',
      'hasSegmentedSpines',
    ]);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    expect(
      serializeQuery(query({ filters: ilike('protocolName') }), s)
        .cell_morphology_protocol__name__ilike
    ).toBe('%foo%');
    expect(
      serializeQuery(query({ filters: setIn('protocolDesign') }), s)
        .cell_morphology_protocol__protocol_design__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: ilike('strainName') }), s).subject__strain__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('subjectName') }), s).subject__name__ilike).toBe(
      '%foo%'
    );
    const spines: TFilterModel = {
      hasSegmentedSpines: {
        columnId: 'hasSegmentedSpines',
        operator: OperatorId.Bool,
        value: { kind: FilterValueKind.Boolean, value: true },
      },
    };
    expect(serializeQuery(query({ filters: spines }), s).has_segmented_spines).toBe(true);
  });

  it('sortability follows CellMorphologyFilter ordering_model_fields exactly', () => {
    // IN the allowlist
    for (const id of [
      'generationType',
      'protocolName',
      'strainName',
      'subjectName',
      'hasSegmentedSpines',
    ]) {
      expect(s.columns.find((c) => c.id === id)?.sortable).toBe(true);
    }
    // NOT in it — an order_by outside the list is a hard 422
    expect(s.columns.find((c) => c.id === 'protocolDesign')?.sortable).toBe(false);
    expect(s.columns.find((c) => c.id === 'protocolDocument')?.sortable).toBe(false);
    expect(serializeQuery(query(sortDesc('protocolName')), s).order_by).toEqual([
      '-cell_morphology_protocol__name',
    ]);
    expect(serializeQuery(query(sortDesc('subjectName')), s).order_by).toEqual(['-subject__name']);
  });

  it('Name is essential — the first column is a thumbnail, not an identifier', () => {
    expect(s.columns.find((c) => c.id === 'name')?.essential).toBe(true);
  });
  it('species/mtype/contribution facets serialize to legacy __in keys', () => {
    expect(
      serializeQuery(query({ filters: setIn('species') }), s).subject__species__name__in
    ).toEqual(['x']);
    expect(serializeQuery(query({ filters: setIn('mtype') }), s).mtype__pref_label__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
  });
  it('m-type IS server-sortable here (unlike universal) → mtype__pref_label', () => {
    expect(s.columns.find((c) => c.id === 'mtype')?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc('mtype')), s).order_by).toEqual(['-mtype__pref_label']);
  });
  it('name ilike + brain-region/registration sorts serialize to legacy keys', () => {
    expect(serializeQuery(query({ filters: ilike('name') }), s).name__ilike).toBe('%foo%');
    expect(serializeQuery(query(sortDesc('brainRegion')), s).order_by).toEqual([
      '-brain_region__name',
    ]);
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
      'lifecycleStatus',
      'contributions',
      // AUXILIARY — declared, hidden until ticked in the chooser's "More columns"
      'name',
      'strainName',
      'subjectName',
    ]);
  });
  it('the auxiliary columns are hidden by default and carry the filters they replaced', () => {
    const resolved = resolveColumns(s, dataCtx('experimental_bouton_density'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual(['name', 'strainName', 'subjectName']);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    // `name` is legitimate as a column HERE: this listing has no Name column
    expect(serializeQuery(query({ filters: ilike('name') }), s).name__ilike).toBe('%foo%');
    expect(serializeQuery(query({ filters: setIn('name') }), s).name__in).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: ilike('strainName') }), s).subject__strain__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('subjectName') }), s).subject__name__ilike).toBe(
      '%foo%'
    );
  });
  it('name and strain sort; subject__name is not in ordering_model_fields', () => {
    expect(serializeQuery(query(sortDesc('name')), s).order_by).toEqual(['-name']);
    expect(serializeQuery(query(sortDesc('strainName')), s).order_by).toEqual([
      '-subject__strain__name',
    ]);
    expect(s.columns.find((c) => c.id === 'subjectName')?.sortable).toBe(false);
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
      'lifecycleStatus',
      'contributions',
      // AUXILIARY — declared, hidden until ticked in the chooser
      'name',
      'brainRegionName',
      'brainRegionAcronym',
      'strainName',
      'subjectName',
    ]);
  });
  it('the auxiliary columns are hidden by default and carry the filters they replaced', () => {
    const resolved = resolveColumns(s, dataCtx('experimental_synapses_per_connection'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual([
      'name',
      'brainRegionName',
      'brainRegionAcronym',
      'strainName',
      'subjectName',
    ]);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    // `name` is legitimate as a column HERE: this listing has no Name column
    expect(serializeQuery(query({ filters: ilike('name') }), s).name__ilike).toBe('%foo%');
    expect(serializeQuery(query({ filters: setIn('name') }), s).name__in).toEqual(['x']);
    // the record's OWN brain region, free-entry (the facets here are the pre/post ones)
    expect(
      serializeQuery(query({ filters: ilike('brainRegionName') }), s).brain_region__name__ilike
    ).toBe('%foo%');
    expect(
      serializeQuery(query({ filters: setIn('brainRegionAcronym') }), s).brain_region__acronym__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: ilike('strainName') }), s).subject__strain__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('subjectName') }), s).subject__name__ilike).toBe(
      '%foo%'
    );
  });
  it('name and the brain-region scalars sort; neither subject field is in ordering_model_fields', () => {
    expect(serializeQuery(query(sortDesc('name')), s).order_by).toEqual(['-name']);
    expect(serializeQuery(query(sortDesc('brainRegionName')), s).order_by).toEqual([
      '-brain_region__name',
    ]);
    expect(serializeQuery(query(sortDesc('brainRegionAcronym')), s).order_by).toEqual([
      '-brain_region__acronym',
    ]);
    expect(s.columns.find((c) => c.id === 'strainName')?.sortable).toBe(false);
    expect(s.columns.find((c) => c.id === 'subjectName')?.sortable).toBe(false);
  });
  it('pre/post region + cell-type filters serialize to the backend keys', () => {
    expect(serializeQuery(query({ filters: setIn('preRegion') }), s).pre_region__name__in).toEqual([
      'x',
    ]);
    // The legacy field-def spelled this `post_region__name_in` (SINGLE underscore); the
    // current spec has no such param, only the standard `post_region__name__in`.
    const post = serializeQuery(query({ filters: setIn('postRegion') }), s);
    expect(post.post_region__name__in).toEqual(['x']);
    expect(post.post_region__name_in).toBeUndefined();
    expect(
      serializeQuery(query({ filters: setInSingle('postRegion') }), s).post_region__name_in
    ).toBeDefined();
    expect(
      serializeQuery(query({ filters: setIn('preMtype') }), s).pre_mtype__pref_label__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: setIn('postMtype') }), s).post_mtype__pref_label__in
    ).toEqual(['x']);
  });
  it('mean ± std is not sortable, but subject age is', () => {
    expect(s.columns.find((c) => c.id === 'meanStd')?.sortable).toBeFalsy();
    // `subject__age_value` IS in ExperimentalSynapsesPerConnectionFilter's ordering fields.
    expect(s.columns.find((c) => c.id === 'subjectAge')?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc('subjectAge')), s).order_by).toEqual([
      '-subject__age_value',
    ]);
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
      'lifecycleStatus',
      'registrationDate',
      // AUXILIARY — declared, hidden until ticked in the chooser
      'meshType',
      'levelOfDetail',
      'mtype',
      'datasetPublishedIn',
      'datasetExperimentDate',
      'strainName',
      'subjectName',
    ]);
  });
  it('the auxiliary columns carry the filters they replaced', () => {
    const resolved = resolveColumns(s, dataCtx('em_cell_mesh'));
    const aux = resolved.filter((c) => c.auxiliary).map((c) => c.id);
    expect(aux).toEqual([
      'meshType',
      'levelOfDetail',
      'mtype',
      'datasetPublishedIn',
      'datasetExperimentDate',
      'strainName',
      'subjectName',
    ]);
    expect(resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id)).toEqual(aux);

    const eq = (columnId: string, value: string): TFilterModel => ({
      [columnId]: {
        columnId,
        operator: OperatorId.Eq,
        value: { kind: FilterValueKind.Text, text: value },
      },
    });
    expect(serializeQuery(query({ filters: eq('meshType', 'static') }), s).mesh_type).toBe(
      'static'
    );
    expect(serializeQuery(query({ filters: eq('levelOfDetail', '2') }), s).level_of_detail).toBe(
      '2'
    );
    expect(serializeQuery(query({ filters: setIn('mtype') }), s).mtype__pref_label__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: ilike('datasetPublishedIn') }), s)
        .em_dense_reconstruction_dataset__published_in__ilike
    ).toBe('%foo%');
    const range: TFilterModel = {
      datasetExperimentDate: {
        columnId: 'datasetExperimentDate',
        operator: OperatorId.DateRange,
        value: { kind: FilterValueKind.DateRange, from: '2024-01-01', to: '2024-12-31' },
      },
    };
    const dateParams = serializeQuery(query({ filters: range }), s);
    expect(dateParams.em_dense_reconstruction_dataset__experiment_date__gte).toBe('2024-01-01');
    expect(dateParams.em_dense_reconstruction_dataset__experiment_date__lte).toBe('2024-12-31');
    expect(
      serializeQuery(query({ filters: ilike('strainName') }), s).subject__strain__name__ilike
    ).toBe('%foo%');
  });
  it('everything but the two dataset fields is in ordering_model_fields', () => {
    for (const [columnId, field] of [
      ['meshType', 'mesh_type'],
      ['levelOfDetail', 'level_of_detail'],
      ['mtype', 'mtype__pref_label'],
      ['strainName', 'subject__strain__name'],
      ['subjectName', 'subject__name'],
    ]) {
      expect(s.columns.find((c) => c.id === columnId)?.sortable).toBe(true);
      expect(serializeQuery(query(sortDesc(columnId)), s).order_by).toEqual([`-${field}`]);
    }
    for (const columnId of ['datasetPublishedIn', 'datasetExperimentDate']) {
      expect(s.columns.find((c) => c.id === columnId)?.sortable).toBe(false);
    }
  });
  it('version facet + dataset filters serialize to the backend keys; species IS sortable', () => {
    expect(
      serializeQuery(query({ filters: setIn('releaseVersion') }), s).release_version__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: ilike('emDataset') }), s)
        .em_dense_reconstruction_dataset__name__ilike
    ).toBe('%foo%');
    expect(
      serializeQuery(query({ filters: setIn('emDataset') }), s)
        .em_dense_reconstruction_dataset__name__in
    ).toEqual(['x']);
    // `subject__species__name` is in EMCellMeshFilter.Constants.ordering_model_fields.
    expect(s.columns.find((c) => c.id === 'species')?.sortable).toBe(true);
    expect(serializeQuery(query(sortDesc('species')), s).order_by).toEqual([
      '-subject__species__name',
    ]);
  });
});
