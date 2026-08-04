import { describe, expect, it } from 'vitest';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import {
  brainRegionGridDefinition,
  microCircuitGridDefinition,
} from '@/features/data-grid/bindings/entitycore/schemas/circuit-models';
import {
  FLAT_ADVANCED_FILTER_GROUP_ID,
  flatAdvancedFilterId,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import { emodelSchema } from '@/features/data-grid/bindings/entitycore/schemas/emodel';
import { extracellularRecordingArraySchema } from '@/features/data-grid/bindings/entitycore/schemas/extracellular-recording-array';
import { ionChannelModelSchema } from '@/features/data-grid/bindings/entitycore/schemas/ion-channel-model';
import { meModelCircuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/me-model-circuit';
import { memodelSchema } from '@/features/data-grid/bindings/entitycore/schemas/memodel';
import { singleNeuronSynaptomeSchema } from '@/features/data-grid/bindings/entitycore/schemas/single-neuron-synaptome';
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
 * the endpoint named in each `describe`, and cross-checked against the filter class
 * in the entitycore source (`app/filters/*.py`) that declares the suffix. The backend
 * silently IGNORES unknown query params, so an invented param would look like "the
 * filter does nothing"; these tables are the record that each one exists.
 *
 * Every case is `[groupId, filterId, operator, value, expected params]`, and each
 * suite ends with an exhaustiveness check: the set of (filter, operator) pairs
 * exercised must equal the set the schema declares. A new operator on a schema fails
 * that check until its wire param is pinned here.
 *
 * This is the MODEL-group companion to `experimental-advanced-filters.test.ts`.
 */

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

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

/** The state key a filter DECLARED as `groupId · filterId` actually occupies. */
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

/** Run one entity's table plus its exhaustiveness check. */
function suite<Row>(schema: IGridSchema<Row>, cases: ReadonlyArray<TCase>) {
  it.each(cases)('%s · %s + %s', (groupId, filterId, operator, value, expected) => {
    expect(serializeOne(schema, groupId, filterId, operator, value)).toEqual(expected);
  });

  it('exercises every declared (filter, operator) pair — and no undeclared one', () => {
    expect(exercisedPairs(schema, cases)).toEqual(declaredPairs(schema));
  });
}

const RECORD_ID_CASES: ReadonlyArray<TCase> = [
  ['common', 'id', OperatorId.In, set(UUID), { id__in: [UUID] }],
  ['common', 'id', OperatorId.Eq, text(UUID), { id: UUID }],
];

/** `contribution__pref_label*`, for the model grids that show no Contributors column. */
const CONTRIBUTION_CASES: ReadonlyArray<TCase> = [
  [
    'contribution',
    'prefLabel',
    OperatorId.Ilike,
    text('Blue Brain'),
    { contribution__pref_label__ilike: '%Blue Brain%' },
  ],
  [
    'contribution',
    'prefLabel',
    OperatorId.In,
    set('Blue Brain Project'),
    { contribution__pref_label__in: ['Blue Brain Project'] },
  ],
];

/** The `subject__*` group, identical on every endpoint composing SubjectFilterMixin. */
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
 * The two ID-type provenance params plus the record's own `id` — what stays on the
 * PANEL for every circuit listing, base included.
 */
const CIRCUIT_PROVENANCE_CASES: ReadonlyArray<TCase> = [
  ['provenance', 'atlasId', OperatorId.Eq, text(UUID), { atlas_id: UUID }],
  ['provenance', 'rootCircuitId', OperatorId.Eq, text(UUID), { root_circuit_id: UUID }],
  ...RECORD_ID_CASES,
];

/**
 * Everything the circuit FAMILY listings share — `/circuit`, one `CircuitFilter`.
 * The base `circuit` schema is deliberately NOT in this set: it moved the four
 * `has_*` flags, both `subject__*` fields and `contribution__pref_label` onto
 * auxiliary COLUMNS (pinned in `circuit-parity.test.ts`), so its panel keeps only
 * {@link CIRCUIT_PROVENANCE_CASES}.
 */
const CIRCUIT_COMMON_CASES: ReadonlyArray<TCase> = [
  ['contents', 'hasMorphologies', OperatorId.Bool, bool(true), { has_morphologies: true }],
  ['contents', 'hasPointNeurons', OperatorId.Bool, bool(false), { has_point_neurons: false }],
  [
    'contents',
    'hasElectricalCellModels',
    OperatorId.Bool,
    bool(true),
    { has_electrical_cell_models: true },
  ],
  ['contents', 'hasSpines', OperatorId.Bool, bool(true), { has_spines: true }],
  ...SUBJECT_CASES,
  ...CONTRIBUTION_CASES,
  ...CIRCUIT_PROVENANCE_CASES,
];

describe('emodel advanced filters — GET /emodel', () => {
  suite(emodelSchema, [
    [
      'exemplarMorphology',
      'hasSegmentedSpines',
      OperatorId.Bool,
      bool(true),
      { exemplar_morphology__has_segmented_spines: true },
    ],
    [
      'ionChannelModel',
      'name',
      OperatorId.Ilike,
      text('Kv1'),
      { ion_channel_model__name__ilike: '%Kv1%' },
    ],
    [
      'ionChannelModel',
      'name',
      OperatorId.In,
      set('Kv1.1'),
      { ion_channel_model__name__in: ['Kv1.1'] },
    ],
    ['ionChannelModel', 'name', OperatorId.Eq, text('Kv1.1'), { ion_channel_model__name: 'Kv1.1' }],
    ['strain', 'name', OperatorId.Ilike, text('C57'), { strain__name__ilike: '%C57%' }],
    ['strain', 'name', OperatorId.In, set('C57BL/6J'), { strain__name__in: ['C57BL/6J'] }],
    ...RECORD_ID_CASES,
  ]);

  it('spells strain at the top level — /emodel accepts no subject__ params', () => {
    const fields = [...advancedFilterDefsByKey(emodelSchema).values()].map((d) => d.field);
    expect(fields).toContain('strain__name');
    expect(fields.some((f) => f?.startsWith('subject__'))).toBe(false);
  });
});

/** `memodel` and `me_model_circuit` share one declaration — assert both. */
const MEMODEL_CASES: ReadonlyArray<TCase> = [
  ['morphology', 'name', OperatorId.Ilike, text('L5'), { morphology__name__ilike: '%L5%' }],
  ['morphology', 'name', OperatorId.In, set('L5 TPC'), { morphology__name__in: ['L5 TPC'] }],
  ['morphology', 'name', OperatorId.Eq, text('L5 TPC'), { morphology__name: 'L5 TPC' }],
  [
    'morphology',
    'hasSegmentedSpines',
    OperatorId.Bool,
    bool(true),
    { morphology__has_segmented_spines: true },
  ],
  ['emodel', 'name', OperatorId.Ilike, text('cADpyr'), { emodel__name__ilike: '%cADpyr%' }],
  ['emodel', 'name', OperatorId.In, set('cADpyr'), { emodel__name__in: ['cADpyr'] }],
  ['emodel', 'name', OperatorId.Eq, text('cADpyr'), { emodel__name: 'cADpyr' }],
  [
    'emodel',
    'score',
    OperatorId.Range,
    range(0, 10),
    { emodel__score__gte: 0, emodel__score__lte: 10 },
  ],
  ['strain', 'name', OperatorId.Ilike, text('C57'), { strain__name__ilike: '%C57%' }],
  ['strain', 'name', OperatorId.In, set('C57BL/6J'), { strain__name__in: ['C57BL/6J'] }],
  ...CONTRIBUTION_CASES,
  ...RECORD_ID_CASES,
];

describe('memodel advanced filters — GET /memodel', () => {
  suite(memodelSchema, MEMODEL_CASES);
});

describe('me-model-circuit advanced filters — GET /memodel', () => {
  suite(meModelCircuitSchema, MEMODEL_CASES);

  it('declares exactly what memodel declares — one shared source', () => {
    expect(declaredPairs(meModelCircuitSchema)).toEqual(declaredPairs(memodelSchema));
  });
});

describe('single-neuron-synaptome advanced filters — GET /single-neuron-synaptome', () => {
  suite(singleNeuronSynaptomeSchema, [
    [
      'meModel',
      'validationStatus',
      OperatorId.Eq,
      text('done'),
      { me_model__validation_status: 'done' },
    ],
    [
      'meModel',
      'strainName',
      OperatorId.Ilike,
      text('C57'),
      { me_model__strain__name__ilike: '%C57%' },
    ],
    [
      'meModel',
      'strainName',
      OperatorId.In,
      set('C57BL/6J'),
      { me_model__strain__name__in: ['C57BL/6J'] },
    ],
    [
      'morphology',
      'name',
      OperatorId.Ilike,
      text('L5'),
      { me_model__morphology__name__ilike: '%L5%' },
    ],
    [
      'morphology',
      'name',
      OperatorId.In,
      set('L5 TPC'),
      { me_model__morphology__name__in: ['L5 TPC'] },
    ],
    ['morphology', 'name', OperatorId.Eq, text('L5 TPC'), { me_model__morphology__name: 'L5 TPC' }],
    [
      'morphology',
      'hasSegmentedSpines',
      OperatorId.Bool,
      bool(false),
      { me_model__morphology__has_segmented_spines: false },
    ],
    [
      'emodel',
      'name',
      OperatorId.Ilike,
      text('cADpyr'),
      { me_model__emodel__name__ilike: '%cADpyr%' },
    ],
    ['emodel', 'name', OperatorId.In, set('cADpyr'), { me_model__emodel__name__in: ['cADpyr'] }],
    ['emodel', 'name', OperatorId.Eq, text('cADpyr'), { me_model__emodel__name: 'cADpyr' }],
    ['emodel', 'score', OperatorId.Range, range(null, 10), { me_model__emodel__score__lte: 10 }],
    ...CONTRIBUTION_CASES,
    ...RECORD_ID_CASES,
  ]);
});

describe('ion-channel-model advanced filters — GET /ion-channel-model', () => {
  suite(ionChannelModelSchema, [
    ['mechanism', 'nmodlSuffix', OperatorId.Eq, text('Kv1'), { nmodl_suffix: 'Kv1' }],
    [
      'mechanism',
      'conductanceName',
      OperatorId.Eq,
      text('gKv1bar'),
      { conductance_name: 'gKv1bar' },
    ],
    [
      'mechanism',
      'maxPermeabilityName',
      OperatorId.Eq,
      text('pmax'),
      { max_permeability_name: 'pmax' },
    ],
    ['mechanism', 'isStochastic', OperatorId.Bool, bool(true), { is_stochastic: true }],
    ...SUBJECT_CASES,
    ...CONTRIBUTION_CASES,
    ...RECORD_ID_CASES,
  ]);

  it('offers no __isnull companions — the grid has no operator for them', () => {
    const fields = [...advancedFilterDefsByKey(ionChannelModelSchema).values()].map((d) => d.field);
    expect(fields).not.toContain('conductance_name__isnull');
    expect(fields).not.toContain('max_permeability_name__isnull');
  });
});

describe('circuit advanced filters — GET /circuit', () => {
  suite(circuitSchema, CIRCUIT_PROVENANCE_CASES);

  it('keeps only the ID-type fields — the rest are auxiliary columns now', () => {
    const fields = [...advancedFilterDefsByKey(circuitSchema).values()].map((d) => d.field);
    expect(fields).toEqual(['id', 'atlas_id', 'root_circuit_id']);
    for (const moved of [
      'has_morphologies',
      'has_point_neurons',
      'has_electrical_cell_models',
      'has_spines',
      'subject__strain__name',
      'subject__name',
      'contribution__pref_label',
    ]) {
      expect(fields).not.toContain(moved);
    }
  });

  it('never offers scale — the Scale column and the host narrowing own it', () => {
    const fields = [...advancedFilterDefsByKey(circuitSchema).values()].map((d) => d.field);
    expect(fields).not.toContain('scale');
  });

  it('never offers build category or target simulator — both are columns here', () => {
    const fields = [...advancedFilterDefsByKey(circuitSchema).values()].map((d) => d.field);
    expect(fields).not.toContain('build_category');
    expect(fields).not.toContain('target_simulator');
  });
});

describe('micro-circuit advanced filters — GET /circuit', () => {
  suite(microCircuitGridDefinition.schema, [
    [
      'classification',
      'buildCategory',
      OperatorId.In,
      set('computational_model'),
      { build_category__in: ['computational_model'] },
    ],
    [
      'classification',
      'buildCategory',
      OperatorId.Eq,
      text('computational_model'),
      { build_category: 'computational_model' },
    ],
    ...CIRCUIT_COMMON_CASES,
  ]);

  it('never offers scale — every family dataType pins scale__in as a host param', () => {
    const fields = [...advancedFilterDefsByKey(microCircuitGridDefinition.schema).values()].map(
      (d) => d.field
    );
    expect(fields).not.toContain('scale');
  });
});

describe('brain-region circuit advanced filters — GET /circuit', () => {
  suite(brainRegionGridDefinition.schema, [
    [
      'classification',
      'buildCategory',
      OperatorId.In,
      set('computational_model'),
      { build_category__in: ['computational_model'] },
    ],
    [
      'classification',
      'buildCategory',
      OperatorId.Eq,
      text('computational_model'),
      { build_category: 'computational_model' },
    ],
    [
      'classification',
      'targetSimulator',
      OperatorId.In,
      set('neuron'),
      { target_simulator__in: ['neuron'] },
    ],
    [
      'classification',
      'targetSimulator',
      OperatorId.Eq,
      text('neuron'),
      { target_simulator: 'neuron' },
    ],
    ...CIRCUIT_COMMON_CASES,
  ]);

  it('is the only family member offering target simulator — the others show a column', () => {
    const fields = [...advancedFilterDefsByKey(microCircuitGridDefinition.schema).values()].map(
      (d) => d.field
    );
    expect(fields).not.toContain('target_simulator');
  });
});

describe('extracellular-recording-array — GET /simulatable-extracellular-recording-array', () => {
  suite(extracellularRecordingArraySchema, [
    [
      'array',
      'electrodeType',
      OperatorId.Eq,
      text('neuropixels_v1'),
      { electrode_type: 'neuropixels_v1' },
    ],
    ['array', 'circuitId', OperatorId.Eq, text(UUID), { circuit_id: UUID }],
    ...CONTRIBUTION_CASES,
    ...RECORD_ID_CASES,
  ]);

  it('offers nothing brain-region shaped — the endpoint accepts none', () => {
    const fields = [...advancedFilterDefsByKey(extracellularRecordingArraySchema).values()].map(
      (d) => d.field
    );
    expect(fields.some((f) => f?.includes('brain_region'))).toBe(false);
  });
});
