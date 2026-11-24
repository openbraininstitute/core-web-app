import Ajv, { type AnySchema } from 'ajv';
import { useCallback, useMemo, useRef } from 'react';

import { entryNames } from '@/features/scan-config/commands';
import { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';
import { log } from '@/utils/logger';

import type { Config, ConfigSchema, TBlock } from '@/features/scan-config/types';

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
  config,
  schema,
}: {
  schema: ConfigSchema | undefined;
  config?: Config;
}): Set<string> {
  return useMemo(
    () => (config && schema ? entryNames(config, schema) : new Set<string>()),
    [config, schema]
  );
}

/** Picks the name of a new entry; names picked before the next render stay distinct. */
export function useReserveEntryName({ config, schema }: { config: Config; schema: ConfigSchema }) {
  const names = useEntries({ config, schema });
  const reservation = useRef({ names, picked: new Set<string>() });

  return useCallback(
    (rootElement: string, block?: TBlock) => {
      if (reservation.current.names !== names) {
        reservation.current = { names, picked: new Set() };
      }
      const { picked } = reservation.current;
      const name = nextEntryName(schema, rootElement, new Set([...names, ...picked]), block);
      picked.add(name);
      return name;
    },
    [schema, names]
  );
}
