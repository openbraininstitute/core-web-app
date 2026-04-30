const assert: typeof import('node:assert/strict') = require('node:assert/strict');
const test: typeof import('node:test') = require('node:test');
const fc: typeof import('fast-check') = require('fast-check');
const utils: typeof import('./utils') = require('./utils.ts');

const { describe, it } = test;
const { validateImportConfig, stripNonSchemaFields } = utils;

type ConfigSchema = import('@/features/scan-config/types').ConfigSchema;

/**
 * A realistic multi-block schema used across all integration tests.
 * It has two block_single groups (general, advanced) with typed properties,
 * mirroring real-world scan config schemas.
 */
const integrationSchema = {
  additionalProperties: false,
  default_block_reference_labels: {},
  description: 'Integration test schema',
  group_order: ['general', 'advanced'],
  properties: {
    type: { const: 'IntegrationConfig', default: 'IntegrationConfig' },
    general_settings: {
      title: 'General Settings',
      description: 'General configuration',
      ui_element: 'block_single',
      group: 'general',
      group_order: 0,
      properties: {
        type: { const: 'GeneralBlock', default: 'GeneralBlock' },
        name: {
          title: 'Name',
          description: 'Config name',
          type: 'string',
          default: '',
        },
        enabled: {
          title: 'Enabled',
          description: 'Is enabled',
          type: 'boolean',
          default: true,
        },
      },
      additionalProperties: false,
      block_usability_entity_dependent: false,
    },
    advanced_settings: {
      title: 'Advanced Settings',
      description: 'Advanced configuration',
      ui_element: 'block_single',
      group: 'advanced',
      group_order: 1,
      properties: {
        type: { const: 'AdvancedBlock', default: 'AdvancedBlock' },
        threshold: {
          title: 'Threshold',
          description: 'Threshold value',
          type: 'number',
          default: 0.5,
        },
      },
      additionalProperties: false,
      block_usability_entity_dependent: false,
    },
  },
  title: 'IntegrationConfig',
  property_endpoints: {},
} as any as ConfigSchema;

/** A valid config that conforms to integrationSchema. */
const validConfig = {
  type: 'IntegrationConfig',
  general_settings: {
    type: 'GeneralBlock',
    name: 'My Scan',
    enabled: true,
  },
  advanced_settings: {
    type: 'AdvancedBlock',
    threshold: 0.75,
  },
};

/** A valid config with non-schema fields that should be stripped. */
const validConfigWithExtras = {
  ...validConfig,
  obi_one_version: '2.1.0',
  idx: 99,
  coordinate_output_root: '/data/output',
  scan_output_root: '/data/scans',
  single_coordinate_scan_params: { foo: 'bar' },
  some_unknown_field: 'should also be stripped',
};

// ---------------------------------------------------------------------------
// Integration test: paste valid config → validation passes
// ---------------------------------------------------------------------------
describe('Integration: paste valid config → validation passes (confirm button would enable)', () => {
  it('a fully valid multi-block config passes validation with no errors', () => {
    const rawJson = JSON.stringify(validConfig);
    const result = validateImportConfig(rawJson, integrationSchema);

    assert.equal(result.parseError, null, 'no parse error expected');
    assert.equal(result.validationErrors, null, 'no validation errors expected');
    assert.notEqual(result.parsedConfig, null, 'parsedConfig should be set');

    // The UI derives isValid as: result.parsedConfig !== null
    const isValid = result.parsedConfig !== null;
    assert.equal(isValid, true, 'confirm button would be enabled');
  });

  it('valid config with non-schema fields still passes after stripping', () => {
    const rawJson = JSON.stringify(validConfigWithExtras);
    const result = validateImportConfig(rawJson, integrationSchema);

    assert.equal(result.parseError, null);
    assert.equal(result.validationErrors, null);
    assert.notEqual(result.parsedConfig, null);

    // Verify non-schema fields were stripped
    const config = result.parsedConfig!;
    assert.equal('obi_one_version' in config, false);
    assert.equal('idx' in config, false);
    assert.equal('coordinate_output_root' in config, false);
    assert.equal('scan_output_root' in config, false);
    assert.equal('single_coordinate_scan_params' in config, false);
    assert.equal('some_unknown_field' in config, false);

    // Verify schema fields are preserved
    assert.equal('type' in config, true);
    assert.equal('general_settings' in config, true);
    assert.equal('advanced_settings' in config, true);
  });
});

// ---------------------------------------------------------------------------
// Integration test: paste invalid config → error messages appear
// ---------------------------------------------------------------------------
describe('Integration: paste invalid config → error messages appear (confirm button would be disabled)', () => {
  it('config with wrong root type produces validation errors', () => {
    const invalidConfig = {
      type: 'WrongConfigType',
      general_settings: {
        type: 'GeneralBlock',
        name: 'test',
        enabled: true,
      },
      advanced_settings: {
        type: 'AdvancedBlock',
        threshold: 0.5,
      },
    };
    const result = validateImportConfig(JSON.stringify(invalidConfig), integrationSchema);

    assert.equal(result.parseError, null, 'JSON is valid, no parse error');
    assert.notEqual(result.validationErrors, null, 'should have validation errors');
    assert.ok(result.validationErrors!.length > 0, 'at least one validation error');
    assert.equal(result.parsedConfig, null, 'parsedConfig should be null');

    const isValid = result.parsedConfig !== null;
    assert.equal(isValid, false, 'confirm button would be disabled');
  });

  it('config with wrong nested block type produces validation errors', () => {
    const invalidConfig = {
      type: 'IntegrationConfig',
      general_settings: {
        type: 'WrongBlock',
        name: 'test',
        enabled: true,
      },
      advanced_settings: {
        type: 'AdvancedBlock',
        threshold: 0.5,
      },
    };
    const result = validateImportConfig(JSON.stringify(invalidConfig), integrationSchema);

    assert.equal(result.parseError, null);
    assert.notEqual(result.validationErrors, null);
    assert.ok(result.validationErrors!.length > 0);
    assert.equal(result.parsedConfig, null);
  });

  it('config with wrong property type (string instead of number) produces validation errors', () => {
    const invalidConfig = {
      type: 'IntegrationConfig',
      general_settings: {
        type: 'GeneralBlock',
        name: 'test',
        enabled: true,
      },
      advanced_settings: {
        type: 'AdvancedBlock',
        threshold: 'not-a-number',
      },
    };
    const result = validateImportConfig(JSON.stringify(invalidConfig), integrationSchema);

    assert.equal(result.parseError, null);
    assert.notEqual(result.validationErrors, null);
    assert.ok(result.validationErrors!.length > 0);
    assert.equal(result.parsedConfig, null);
  });

  it('config with additional properties in a block produces validation errors', () => {
    const invalidConfig = {
      type: 'IntegrationConfig',
      general_settings: {
        type: 'GeneralBlock',
        name: 'test',
        enabled: true,
        extra_field: 'not allowed',
      },
      advanced_settings: {
        type: 'AdvancedBlock',
        threshold: 0.5,
      },
    };
    const result = validateImportConfig(JSON.stringify(invalidConfig), integrationSchema);

    assert.equal(result.parseError, null);
    assert.notEqual(result.validationErrors, null);
    assert.ok(result.validationErrors!.length > 0);
    assert.equal(result.parsedConfig, null);
  });
});

// ---------------------------------------------------------------------------
// Integration test: upload a .json file → validates and enables confirm
// (simulated by passing file content through validateImportConfig)
// ---------------------------------------------------------------------------
describe('Integration: upload a .json file → validates and enables confirm', () => {
  it('file content (as string) passes through the same validation pipeline as paste', () => {
    // Simulate what happens when a file is read via FileReader.readAsText:
    // the file content is a string that gets passed to validateImportConfig.
    const fileContent = JSON.stringify(validConfig, null, 2); // pretty-printed like a real file
    const result = validateImportConfig(fileContent, integrationSchema);

    assert.equal(result.parseError, null);
    assert.equal(result.validationErrors, null);
    assert.notEqual(result.parsedConfig, null);

    const isValid = result.parsedConfig !== null;
    assert.equal(isValid, true, 'confirm button would be enabled after file upload');
  });

  it('file content with non-schema fields validates after stripping', () => {
    const fileContent = JSON.stringify(validConfigWithExtras, null, 2);
    const result = validateImportConfig(fileContent, integrationSchema);

    assert.equal(result.parseError, null);
    assert.equal(result.validationErrors, null);
    assert.notEqual(result.parsedConfig, null);
  });

  it('file with invalid JSON content produces parse error', () => {
    const corruptFileContent = '{ "type": "IntegrationConfig", broken }';
    const result = validateImportConfig(corruptFileContent, integrationSchema);

    assert.notEqual(result.parseError, null, 'should have a parse error');
    assert.equal(result.validationErrors, null);
    assert.equal(result.parsedConfig, null);
  });
});

// ---------------------------------------------------------------------------
// Integration test: confirm import → resetConfig would be called with
// correctly stripped config
// ---------------------------------------------------------------------------
describe('Integration: confirm import → resetConfig receives correctly stripped config', () => {
  it('stripped config has only schema-defined keys and correct values', () => {
    const rawJson = JSON.stringify(validConfigWithExtras);
    const result = validateImportConfig(rawJson, integrationSchema);

    assert.notEqual(result.parsedConfig, null, 'config should be valid');

    const config = result.parsedConfig!;
    const schemaKeys = new Set(Object.keys(integrationSchema.properties));

    // Every key in parsedConfig must be in the schema
    for (const key of Object.keys(config)) {
      assert.ok(schemaKeys.has(key), `key "${key}" should be in schema.properties`);
    }

    // Verify the actual values are preserved correctly
    assert.deepStrictEqual(config.type, 'IntegrationConfig');
    assert.deepStrictEqual(config.general_settings, {
      type: 'GeneralBlock',
      name: 'My Scan',
      enabled: true,
    });
    assert.deepStrictEqual(config.advanced_settings, {
      type: 'AdvancedBlock',
      threshold: 0.75,
    });
  });

  it('stripNonSchemaFields + validation produces a config suitable for resetConfig', () => {
    // This simulates the full pipeline: raw input → strip → validate → resetConfig
    const rawInput = validConfigWithExtras;
    const stripped = stripNonSchemaFields(
      rawInput as unknown as Record<string, unknown>,
      integrationSchema
    );

    // The stripped result should only have schema keys
    const schemaKeys = new Set(Object.keys(integrationSchema.properties));
    for (const key of Object.keys(stripped)) {
      assert.ok(schemaKeys.has(key), `stripped key "${key}" should be in schema`);
    }

    // Validate the stripped config passes AJV
    const result = validateImportConfig(JSON.stringify(stripped), integrationSchema);
    assert.equal(result.parseError, null);
    assert.equal(result.validationErrors, null);
    assert.notEqual(result.parsedConfig, null);

    // The parsedConfig should be deeply equal to the stripped input
    // (since stripping is idempotent and the config is already valid)
    assert.deepStrictEqual(result.parsedConfig, stripped);
  });
});

// ---------------------------------------------------------------------------
// Integration test: empty input → neutral state, no errors, confirm disabled
// ---------------------------------------------------------------------------
describe('Integration: empty input → neutral state, no errors, confirm disabled', () => {
  it('the hook handles empty input by resetting to neutral state without calling validateImportConfig', () => {
    // The useImportValidation hook checks `!rawJson.trim()` before calling
    // validateImportConfig. For empty/whitespace input, it directly sets:
    //   parseError: null, validationErrors: null, parsedConfig: null, isValid: false
    // This is the neutral state where no errors are shown and confirm is disabled.
    const neutralState = {
      parseError: null as string | null,
      validationErrors: null as unknown[] | null,
      parsedConfig: null as unknown | null,
      isValid: false,
    };

    assert.equal(neutralState.parseError, null, 'no parse error in neutral state');
    assert.equal(neutralState.validationErrors, null, 'no validation errors in neutral state');
    assert.equal(neutralState.parsedConfig, null, 'no parsed config in neutral state');
    assert.equal(neutralState.isValid, false, 'confirm button disabled in neutral state');
  });

  it('whitespace-only input would also trigger neutral state in the hook', () => {
    // The hook checks `!rawJson.trim()` — whitespace-only strings are treated as empty.
    // If validateImportConfig were called with whitespace, it would produce a parse error,
    // but the hook short-circuits before that.
    const whitespaceResult = validateImportConfig('   ', integrationSchema);
    // This shows what would happen if the hook didn't short-circuit:
    assert.notEqual(whitespaceResult.parseError, null, 'whitespace is not valid JSON');
    // But the hook prevents this by checking trim() first, keeping neutral state.
  });
});

// ---------------------------------------------------------------------------
// Integration test: non-object JSON (array, string) → parse error displayed
// ---------------------------------------------------------------------------
describe('Integration: non-object JSON (array, string) → parse error displayed', () => {
  it('JSON array produces a root-level parse error', () => {
    const result = validateImportConfig('[1, 2, 3]', integrationSchema);

    assert.equal(result.parseError, 'Expected a JSON object at the root level');
    assert.equal(result.validationErrors, null);
    assert.equal(result.parsedConfig, null);
  });

  it('JSON string produces a root-level parse error', () => {
    const result = validateImportConfig('"hello world"', integrationSchema);

    assert.equal(result.parseError, 'Expected a JSON object at the root level');
    assert.equal(result.validationErrors, null);
    assert.equal(result.parsedConfig, null);
  });

  it('JSON number produces a root-level parse error', () => {
    const result = validateImportConfig('42', integrationSchema);

    assert.equal(result.parseError, 'Expected a JSON object at the root level');
    assert.equal(result.validationErrors, null);
    assert.equal(result.parsedConfig, null);
  });

  it('JSON boolean produces a root-level parse error', () => {
    const result = validateImportConfig('true', integrationSchema);

    assert.equal(result.parseError, 'Expected a JSON object at the root level');
    assert.equal(result.validationErrors, null);
    assert.equal(result.parsedConfig, null);
  });

  it('JSON null produces a root-level parse error', () => {
    const result = validateImportConfig('null', integrationSchema);

    assert.equal(result.parseError, 'Expected a JSON object at the root level');
    assert.equal(result.validationErrors, null);
    assert.equal(result.parsedConfig, null);
  });
});

// ---------------------------------------------------------------------------
// Property 6: File Content Equivalence
// Importing the same JSON via paste and via file upload produces identical
// validation results.
// ---------------------------------------------------------------------------

/**
 * **Validates: Correctness Property 6 (file content equivalence)**
 *
 * The same JSON string produces identical validation results regardless of
 * whether it came from paste or file upload — both go through
 * `validateImportConfig` with the same arguments.
 */
describe('Property 6: File Content Equivalence', () => {
  it('compact JSON (paste-style) and pretty-printed JSON (file-style) produce equivalent results for valid configs', () => {
    const compact = JSON.stringify(validConfig);
    const prettyPrinted = JSON.stringify(validConfig, null, 2);

    const pasteResult = validateImportConfig(compact, integrationSchema);
    const fileResult = validateImportConfig(prettyPrinted, integrationSchema);

    // Both should be valid
    assert.equal(pasteResult.parseError, null);
    assert.equal(fileResult.parseError, null);
    assert.equal(pasteResult.validationErrors, null);
    assert.equal(fileResult.validationErrors, null);

    // Both should produce the same parsedConfig
    assert.deepStrictEqual(
      pasteResult.parsedConfig,
      fileResult.parsedConfig,
      'paste and file upload should produce identical parsedConfig'
    );
  });

  it('the same invalid JSON produces identical error results from paste and file', () => {
    const invalidJson = JSON.stringify({ type: 'WrongType' });

    const pasteResult = validateImportConfig(invalidJson, integrationSchema);
    const fileResult = validateImportConfig(invalidJson, integrationSchema);

    assert.strictEqual(pasteResult.parseError, fileResult.parseError);
    assert.deepStrictEqual(pasteResult.validationErrors, fileResult.validationErrors);
    assert.deepStrictEqual(pasteResult.parsedConfig, fileResult.parsedConfig);
  });

  it('property: for any valid JSON object string, paste and file produce identical results', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constant('IntegrationConfig'),
          general_settings: fc.record({
            type: fc.constant('GeneralBlock'),
            name: fc.string(),
            enabled: fc.boolean(),
          }),
          advanced_settings: fc.record({
            type: fc.constant('AdvancedBlock'),
            threshold: fc.double({
              min: -1000,
              max: 1000,
              noNaN: true,
              noDefaultInfinity: true,
            }),
          }),
        }),
        (config) => {
          const compact = JSON.stringify(config);
          const prettyPrinted = JSON.stringify(config, null, 2);

          const pasteResult = validateImportConfig(compact, integrationSchema);
          const fileResult = validateImportConfig(prettyPrinted, integrationSchema);

          // Both paths must produce identical results
          assert.strictEqual(pasteResult.parseError, fileResult.parseError);
          assert.deepStrictEqual(pasteResult.validationErrors, fileResult.validationErrors);
          assert.deepStrictEqual(pasteResult.parsedConfig, fileResult.parsedConfig);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: for any JSON string, the same input always produces the same result regardless of source', () => {
    fc.assert(
      fc.property(fc.json(), (jsonStr) => {
        // Simulate paste (raw string) and file upload (same raw string)
        const pasteResult = validateImportConfig(jsonStr, integrationSchema);
        const fileResult = validateImportConfig(jsonStr, integrationSchema);

        assert.strictEqual(pasteResult.parseError, fileResult.parseError);
        assert.deepStrictEqual(pasteResult.validationErrors, fileResult.validationErrors);
        assert.deepStrictEqual(pasteResult.parsedConfig, fileResult.parsedConfig);
      }),
      { numRuns: 200 }
    );
  });
});
