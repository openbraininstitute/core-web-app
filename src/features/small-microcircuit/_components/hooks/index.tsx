import Ajv, { AnySchema } from 'ajv';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';
import { match } from 'ts-pattern';

import { modelAtomFamily } from '../atoms';
import { isRootCategory } from './schema';

import { EntityTypeDict, IMEModel } from '@/api/entitycore/types';
import { CircuitScaleDictionary, ICircuit } from '@/api/entitycore/types/entities/circuit';
import { config as appConfig } from '@/config';
import { Config } from '@/features/small-microcircuit/_components/components';
import { JSONSchema } from '@/features/small-microcircuit/types';
import { WorkspaceContext } from '@/types/common';

export function useModel({ id, context }: { id: string; context: WorkspaceContext }) {
  const modelAtom = modelAtomFamily({ id, context });
  const model = useAtomValue(modelAtom);

  return { model };
}

export function useApiUrl({ model }: { model: ICircuit | IMEModel }) {
  const apiPath = match(model)
    .with({ type: EntityTypeDict.Memodel }, () => 'me-model-simulation-scan-config-generate-grid')
    .with(
      { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
      () => 'me-model-with-synapses-circuit-simulation-scan-config-generate-grid'
    )
    .with({ type: EntityTypeDict.Circuit }, () => 'circuit-simulation-scan-config-generate-grid')
    .otherwise(() => {
      throw new Error(`Unsupported model type ${model.type}`);
    });
  return `${appConfig.OBI_ONE_URL}/generated/${apiPath}`;
}

export function useValidateSchema({
  initialConfig,
  config,
  schema,
}: {
  initialConfig?: Config;
  config?: Config;
  schema: JSONSchema | null;
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
    if (validate.errors) throw new Error('Invalid Simulation Campaign Configuration');
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
  schema: JSONSchema | null;
  initialConfig?: Config;
}) {
  const allEntries = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initialConfig || !schema) return;
    Object.entries(initialConfig)
      .filter(([k]) => !isRootCategory(schema, k))
      .forEach(([_key, value]) => {
        Object.keys(value).forEach((entryKey) => allEntries.current.add(entryKey));
      });
  }, [schema, initialConfig]);

  return allEntries.current;
}
