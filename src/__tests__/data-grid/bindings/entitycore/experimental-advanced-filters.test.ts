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
 * Pins the wire params of each experimental listing's advanced filters. Every expected
 * param was read out of the live entitycore OpenAPI spec (`in == 'query'` parameters of
 * the endpoint named in each `describe`) — the backend silently ignores unknown params,
 * so an invented one would look like "the filter does nothing".
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
/**
 * The state key a filter declared as `groupId · filterId` actually occupies: a schema
 * collapsed by `flatAdvancedFilters` stores it under the flat group's key instead.
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

/** The record's own `id`; schemas disagree on the group it is declared under. */
function idCases(groupId: string): ReadonlyArray<TCase> {
  return [
    [groupId, 'id', OperatorId.In, set(UUID), { id__in: [UUID] }],
    [groupId, 'id', OperatorId.Eq, text(UUID), { id: UUID }],
  ];
}

const RECORD_ID_CASES: ReadonlyArray<TCase> = idCases('common');

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
  suite(electricalCellRecordingSchema, [...RECORD_ID_CASES]);

  it('keeps only `id` — recording type/origin and the subject fields are columns now', () => {
    const fields = [...advancedFilterDefsByKey(electricalCellRecordingSchema).values()].map(
      (d) => d.field
    );
    expect(fields).toEqual(['id']);
  });
});

describe('ion-channel-recording advanced filters — GET /ion-channel-recording', () => {
  suite(ionChannelRecordingSchema, [
    ['ionChannel', 'ionChannelId', OperatorId.In, set(UUID), { ion_channel__id__in: [UUID] }],
    ...RECORD_ID_CASES,
  ]);

  it('keeps only the ID-type fields — everything else is a column now', () => {
    const fields = [...advancedFilterDefsByKey(ionChannelRecordingSchema).values()].map(
      (d) => d.field
    );
    expect(fields).toEqual(['id', 'ion_channel__id']);
  });

  it('never offers recording_origin in ANY form — the listing pins the bare param', () => {
    const fields = [...advancedFilterDefsByKey(ionChannelRecordingSchema).values()].map(
      (d) => d.field
    );
    expect(fields).not.toContain('recording_origin');
    expect(ionChannelRecordingSchema.columns.map((c) => c.filter?.field)).not.toContain(
      'recording_origin'
    );
  });
});

describe('experimental-neuron-density advanced filters — GET /experimental-neuron-density', () => {
  suite(experimentalNeuronDensitySchema, [...RECORD_ID_CASES]);

  it('declares no filter for a field a column already owns', () => {
    const fields = [...advancedFilterDefsByKey(experimentalNeuronDensitySchema).values()].map(
      (d) => d.field
    );
    expect(fields).toEqual(['id']);
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
    ['brainRegion', 'id', OperatorId.In, set(UUID), { brain_region__id__in: [UUID] }],
    ...RECORD_ID_CASES,
  ]);

  it('declares no filter for a field an auxiliary column now owns', () => {
    const fields = [
      ...advancedFilterDefsByKey(experimentalSynapsesPerConnectionSchema).values(),
    ].map((d) => d.field);
    expect(fields).toEqual(['id', 'brain_region__id']);
  });
});

/**
 * The measurement family stays an advanced filter deliberately: it is a five-param
 * conjunction over an annotation array that a per-column filter cannot express.
 */
describe('em-cell-mesh advanced filters — GET /em-cell-mesh', () => {
  suite(emCellMeshSchema, [
    [
      'mesh',
      'denseReconstructionCellId',
      OperatorId.Eq,
      text('864691135'),
      { dense_reconstruction_cell_id: '864691135' },
    ],
    ['mtype', 'id', OperatorId.In, set(UUID), { mtype__id__in: [UUID] }],
    [
      'dataset',
      'id',
      OperatorId.In,
      set(UUID, OTHER_UUID),
      { em_dense_reconstruction_dataset__id__in: [UUID, OTHER_UUID] },
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
    ...RECORD_ID_CASES,
  ]);

  it('keeps the ID-type and measurement families, and nothing a column now owns', () => {
    const fields = [...advancedFilterDefsByKey(emCellMeshSchema).values()].map((d) => d.field);
    expect(fields).toEqual([
      'id',
      'dense_reconstruction_cell_id',
      'mtype__id',
      'em_dense_reconstruction_dataset__id',
      'measurement_kind__structural_domain',
      'measurement_kind__pref_label',
      'measurement_item__name',
      'measurement_item__unit',
      'measurement_item__value',
    ]);
  });
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
      'protocolId',
      OperatorId.In,
      set(UUID),
      { cell_morphology_protocol__id__in: [UUID] },
    ],
    ...RECORD_ID_CASES,
  ]);

  it('keeps only the ID-type fields — everything else is a column now', () => {
    const fields = [...advancedFilterDefsByKey(synthesizedCellMorphologySchema).values()].map(
      (d) => d.field
    );
    expect(fields).toEqual(['id', 'cell_morphology_protocol__id']);
  });

  /**
   * The listing pins `cell_morphology_protocol__generation_type__in` as a HOST param
   * (`protocolTypeFilter`), and host params merge after the user's filters — so the
   * `__in` operator must stay unoffered even now that the field owns a column.
   */
  it('never offers generation_type __in — the listing pins it as a host param', () => {
    const column = synthesizedCellMorphologySchema.columns.find((c) => c.id === 'generationType');
    expect(column?.filter?.field).toBe('cell_morphology_protocol__generation_type');
    expect(column?.filter?.operators).toEqual([OperatorId.NotIn, OperatorId.Eq]);
    expect(column?.filter?.targets?.[0]?.operators).toEqual([OperatorId.NotIn, OperatorId.Eq]);
    expect(column?.filter?.operators).not.toContain(OperatorId.In);
  });
});
