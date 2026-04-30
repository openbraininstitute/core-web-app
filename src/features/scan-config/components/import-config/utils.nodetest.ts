const assert: typeof import('node:assert/strict') = require('node:assert/strict');
const test: typeof import('node:test') = require('node:test');
const fc: typeof import('fast-check') = require('fast-check');
const utils: typeof import('./utils') = require('./utils.ts');

const { describe, it } = test;
const { validateImportConfig } = utils;

type ConfigSchema = import('@/features/scan-config/types').ConfigSchema;

const testSchema = {
  additionalProperties: false,
  default_block_reference_labels: {},
  description: 'Test schema',
  group_order: [],
  properties: {
    type: { const: 'TestConfig', default: 'TestConfig' },
    param_a: {
      title: 'Param A',
      description: 'A test param',
      ui_element: 'block_single',
      group: 'test',
      group_order: 0,
      properties: { type: { const: 'TestBlock', default: 'TestBlock' } },
      additionalProperties: false,
      block_usability_entity_dependent: false,
    },
  },
  title: 'TestConfig',
  property_endpoints: {},
} as any as ConfigSchema;

/**
 * **Validates: Requirements 1.2**
 *
 * Correctness Property 1: Parse-Validate Exclusivity
 * For any string input, at most one of `parseError` and `validationErrors` is non-null.
 */
describe('Property 1: Parse-Validate Exclusivity', () => {
  it('for arbitrary strings, parseError and validationErrors are never both non-null', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = validateImportConfig(input, testSchema);
        const bothNonNull = result.parseError !== null && result.validationErrors !== null;
        assert.equal(
          bothNonNull,
          false,
          'parseError and validationErrors must not both be non-null'
        );
      }),
      { numRuns: 200 }
    );
  });

  it('for arbitrary JSON values, parseError and validationErrors are never both non-null', () => {
    fc.assert(
      fc.property(fc.json(), (jsonStr) => {
        const result = validateImportConfig(jsonStr, testSchema);
        const bothNonNull = result.parseError !== null && result.validationErrors !== null;
        assert.equal(
          bothNonNull,
          false,
          'parseError and validationErrors must not both be non-null'
        );
      }),
      { numRuns: 200 }
    );
  });
});

const { stripNonSchemaFields } = utils;

/**
 * **Validates: Requirements 1.3**
 *
 * Correctness Property 3: Field Stripping Soundness
 * After `stripNonSchemaFields`, the result contains zero keys not in `schema.properties`,
 * and no schema-relevant data is lost.
 */
describe('Property 3: Field Stripping Soundness', () => {
  const schemaKeys = Object.keys(testSchema.properties);

  /** Arbitrary for generating a record whose keys are a mix of schema and non-schema keys. */
  const mixedObjectArb = fc
    .tuple(
      // Schema keys with arbitrary values (subset of known schema keys)
      fc.record(Object.fromEntries(schemaKeys.map((k) => [k, fc.anything()])), {
        requiredKeys: [],
      }),
      // Non-schema keys (random strings that are NOT schema keys)
      fc.dictionary(
        fc.string({ minLength: 1 }).filter((k) => !schemaKeys.includes(k)),
        fc.anything()
      )
    )
    .map(([schemaEntries, extraEntries]) => ({
      ...extraEntries,
      ...schemaEntries,
    }));

  it('result contains only keys present in schema.properties', () => {
    fc.assert(
      fc.property(mixedObjectArb, (input) => {
        const result = stripNonSchemaFields(input, testSchema);
        const resultKeys = Object.keys(result);
        const schemaKeySet = new Set(schemaKeys);

        for (const key of resultKeys) {
          assert.ok(schemaKeySet.has(key), `Key "${key}" in result is not in schema.properties`);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('every schema-relevant key from the input is preserved with its exact value', () => {
    fc.assert(
      fc.property(mixedObjectArb, (input) => {
        const result = stripNonSchemaFields(input, testSchema);
        const schemaKeySet = new Set(schemaKeys);

        for (const [key, value] of Object.entries(input)) {
          if (schemaKeySet.has(key)) {
            assert.ok(key in result, `Schema key "${key}" was lost during stripping`);
            assert.strictEqual(
              result[key],
              value,
              `Value for schema key "${key}" was altered during stripping`
            );
          }
        }
      }),
      { numRuns: 200 }
    );
  });
});

/**
 * **Validates: Requirements 1.2**
 *
 * Correctness Property 3 (corollary): Stripping Idempotency
 * `stripNonSchemaFields(stripNonSchemaFields(input, schema), schema)` equals
 * `stripNonSchemaFields(input, schema)`.
 */
describe('Property 3 (corollary): Stripping Idempotency', () => {
  const schemaKeys = Object.keys(testSchema.properties);

  /** Arbitrary for generating a record whose keys are a mix of schema and non-schema keys. */
  const mixedObjectArb = fc
    .tuple(
      fc.record(Object.fromEntries(schemaKeys.map((k) => [k, fc.anything()])), {
        requiredKeys: [],
      }),
      fc.dictionary(
        fc.string({ minLength: 1 }).filter((k) => !schemaKeys.includes(k)),
        fc.anything()
      )
    )
    .map(([schemaEntries, extraEntries]) => ({
      ...extraEntries,
      ...schemaEntries,
    }));

  it('applying stripNonSchemaFields twice yields the same result as applying it once', () => {
    fc.assert(
      fc.property(mixedObjectArb, (input) => {
        const once = stripNonSchemaFields(input, testSchema);
        const twice = stripNonSchemaFields(once, testSchema);

        assert.deepStrictEqual(
          twice,
          once,
          'stripNonSchemaFields is not idempotent: second application changed the result'
        );
      }),
      { numRuns: 200 }
    );
  });
});

/**
 * **Validates: Correctness Property 5**
 *
 * Property 5: Idempotent Validation
 * Calling `validateImportConfig` with the same input and schema always produces the same result.
 */
describe('Property 5: Idempotent Validation', () => {
  it('for arbitrary strings, two calls with the same input produce deeply equal results', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result1 = validateImportConfig(input, testSchema);
        const result2 = validateImportConfig(input, testSchema);

        assert.deepStrictEqual(
          result1.parsedConfig,
          result2.parsedConfig,
          'parsedConfig differs between two identical calls'
        );
        assert.strictEqual(
          result1.parseError,
          result2.parseError,
          'parseError differs between two identical calls'
        );
        assert.deepStrictEqual(
          result1.validationErrors,
          result2.validationErrors,
          'validationErrors differs between two identical calls'
        );
      }),
      { numRuns: 200 }
    );
  });

  it('for arbitrary JSON values, two calls with the same input produce deeply equal results', () => {
    fc.assert(
      fc.property(fc.json(), (jsonStr) => {
        const result1 = validateImportConfig(jsonStr, testSchema);
        const result2 = validateImportConfig(jsonStr, testSchema);

        assert.deepStrictEqual(
          result1.parsedConfig,
          result2.parsedConfig,
          'parsedConfig differs between two identical calls'
        );
        assert.strictEqual(
          result1.parseError,
          result2.parseError,
          'parseError differs between two identical calls'
        );
        assert.deepStrictEqual(
          result1.validationErrors,
          result2.validationErrors,
          'validationErrors differs between two identical calls'
        );
      }),
      { numRuns: 200 }
    );
  });
});
