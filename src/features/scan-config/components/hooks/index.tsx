import Ajv, { type AnySchema, type ErrorObject } from 'ajv';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { entryNames } from '@/features/scan-config/commands';
import { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';
import { log } from '@/utils/logger';

import type { IScanConfigStore } from '@/features/scan-config/store';
import type { Config, ConfigSchema, TBlock } from '@/features/scan-config/types';

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

export function useValidateSchema({
  initialConfig,
  config,
  schema,
}: {
  initialConfig?: Config;
  config?: Config;
  schema: AnySchema | null;
}) {
  const validate = useConfigValidator({ initialConfig, schema });

  return useMemo(() => validate(config), [validate, config]);
}

/** Picks the name of a new entry from the latest config; names picked in a row stay distinct. */
export function useReserveEntryName({
  store,
  schema,
}: {
  store: IScanConfigStore;
  schema: ConfigSchema;
}) {
  const picked = useRef(new Set<string>());

  useEffect(
    () =>
      store.subscribe(() => {
        if (picked.current.size === 0) return;
        const names = entryNames(store.getSnapshot(), schema);
        for (const name of picked.current) if (names.has(name)) picked.current.delete(name);
      }),
    [store, schema]
  );

  return useCallback(
    (rootElement: string, block?: TBlock) => {
      const names = entryNames(store.getSnapshot(), schema);
      const name = nextEntryName(
        schema,
        rootElement,
        new Set([...names, ...picked.current]),
        block
      );
      picked.current.add(name);
      return name;
    },
    [store, schema]
  );
}
