import Ajv, { type AnySchema } from 'ajv';
import { useMemo, useRef, useState } from 'react';

import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { log } from '@/utils/logger';

import { isPlainObject } from '../utils';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

export { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';

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

/**
 * Entry names taken across every block dictionary, captured once on first render.
 *
 * Reads the built editor config, so names seeded from a workflow selection are reserved too and
 * the next block the user adds cannot reuse one.
 */
export function useEntries({
  config,
  schema,
}: {
  schema: ConfigSchema | undefined;
  config?: Config;
}): Set<string> {
  // lazy state, not a ref: the set is built once and then mutated by callers from event
  // handlers, so it must not be written during render
  const [allEntries] = useState(() => {
    const entries = new Set<string>();
    if (!config || !schema) return entries;

    for (const [key, value] of Object.entries(config)) {
      if (isRootBlock(schema, key) || !isPlainObject(value)) continue;
      for (const entryKey of Object.keys(value)) entries.add(entryKey);
    }

    return entries;
  });

  return allEntries;
}
