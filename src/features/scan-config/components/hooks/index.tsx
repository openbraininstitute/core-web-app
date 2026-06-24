import Ajv, { type AnySchema } from 'ajv';
import { useMemo, useRef } from 'react';

import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { log } from '@/utils/logger';

import { isPlainObject } from '../utils';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

export function useValidateSchema({
  initialConfig,
  config,
  schema,
}: {
  initialConfig?: Config;
  config?: Config;
  schema: AnySchema | null;
}) {
  const initialConfigValidated = useRef(false);
  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema) return;
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  // Validate initial config

  if (validate && initialConfig && !initialConfigValidated.current) {
    initialConfigValidated.current = true;
    validate(initialConfig);
    if (validate.errors) {
      log(
        'error',
        '[schema validation failed]',
        { initialConfig, config, schema },
        { errors: validate.errors }
      );
      throw new Error('Invalid campaign configuration', { cause: validate.errors });
    }
  }

  const errors = useMemo(() => {
    if (validate) validate(config);
    return validate?.errors;
  }, [validate, config]);

  return errors ?? null;
}

export function useEntries({
  initialConfig,
  schema,
}: {
  schema: ConfigSchema | undefined;
  initialConfig?: Config;
}): Set<string> {
  const allEntries = useRef<Set<string> | null>(null);

  const newSet = new Set<string>();

  if (!allEntries.current) {
    allEntries.current = newSet;
    if (!initialConfig || !schema) return allEntries.current;

    Object.entries(initialConfig)
      .filter(([k]) => !isRootBlock(schema, k))
      .forEach(([_key, value]) => {
        if (!isPlainObject(value)) return;
        Object.keys(value).forEach((entryKey) => {
          if (!allEntries.current) return;
          allEntries.current.add(entryKey);
        });
      });
  }

  return allEntries.current;
}
