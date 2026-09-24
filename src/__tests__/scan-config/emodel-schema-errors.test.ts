import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useValidateSchema } from '@/features/scan-config/components/hooks';
import {
  errorsUnder,
  failingModelIds,
  hasErrorAt,
  makeRegionEntry,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';

import type { ErrorObject } from 'ajv';
import type { Config } from '@/features/scan-config/types';

/** ObiOne's generated `OptimizationValue` schema (titles and descriptions dropped). */
const optimizationValueSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', const: 'OptimizationValue', default: 'OptimizationValue' },
    mode: { type: 'string', enum: ['fixed', 'bounds'], default: 'fixed' },
    value: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    bounds: {
      anyOf: [
        {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
          strictly_increasing: true,
        },
        { type: 'null' },
      ],
    },
  },
  if: { properties: { mode: { const: 'bounds' } }, required: ['mode'] },
  // biome-ignore lint/suspicious/noThenProperty: JSON Schema's if/then/else keyword
  then: {
    properties: { bounds: { type: 'array' }, value: { type: 'null' } },
    required: ['bounds'],
  },
  else: {
    properties: { value: { type: 'number' }, bounds: { type: 'null' } },
    required: ['value'],
  },
};

const schema = { type: 'object', properties: { v: optimizationValueSchema } };

function validate(v: unknown) {
  const { result } = renderHook(() => useValidateSchema({ config: { v } as Config, schema }));
  return result.current;
}

const isValid = (v: unknown) => validate(v) === null;

const keywords = (v: unknown) => (validate(v) ?? []).map((error) => error.keyword);

describe('useValidateSchema on an OptimizationValue', () => {
  it.each([
    [{ mode: 'fixed', value: 1, bounds: null }],
    [{ value: 1 }],
    [{ mode: 'bounds', value: null, bounds: [0, 1] }],
  ])('accepts %j', (v) => {
    expect(isValid(v)).toBe(true);
  });

  it.each([
    [{ mode: 'fixed', value: null, bounds: null }],
    [{ mode: 'fixed', value: 1, bounds: [0, 1] }],
    [{ mode: 'bounds', value: null, bounds: null }],
    [{ mode: 'bounds', value: null, bounds: [null, 1] }],
    [{ mode: 'bounds', value: null, bounds: [1] }],
    [{ mode: 'bounds', value: null, bounds: [0, 1, 2] }],
    [{ mode: 'bounds', value: null, bounds: [1, 1] }],
    [{ mode: 'bounds', value: null, bounds: [2, 1] }],
    [{ mode: 'bounds', value: 1, bounds: [0, 1] }],
  ])('rejects %j', (v) => {
    expect(isValid(v)).toBe(false);
  });

  it('reports decreasing bounds with the strictly_increasing keyword', () => {
    expect(keywords({ mode: 'bounds', value: null, bounds: [2, 1] })).toContain(
      'strictly_increasing'
    );
  });

  it('leaves a missing bound to the type check, not the ordering', () => {
    const reported = keywords({ mode: 'bounds', value: null, bounds: [1, null] });
    expect(reported).toContain('type');
    expect(reported).not.toContain('strictly_increasing');
  });
});

describe('emodel schema errors', () => {
  const error = (instancePath: string) => ({ instancePath }) as ErrorObject;

  it('keeps only the errors at or inside a path, relative to it', () => {
    const errors = [
      error('/emodel_optimisation_parameters'),
      error('/emodel_optimisation_parameters/global_parameters/celsius/value/value'),
      error('/emodel_optimisation_parameters_other/x'),
      error('/info/campaign_name'),
    ];

    expect(
      errorsUnder(errors, '/emodel_optimisation_parameters').map((e) => e.instancePath)
    ).toEqual(['', '/global_parameters/celsius/value/value']);
  });

  it('matches whole path segments only', () => {
    const errors = [error('/mechanisms/mechanism_regions/allact/0/parameters/g/value')];

    expect(hasErrorAt(errors, '/mechanisms/mechanism_regions/allact')).toBe(true);
    expect(hasErrorAt(errors, '/mechanisms/mechanism_regions/all')).toBe(false);
  });

  it('maps a failing region entry to its model id', () => {
    const mechanisms = {
      mechanism_regions: { somatic: [makeRegionEntry('a'), makeRegionEntry('b')] },
    };
    const errors = [error('/mechanisms/mechanism_regions/somatic/1/parameters/gbar/value/bounds')];

    expect(failingModelIds(mechanisms, 'somatic', errors)).toEqual(new Set(['b']));
  });
});
