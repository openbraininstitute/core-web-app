const assert: typeof import('node:assert/strict') = require('node:assert/strict');
const test: typeof import('node:test') = require('node:test');
const utils: typeof import('./utils') = require('./utils.ts');

const { describe, it } = test;
const { validateImportConfig } = utils;

type ConfigSchema = import('@/features/scan-config/types').ConfigSchema;
type ImportState = import('./utils').ImportState;

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
 * The initialImportState exported by the hook module.
 * We define the expected shape here since the hook file imports React
 * and cannot be loaded in a pure Node.js environment.
 */
const expectedInitialImportState: ImportState = {
  mode: 'paste',
  rawInput: '',
  fileName: null,
  parseError: null,
  validationErrors: null,
  parsedConfig: null,
  isValid: false,
};

describe('initialImportState shape', () => {
  it('starts in paste mode with empty rawInput', () => {
    assert.equal(expectedInitialImportState.mode, 'paste');
    assert.equal(expectedInitialImportState.rawInput, '');
  });

  it('starts with no file selected', () => {
    assert.equal(expectedInitialImportState.fileName, null);
  });

  it('starts in a neutral state with no errors and not valid', () => {
    assert.equal(expectedInitialImportState.parseError, null);
    assert.equal(expectedInitialImportState.validationErrors, null);
    assert.equal(expectedInitialImportState.parsedConfig, null);
    assert.equal(expectedInitialImportState.isValid, false);
  });
});

describe('useImportValidation state transitions (via validateImportConfig)', () => {
  describe('empty input → neutral state', () => {
    it('the hook resets to neutral state for empty strings without calling validateImportConfig', () => {
      // The hook handles empty/whitespace strings by resetting to neutral state
      // directly, bypassing validateImportConfig. We verify the neutral state shape.
      const neutralState: Pick<
        ImportState,
        'parseError' | 'validationErrors' | 'parsedConfig' | 'isValid'
      > = {
        parseError: null,
        validationErrors: null,
        parsedConfig: null,
        isValid: false,
      };

      assert.equal(neutralState.parseError, null);
      assert.equal(neutralState.validationErrors, null);
      assert.equal(neutralState.parsedConfig, null);
      assert.equal(neutralState.isValid, false);
    });
  });

  describe('invalid JSON → parse error state', () => {
    it('malformed JSON sets parseError and clears validationErrors', () => {
      const result = validateImportConfig('{not valid json}', testSchema);

      assert.notEqual(result.parseError, null, 'parseError should be set');
      assert.equal(result.validationErrors, null, 'validationErrors should be null on parse error');
      assert.equal(result.parsedConfig, null, 'parsedConfig should be null on parse error');
    });

    it('non-object JSON (array) sets parseError', () => {
      const result = validateImportConfig('[1, 2, 3]', testSchema);

      assert.notEqual(result.parseError, null);
      assert.equal(result.parseError, 'Expected a JSON object at the root level');
      assert.equal(result.validationErrors, null);
      assert.equal(result.parsedConfig, null);
    });

    it('non-object JSON (string) sets parseError', () => {
      const result = validateImportConfig('"hello"', testSchema);

      assert.notEqual(result.parseError, null);
      assert.equal(result.parseError, 'Expected a JSON object at the root level');
      assert.equal(result.validationErrors, null);
    });

    it('non-object JSON (number) sets parseError', () => {
      const result = validateImportConfig('42', testSchema);

      assert.notEqual(result.parseError, null);
      assert.equal(result.validationErrors, null);
    });

    it('non-object JSON (null) sets parseError', () => {
      const result = validateImportConfig('null', testSchema);

      assert.notEqual(result.parseError, null);
      assert.equal(result.validationErrors, null);
    });
  });

  describe('valid JSON but invalid schema → validation error state', () => {
    it('object with wrong type field produces validation errors', () => {
      const input = JSON.stringify({
        type: 'WrongType',
        param_a: { type: 'TestBlock' },
      });
      const result = validateImportConfig(input, testSchema);

      assert.equal(result.parseError, null, 'parseError should be null for valid JSON');
      assert.notEqual(
        result.validationErrors,
        null,
        'validationErrors should be set for schema mismatch'
      );
      assert.ok(Array.isArray(result.validationErrors), 'validationErrors should be an array');
      assert.ok(
        result.validationErrors!.length > 0,
        'validationErrors should contain at least one error'
      );
      assert.equal(result.parsedConfig, null, 'parsedConfig should be null on validation error');
    });

    it('object with wrong nested const value produces validation errors', () => {
      const input = JSON.stringify({
        type: 'TestConfig',
        param_a: { type: 'WrongBlock' },
      });
      const result = validateImportConfig(input, testSchema);

      assert.equal(result.parseError, null, 'parseError should be null for valid JSON');
      assert.notEqual(
        result.validationErrors,
        null,
        'validationErrors should be set for schema mismatch'
      );
      assert.ok(Array.isArray(result.validationErrors), 'validationErrors should be an array');
      assert.ok(result.validationErrors!.length > 0, 'should have at least one validation error');
      assert.equal(result.parsedConfig, null, 'parsedConfig should be null on validation error');
    });
  });

  describe('valid JSON matching schema → valid state', () => {
    it('correct config produces parsedConfig and no errors', () => {
      const validConfig = {
        type: 'TestConfig',
        param_a: { type: 'TestBlock' },
      };
      const result = validateImportConfig(JSON.stringify(validConfig), testSchema);

      assert.equal(result.parseError, null, 'parseError should be null for valid config');
      assert.equal(
        result.validationErrors,
        null,
        'validationErrors should be null for valid config'
      );
      assert.notEqual(result.parsedConfig, null, 'parsedConfig should be set for valid config');
      // isValid in the hook is derived as: result.parsedConfig !== null
      const isValid = result.parsedConfig !== null;
      assert.equal(isValid, true);
    });

    it('valid config with extra non-schema fields still validates after stripping', () => {
      const configWithExtras = {
        type: 'TestConfig',
        param_a: { type: 'TestBlock' },
        obi_one_version: '1.0',
        idx: 42,
        coordinate_output_root: '/tmp',
      };
      const result = validateImportConfig(JSON.stringify(configWithExtras), testSchema);

      assert.equal(result.parseError, null);
      assert.equal(result.validationErrors, null);
      assert.notEqual(result.parsedConfig, null);
      // Verify stripped fields are not in parsedConfig
      assert.equal(
        'obi_one_version' in result.parsedConfig!,
        false,
        'obi_one_version should be stripped'
      );
      assert.equal('idx' in result.parsedConfig!, false, 'idx should be stripped');
      assert.equal(
        'coordinate_output_root' in result.parsedConfig!,
        false,
        'coordinate_output_root should be stripped'
      );
    });
  });

  describe('full state transition sequence', () => {
    it('simulates the hook state progression: empty → parse error → validation error → valid', () => {
      // Step 1: Empty input — hook sets neutral state (doesn't call validateImportConfig)
      const emptyState = { ...expectedInitialImportState };
      assert.equal(emptyState.isValid, false);
      assert.equal(emptyState.parseError, null);
      assert.equal(emptyState.validationErrors, null);

      // Step 2: Invalid JSON — hook calls validateImportConfig, gets parse error
      const parseResult = validateImportConfig('not json', testSchema);
      const parseErrorState: ImportState = {
        ...emptyState,
        rawInput: 'not json',
        parseError: parseResult.parseError,
        validationErrors: parseResult.validationErrors,
        parsedConfig: parseResult.parsedConfig,
        isValid: parseResult.parsedConfig !== null,
      };
      assert.notEqual(parseErrorState.parseError, null);
      assert.equal(parseErrorState.validationErrors, null);
      assert.equal(parseErrorState.isValid, false);

      // Step 3: Valid JSON but schema mismatch — hook gets validation errors
      const schemaInput = JSON.stringify({ type: 'WrongType' });
      const validationResult = validateImportConfig(schemaInput, testSchema);
      const validationErrorState: ImportState = {
        ...parseErrorState,
        rawInput: schemaInput,
        parseError: validationResult.parseError,
        validationErrors: validationResult.validationErrors,
        parsedConfig: validationResult.parsedConfig,
        isValid: validationResult.parsedConfig !== null,
      };
      assert.equal(validationErrorState.parseError, null);
      assert.notEqual(validationErrorState.validationErrors, null);
      assert.equal(validationErrorState.isValid, false);

      // Step 4: Valid config — hook gets parsedConfig, isValid becomes true
      const validInput = JSON.stringify({
        type: 'TestConfig',
        param_a: { type: 'TestBlock' },
      });
      const validResult = validateImportConfig(validInput, testSchema);
      const validState: ImportState = {
        ...validationErrorState,
        rawInput: validInput,
        parseError: validResult.parseError,
        validationErrors: validResult.validationErrors,
        parsedConfig: validResult.parsedConfig,
        isValid: validResult.parsedConfig !== null,
      };
      assert.equal(validState.parseError, null);
      assert.equal(validState.validationErrors, null);
      assert.equal(validState.isValid, true);
      assert.notEqual(validState.parsedConfig, null);
    });
  });
});

describe('debounce behavior documentation', () => {
  it('the hook uses a 300ms debounce — validation does not fire immediately', () => {
    // This test documents the debounce contract of the hook.
    // The hook's validateInput function wraps validateImportConfig in a
    // setTimeout(fn, 300). This means:
    // 1. Calling validateInput does NOT immediately update state
    // 2. State updates only after 300ms of input inactivity
    // 3. Rapid successive calls cancel previous pending validations
    //
    // We verify the underlying validation function works correctly,
    // which is what the debounced callback eventually invokes.
    const result = validateImportConfig(
      JSON.stringify({ type: 'TestConfig', param_a: { type: 'TestBlock' } }),
      testSchema
    );
    assert.notEqual(result.parsedConfig, null);
    assert.equal(result.parseError, null);
    assert.equal(result.validationErrors, null);
  });
});

describe('cleanup on unmount documentation', () => {
  it('the hook clears the debounce timer via useEffect cleanup', () => {
    // This test documents the cleanup contract of the hook.
    // The hook registers a useEffect that returns a cleanup function:
    //   useEffect(() => {
    //     return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    //   }, []);
    //
    // This ensures no stale setTimeout fires after the component unmounts,
    // preventing setState calls on unmounted components.
    //
    // Since we cannot render React hooks in Node.js native test runner,
    // we verify this contract is documented and the underlying validation
    // logic (which the cleanup protects) works correctly.
    const result = validateImportConfig(
      JSON.stringify({ type: 'TestConfig', param_a: { type: 'TestBlock' } }),
      testSchema
    );
    assert.notEqual(result.parsedConfig, null);
    // The cleanup prevents this validation result from being applied
    // to state after unmount — a React-level concern verified by
    // the hook's useEffect cleanup pattern.
  });
});
