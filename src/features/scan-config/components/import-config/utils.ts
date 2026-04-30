import Ajv from 'ajv';

import type { ErrorObject } from 'ajv';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

export type ImportMode = 'paste' | 'file';

export interface ImportState {
  mode: ImportMode;
  rawInput: string;
  fileName: string | null;
  parseError: string | null;
  validationErrors: ErrorObject[] | null;
  parsedConfig: Config | null;
  isValid: boolean;
}

export type ImportValidationResult = {
  parsedConfig: Config | null;
  parseError: string | null;
  validationErrors: ErrorObject[] | null;
};

export const NON_SCHEMA_FIELDS = [
  'obi_one_version',
  'idx',
  'coordinate_output_root',
  'scan_output_root',
  'single_coordinate_scan_params',
] as const;

export function stripNonSchemaFields(
  input: Record<string, unknown>,
  schema: ConfigSchema
): Record<string, unknown> {
  const schemaKeys = new Set(Object.keys(schema.properties));
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (schemaKeys.has(key)) {
      result[key] = value;
    }
  }

  return result;
}

export function validateImportConfig(
  rawJson: string,
  schema: ConfigSchema
): ImportValidationResult {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    return {
      parsedConfig: null,
      parseError: e instanceof SyntaxError ? e.message : 'Invalid JSON',
      validationErrors: null,
    };
  }

  // Step 2: Verify it's an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      parsedConfig: null,
      parseError: 'Expected a JSON object at the root level',
      validationErrors: null,
    };
  }

  // Step 3: Strip non-schema fields
  const stripped = stripNonSchemaFields(parsed as Record<string, unknown>, schema);

  // Step 4: Validate against schema using AJV
  const ajv = new Ajv({ strictSchema: false, allErrors: true });
  const validate = ajv.compile(schema);
  const isValid = validate(stripped);

  if (!isValid) {
    return {
      parsedConfig: null,
      parseError: null,
      validationErrors: validate.errors ?? [],
    };
  }

  return {
    parsedConfig: stripped as Config,
    parseError: null,
    validationErrors: null,
  };
}
