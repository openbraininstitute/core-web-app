import { describe, expect, it } from 'vitest';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import {
  FLAT_ADVANCED_FILTER_GROUP_ID,
  flatAdvancedFilterId,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import { electricalCellRecordingSchema } from '@/features/data-grid/bindings/entitycore/schemas/electrical-cell-recording';
import { emCellMeshSchema } from '@/features/data-grid/bindings/entitycore/schemas/em-cell-mesh';
import { experimentalBoutonDensitySchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-bouton-density';
import { experimentalNeuronDensitySchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-neuron-density';
import { experimentalSynapsesPerConnectionSchema } from '@/features/data-grid/bindings/entitycore/schemas/experimental-synapses-per-connection';
import { ionChannelRecordingSchema } from '@/features/data-grid/bindings/entitycore/schemas/ion-channel-recording';
import { synthesizedCellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/synthesized-cell-morphology';
import { universalCellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/universal-cell-morphology';
import {
  advancedFilterDefsByKey,
  advancedFilterKey,
  FilterValueKind,
  OperatorId,
} from '@/features/data-grid/core';

import type { IGridQuery, IGridSchema, TFilterValue } from '@/features/data-grid/core';

/**
 * ORACLE: every param asserted below was read out of the live entitycore OpenAPI
 * spec — `paths['/<endpoint>'].get.parameters`, entries with `in == 'query'` — for
 * the endpoint named in each `describe`. The backend silently ignores unknown query
 * params, so an invented param would look like "the filter does nothing"; these
 * tables are the record that each one exists.
 *
 * Every case is `[groupId, filterId, operator, value, expected params]`, and each
 * suite ends with an exhaustiveness check: the set of (filter, operator) pairs
 * exercised must equal the set the schema declares. A new operator on a schema fails
 * that check until its wire param is pinned here.
 */

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const OTHER_UUID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

type TCase = readonly [string, string, string, TFilterValue, Record<string, unknown>];

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}
function set(...values: string[]): TFilterValue {
  return { kind: FilterValueKind.Set, values };
}
function text(value: string): TFilterValue {
  return { kind: FilterValueKind.Text, text: value };
}
function bool(value: boolean): TFilterValue {
  return { kind: FilterValueKind.Boolean, value };
}
function range(min: number | null, max: number | null): TFilterValue {
  return { kind: FilterValueKind.Range, min, max };
}
function dates(from: string | null, to: string | null): TFilterValue {
  return { kind: FilterValueKind.DateRange, from, to };
}

const FROM = '2024-01-01';
const TO = '2024-12-31';

/**
 * The state key a filter DECLARED as `groupId · filterId` actually occupies.
 *
 * The case tables below are written in the schema's own vocabulary (the group and
 * filter a maintainer reads in the schema file), but a schema whose groups are
 * collapsed by `flatAdvancedFilters` stores that filter under the flat group's key.
 * Resolving through the schema keeps the tables readable AND correct either way.
 */
function declaredKey<Row>(schema: IGridSchema<Row>, groupId: string, filterId: string): string {
  const flat = advancedFilterKey(
    FLAT_ADVANCED_FILTER_GROUP_ID,
    flatAdvancedFilterId(groupId, filterId)
  );
  return advancedFilterDefsByKey(schema).has(flat) ? flat : advancedFilterKey(groupId, filterId);
}

/** Serialize ONE advanced filter and return only the params it added. */
function serializeOne<Row>(
  schema: IGridSchema<Row>,
  groupId: string,
  filterId: string,
  operator: string,
  value: TFilterValue
): Record<string, unknown> {
  const key = declaredKey(schema, groupId, filterId);
  const targetId = advancedFilterDefsByKey(schema).get(key)?.id ?? filterId;
  const params = serializeQuery(
    query({ filters: { [key]: { columnId: key, operator, targetId, value } } }),
    schema
  );
  const { page, page_size: pageSize, order_by: orderBy, ...rest } = params;
  return rest;
}

/** `<state key>|<operator>` for every (filter, operator) pair the schema declares. */
function declaredPairs<Row>(schema: IGridSchema<Row>): string[] {
  return [...advancedFilterDefsByKey(schema)]
    .flatMap(([key, def]) => def.operators.map((op) => `${key}|${op}`))
    .sort();
}

function exercisedPairs<Row>(schema: IGridSchema<Row>, cases: ReadonlyArray<TCase>): string[] {
  return [
    ...new Set(cases.map(([g, f, op]) => `${declaredKey(schema, g, f)}|${op}`)),
  ].sort() as string[];
}

/** The `subject__*` group, identical on every endpoint that composes SubjectFilterMixin. */
const SUBJECT_CASES: ReadonlyArray<TCase> = [
  [
    'subject',
    'strainName',
    OperatorId.Ilike,
    text('C57'),
    { subject__strain__name__ilike: '%C57%' },
  ],
  [
    'subject',
    'strainName',
    OperatorId.In,
    set('C57BL/6J'),
    { subject__strain__name__in: ['C57BL/6J'] },
  ],
  ['subject', 'subjectName', OperatorId.Ilike, text('rat'), { subject__name__ilike: '%rat%' }],
  ['subject', 'subjectName', OperatorId.In, set('Rat 12'), { subject__name__in: ['Rat 12'] }],
];

/**
 * The record's own `id`. Schemas disagree on which GROUP it is declared under —
 * `common` for the listings that have no other record-level filter, `record` for the
 * two morphology subtypes that also declare `has_segmented_spines` — so the group is
 * a parameter here. The wire params are the same either way.
 */
function idCases(groupId: string): ReadonlyArray<TCase> {
  return [
    [groupId, 'id', OperatorId.In, set(UUID), { id__in: [UUID] }],
    [groupId, 'id', OperatorId.Eq, text(UUID), { id: UUID }],
  ];
}

const RECORD_ID_CASES: ReadonlyArray<TCase> = idCases('common');

/** `name*`, for the grids that show no Name column. */
const NAME_CASES: ReadonlyArray<TCase> = [
  ['common', 'name', OperatorId.Ilike, text('L5'), { name__ilike: '%L5%' }],
  ['common', 'name', OperatorId.In, set('L5 TPC'), { name__in: ['L5 TPC'] }],
  ['common', 'name', OperatorId.Eq, text('L5 TPC'), { name: 'L5 TPC' }],
];

/** The `cell_morphology_protocol__*` params shared by the two morphology subtypes. */
const PROTOCOL_TEXT_CASES: ReadonlyArray<TCase> = [
  [
    'protocol',
    'protocolName',
    OperatorId.Ilike,
    text('patch'),
    { cell_morphology_protocol__name__ilike: '%patch%' },
  ],
  [
    'protocol',
    'protocolName',
    OperatorId.In,
    set('Patch-clamp'),
    { cell_morphology_protocol__name__in: ['Patch-clamp'] },
  ],
  [
    'protocol',
    'protocolName',
    OperatorId.Eq,
    text('Patch-clamp'),
    { cell_morphology_protocol__name: 'Patch-clamp' },
  ],
  [
    'protocol',
    'protocolDocument',
    OperatorId.Ilike,
    text('doi.org'),
    { cell_morphology_protocol__protocol_document__ilike: '%doi.org%' },
  ],
  [
    'protocol',
    'protocolDocument',
    OperatorId.In,
    set('https://doi.org/10.1038/x'),
    { cell_morphology_protocol__protocol_document__in: ['https://doi.org/10.1038/x'] },
  ],
  [
    'protocol',
    'protocolDocument',
    OperatorId.Eq,
    text('https://doi.org/10.1038/x'),
    { cell_morphology_protocol__protocol_document: 'https://doi.org/10.1038/x' },
  ],
  [
    'protocol',
    'protocolId',
    OperatorId.In,
    set(UUID),
    { cell_morphology_protocol__id__in: [UUID] },
  ],
  [
    'protocol',
    'protocolDesign',
    OperatorId.In,
    set('cell_patch'),
    { cell_morphology_protocol__protocol_design__in: ['cell_patch'] },
  ],
  [
    'protocol',
    'protocolDesign',
    OperatorId.NotIn,
    set('topological_synthesis'),
    { cell_morphology_protocol__protocol_design__not_in: ['topological_synthesis'] },
  ],
  [
    'protocol',
    'protocolDesign',
    OperatorId.Eq,
    text('electron_microscopy'),
    { cell_morphology_protocol__protocol_design: 'electron_microscopy' },
  ],
];

const HAS_SEGMENTED_SPINES_CASE: TCase = [
  'record',
  'hasSegmentedSpines',
  OperatorId.Bool,
  bool(true),
  { has_segmented_spines: true },
];

/** Run one entity's table plus its exhaustiveness check. */
function suite<Row>(schema: IGridSchema<Row>, cases: ReadonlyArray<TCase>) {
  it.each(cases)('%s · %s + %s', (groupId, filterId, operator, value, expected) => {
    expect(serializeOne(schema, groupId, filterId, operator, value)).toEqual(expected);
  });

  it('exercises every declared (filter, operator) pair — and no undeclared one', () => {
    expect(exercisedPairs(schema, cases)).toEqual(declaredPairs(schema));
  });
}

describe('electrical-cell-recording advanced filters — GET /electrical-cell-recording', () => {
  suite(electricalCellRecordingSchema, [
    [
      'recording',
      'recordingType',
      OperatorId.In,
      set('intracellular'),
      { recording_type__in: ['intracellular'] },
    ],
    [
      'recording',
      'recordingType',
      OperatorId.Eq,
      text('intracellular'),
      { recording_type: 'intracellular' },
    ],
    [
      'recording',
      'recordingOrigin',
      OperatorId.Eq,
      text('in_vivo'),
      { recording_origin: 'in_vivo' },
    ],
    ...SUBJECT_CASES,
    ...RECORD_ID_CASES,
  ]);

  it('never offers recording_origin__in — the listing pins it as a host param', () => {
    const def = advancedFilterDefsByKey(electricalCellRecordingSchema).get(
      declaredKey(electricalCellRecordingSchema, 'recording', 'recordingOrigin')
    );
    expect(def?.operators).toEqual([OperatorId.Eq]);
  });
});

describe('ion-channel-recording advanced filters — GET /ion-channel-recording', () => {
  suite(ionChannelRecordingSchema, [
    ['ionChannel', 'ionChannelId', OperatorId.In, set(UUID), { ion_channel__id__in: [UUID] }],
    [
      'ionChannel',
      'ionChannelLabel',
      OperatorId.Eq,
      text('Kv1.1'),
      { ion_channel__label: 'Kv1.1' },
    ],
    ['ionChannel', 'ionChannelGene', OperatorId.Eq, text('KCNA1'), { ion_channel__gene: 'KCNA1' }],
    [
      'validation',
      'validationPassed',
      OperatorId.Bool,
      bool(true),
      { validation_result__passed: true },
    ],
    [
      'validation',
      'validationPassed',
      OperatorId.Bool,
      bool(false),
      { validation_result__passed: false },
    ],
    [
      'validation',
      'validationName',
      OperatorId.Ilike,
      text('iv curve'),
      { validation_result__name__ilike: '%iv curve%' },
    ],
    [
      'validation',
      'validationName',
      OperatorId.In,
      set('IV curve'),
      { validation_result__name__in: ['IV curve'] },
    ],
    [
      'validation',
      'validationName',
      OperatorId.Eq,
      text('IV curve'),
      { validation_result__name: 'IV curve' },
    ],
    [
      'recording',
      'recordingType',
      OperatorId.In,
      set('intracellular'),
      { recording_type__in: ['intracellular'] },
    ],
    [
      'recording',
      'recordingType',
      OperatorId.Eq,
      text('intracellular'),
      { recording_type: 'intracellular' },
    ],
    ...SUBJECT_CASES,
    ...RECORD_ID_CASES,
  ]);

  it('never offers recording_origin in ANY form — the listing pins the bare param', () => {
    const fields = [...advancedFilterDefsByKey(ionChannelRecordingSchema).values()].map(
      (d) => d.field
    );
    expect(fields).not.toContain('recording_origin');
  });
});

/**
 * THE TWO DENSITY LISTINGS ARE THE AUXILIARY-COLUMN PILOT: `subject__strain__name`,
 * `subject__name` (both) and `name` (bouton only) are no longer advanced filters —
 * they are auxiliary COLUMNS, offered by this panel only while they stay hidden and
 * by their own header once ticked. The panel therefore declares only `id`, and the
 * wire params for the moved fields are pinned in `experimental-parity.test.ts`
 * alongside the columns that now own them.
 */
describe('experimental-neuron-density advanced filters — GET /experimental-neuron-density', () => {
  suite(experimentalNeuronDensitySchema, [...RECORD_ID_CASES]);

  it('declares no filter for a field a column already owns', () => {
    const fields = [...advancedFilterDefsByKey(experimentalNeuronDensitySchema).values()].map(
      (d) => d.field
    );
    expect(fields).toEqual(['id']);
    // `name` had a visible Name column AND this filter — the same field twice
    expect(fields).not.toContain('name');
    expect(fields).not.toContain('subject__strain__name');
    expect(fields).not.toContain('subject__name');
  });

  it('offers no ScientificArtifact params — the endpoint does not accept them', () => {
    const fields = [...advancedFilterDefsByKey(experimentalNeuronDensitySchema).values()].map(
      (d) => d.field
    );
    expect(fields).not.toContain('experiment_date');
    expect(fields).not.toContain('published_in');
    expect(fields).not.toContain('contact_email');
  });
});

describe('experimental-bouton-density advanced filters — GET /experimental-bouton-density', () => {
  suite(experimentalBoutonDensitySchema, [...RECORD_ID_CASES]);

  it('keeps only `id` — name/strain/subject name are auxiliary columns now', () => {
    const fields = [...advancedFilterDefsByKey(experimentalBoutonDensitySchema).values()].map(
      (d) => d.field
    );
    expect(fields).toEqual(['id']);
  });
});

describe('synapses-per-connection advanced filters — GET /experimental-synapses-per-connection', () => {
  suite(experimentalSynapsesPerConnectionSchema, [
    [
      'brainRegion',
      'name',
      OperatorId.Ilike,
      text('Isocortex'),
      { brain_region__name__ilike: '%Isocortex%' },
    ],
    [
      'brainRegion',
      'name',
      OperatorId.In,
      set('Isocortex'),
      { brain_region__name__in: ['Isocortex'] },
    ],
    [
      'brainRegion',
      'acronym',
      OperatorId.In,
      set('SSp-bfd'),
      { brain_region__acronym__in: ['SSp-bfd'] },
    ],
    [
      'brainRegion',
      'acronym',
      OperatorId.Eq,
      text('SSp-bfd'),
      { brain_region__acronym: 'SSp-bfd' },
    ],
    ['brainRegion', 'id', OperatorId.In, set(UUID), { brain_region__id__in: [UUID] }],
    ...SUBJECT_CASES,
    ...NAME_CASES,
    ...RECORD_ID_CASES,
  ]);
});

describe('em-cell-mesh advanced filters — GET /em-cell-mesh', () => {
  suite(emCellMeshSchema, [
    ['mesh', 'meshType', OperatorId.Eq, text('static'), { mesh_type: 'static' }],
    ['mesh', 'levelOfDetail', OperatorId.Eq, text('2'), { level_of_detail: '2' }],
    [
      'mesh',
      'denseReconstructionCellId',
      OperatorId.Eq,
      text('864691135'),
      { dense_reconstruction_cell_id: '864691135' },
    ],
    [
      'mtype',
      'prefLabel',
      OperatorId.Ilike,
      text('L5_TPC'),
      { mtype__pref_label__ilike: '%L5\\_TPC%' },
    ],
    ['mtype', 'prefLabel', OperatorId.In, set('L5_TPC:A'), { mtype__pref_label__in: ['L5_TPC:A'] }],
    ['mtype', 'id', OperatorId.In, set(UUID), { mtype__id__in: [UUID] }],
    [
      'dataset',
      'id',
      OperatorId.In,
      set(UUID, OTHER_UUID),
      { em_dense_reconstruction_dataset__id__in: [UUID, OTHER_UUID] },
    ],
    [
      'dataset',
      'publishedIn',
      OperatorId.Ilike,
      text('Nature'),
      { em_dense_reconstruction_dataset__published_in__ilike: '%Nature%' },
    ],
    [
      'dataset',
      'publishedIn',
      OperatorId.Eq,
      text('Nature'),
      { em_dense_reconstruction_dataset__published_in: 'Nature' },
    ],
    [
      'dataset',
      'experimentDate',
      OperatorId.DateRange,
      dates(FROM, TO),
      {
        em_dense_reconstruction_dataset__experiment_date__gte: FROM,
        em_dense_reconstruction_dataset__experiment_date__lte: TO,
      },
    ],
    [
      'measurements',
      'structuralDomain',
      OperatorId.Eq,
      text('soma'),
      { measurement_kind__structural_domain: 'soma' },
    ],
    [
      'measurements',
      'kindLabel',
      OperatorId.Eq,
      text('soma_volume'),
      { measurement_kind__pref_label: 'soma_volume' },
    ],
    ['measurements', 'statistic', OperatorId.Eq, text('mean'), { measurement_item__name: 'mean' }],
    ['measurements', 'unit', OperatorId.Eq, text('μm³'), { measurement_item__unit: 'μm³' }],
    [
      'measurements',
      'value',
      OperatorId.Range,
      range(10, 100),
      { measurement_item__value__gte: 10, measurement_item__value__lte: 100 },
    ],
    ...SUBJECT_CASES,
    ...RECORD_ID_CASES,
  ]);
});

describe('universal-cell-morphology advanced filters — GET /cell-morphology', () => {
  suite(universalCellMorphologySchema, [
    [
      'protocol',
      'generationType',
      OperatorId.In,
      set('digital_reconstruction'),
      { cell_morphology_protocol__generation_type__in: ['digital_reconstruction'] },
    ],
    [
      'protocol',
      'generationType',
      OperatorId.NotIn,
      set('placeholder'),
      { cell_morphology_protocol__generation_type__not_in: ['placeholder'] },
    ],
    [
      'protocol',
      'generationType',
      OperatorId.Eq,
      text('digital_reconstruction'),
      { cell_morphology_protocol__generation_type: 'digital_reconstruction' },
    ],
    ...PROTOCOL_TEXT_CASES,
    ...SUBJECT_CASES,
    ...idCases('record'),
    HAS_SEGMENTED_SPINES_CASE,
  ]);

  it('offers __not_in on generation type — this listing pins no host filter', () => {
    const def = advancedFilterDefsByKey(universalCellMorphologySchema).get(
      declaredKey(universalCellMorphologySchema, 'protocol', 'generationType')
    );
    expect(def?.operators).toContain(OperatorId.NotIn);
  });
});

describe('synthesized-cell-morphology advanced filters — GET /cell-morphology', () => {
  suite(synthesizedCellMorphologySchema, [
    [
      'protocol',
      'generationType',
      OperatorId.NotIn,
      set('placeholder'),
      { cell_morphology_protocol__generation_type__not_in: ['placeholder'] },
    ],
    [
      'protocol',
      'generationType',
      OperatorId.Eq,
      text('computationally_synthesized'),
      { cell_morphology_protocol__generation_type: 'computationally_synthesized' },
    ],
    ...PROTOCOL_TEXT_CASES,
    ...SUBJECT_CASES,
    ...idCases('record'),
    HAS_SEGMENTED_SPINES_CASE,
  ]);

  it('never offers generation_type __in — the listing pins it as a host param', () => {
    const def = advancedFilterDefsByKey(synthesizedCellMorphologySchema).get(
      declaredKey(synthesizedCellMorphologySchema, 'protocol', 'generationType')
    );
    expect(def?.operators).not.toContain(OperatorId.In);
  });
});
