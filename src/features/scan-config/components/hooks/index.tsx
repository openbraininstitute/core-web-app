import Ajv, { type AnySchema, type ErrorObject } from 'ajv';
import { useMemo, useRef } from 'react';

import { log } from '@/utils/logger';

import type { Config } from '@/features/scan-config/types';

export { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';

/** Compiles the schema once; the returned function gives the schema errors of a config, or `null`. */
export function createConfigValidator(schema: AnySchema | null) {
  const ajv = new Ajv({ strictSchema: false, allErrors: true });
  // ObiOne's custom keyword for arrays whose items must increase, e.g. [lower, upper] bounds:
  // JSON Schema has no keyword that compares items with each other. Only numbers are compared,
  // a missing item is reported by the items' own `type`.
  ajv.addKeyword({
    keyword: 'strictly_increasing',
    type: 'array',
    schemaType: 'boolean',
    validate: (enabled: boolean, data: unknown[]) =>
      !enabled ||
      data.every((item, index) => {
        const previous = data[index - 1];
        return typeof item !== 'number' || typeof previous !== 'number' || item > previous;
      }),
  });
  const validate = schema ? ajv.compile(schema) : undefined;

  return (config: unknown): ErrorObject[] | null => {
    if (!validate) return null;
    validate(config);
    return validate.errors ?? null;
  };
}

/** The validator of a schema; throws once if the initial config does not pass it. */
export function useConfigValidator({
  initialConfig,
  schema,
}: {
  initialConfig?: Config;
  schema: AnySchema | null;
}) {
  const initialConfigValidated = useRef(false);
  const validate = useMemo(() => createConfigValidator(schema), [schema]);

  if (schema && initialConfig && !initialConfigValidated.current) {
    initialConfigValidated.current = true;
    const errors = validate(initialConfig);
    if (errors) {
      log('error', '[schema validation failed]', { initialConfig, schema }, { errors });
      throw new Error('Invalid campaign configuration', { cause: errors });
    }
  }

  return validate;
}
