import { captureException } from '@sentry/nextjs';
import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from 'ajv';
import { useEffect, useMemo, useState } from 'react';

import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { log } from '@/utils/logger';

import { isPlainObject } from '../utils';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

export { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';

/**
 * The ajv validator of a schema, compiled once per schema object and shared by every hook that
 * validates against it.
 */
const validators = new WeakMap<object, ValidateFunction>();

function compileSchema(schema: AnySchema): ValidateFunction {
  const key = schema as object;
  const cached = validators.get(key);
  if (cached) return cached;
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
  const validate = ajv.compile(schema);
  validators.set(key, validate);
  return validate;
}

function errorsOf(schema: AnySchema | null, config: Config | undefined): ErrorObject[] | null {
  if (!schema || !config) return null;
  const validate = compileSchema(schema);
  validate(config);
  // ajv overwrites `errors` on its next call, so keep a copy
  return validate.errors ? [...validate.errors] : null;
}

/** ajv schema errors of the config being edited, or null when it is valid. */
export function useValidateSchema({
  config,
  schema,
}: {
  config?: Config;
  schema: AnySchema | null;
}) {
  return useMemo(() => errorsOf(schema, config), [schema, config]);
}

/**
 * ajv schema errors of a saved campaign's config, or null when it is valid. A saved config fails
 * when ObiOne has since removed or renamed a block it uses; the failure is reported, the caller
 * decides what to show instead.
 */
export function useInitialConfigErrors({
  initialConfig,
  schema,
}: {
  initialConfig?: Config;
  schema: AnySchema | null;
}) {
  const errors = useMemo(() => errorsOf(schema, initialConfig), [schema, initialConfig]);

  useEffect(() => {
    if (!errors) return;
    log('error', '[schema validation failed]', { initialConfig, schema }, { errors });
    captureException(new Error('Invalid campaign configuration'), { extra: { errors } });
  }, [errors, initialConfig, schema]);

  return errors;
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
