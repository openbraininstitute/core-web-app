import Ajv, { type AnySchema } from 'ajv';
import { useEffect, useMemo, useRef } from 'react';
import { match, P } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { config as appConfig } from '@/config';
import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import {
  type Config,
  type ConfigSchema,
  ScanConfigActivity,
  type SchemaName,
  type TScanConfigActivity,
  type TSupportedScanConfigurationForEntityType,
} from '@/features/scan-config/types';
import { log } from '@/utils/logger';

import type { ICircuit, IMEModel, IonChannelModel } from '@/api/entitycore/types';

export function useApiUrl({
  activity = ScanConfigActivity.Simulate,
  model,
}: {
  activity?: TScanConfigActivity;
  model: TSupportedScanConfigurationForEntityType;
}) {
  const apiPath = match(activity)
    .with(ScanConfigActivity.Extract, () => {
      const path = match(model)
        .with(
          { type: EntityTypeDict.Circuit },
          () => 'circuit-extraction-scan-config-generate-grid'
        )
        .otherwise(() => {
          throw new Error(`Unsupported model type ${model.type}`);
        });
      return path;
    })
    .with(ScanConfigActivity.Simulate, () => {
      const path = match(model)
        .with(
          { type: EntityTypeDict.Memodel },
          () => 'me-model-simulation-scan-config-generate-grid'
        )
        .with(
          { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
          () => 'me-model-with-synapses-circuit-simulation-scan-config-generate-grid'
        )
        .with(
          { type: EntityTypeDict.Circuit },
          () => 'circuit-simulation-scan-config-generate-grid'
        )
        .otherwise(() => {
          throw new Error(`Unsupported model type ${model.type}`);
        });
      return path;
    })
    .exhaustive();
  return `${appConfig.OBI_ONE_URL}/generated/${apiPath}`;
}

export function useSchemaName({
  model,
  activity = ScanConfigActivity.Simulate,
}: {
  model: ICircuit | IMEModel | IonChannelModel | undefined;
  activity?: TScanConfigActivity;
}) {
  const schemaName = match({ activity, model })
    .with({ model: P.nullish }, () => {
      return null;
    })
    .with({ activity: ScanConfigActivity.Extract }, () => {
      const name = match(model)
        .with({ type: EntityTypeDict.Circuit }, () => 'CircuitExtractionScanConfig')
        .otherwise(() => {
          throw new Error(`Unsupported entity type: ${model?.type}`);
        });
      return name as SchemaName;
    })
    .with({ activity: ScanConfigActivity.Simulate }, () => {
      const name = match(model)
        .with({ type: EntityTypeDict.Memodel }, () => 'MEModelSimulationScanConfig')
        .with({ type: EntityTypeDict.IonChannelModel }, () => 'IonChannelModelSimulationScanConfig')
        .with(
          { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
          () => 'MEModelWithSynapsesCircuitSimulationScanConfig'
        )
        .with({ type: EntityTypeDict.Circuit }, () => 'CircuitSimulationScanConfig')
        .otherwise(() => {
          throw new Error(`Unsupported entity type: ${model?.type}`);
        });
      return name as SchemaName;
    })
    .exhaustive();

  return schemaName as SchemaName;
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
      throw new Error('Invalid campaign configuration');
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
}) {
  const allEntries = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initialConfig || !schema) return;
    Object.entries(initialConfig)
      .filter(([k]) => !isRootBlock(schema, k))
      .forEach(([_key, value]) => {
        Object.keys(value).forEach((entryKey) => {
          allEntries.current.add(entryKey);
        });
      });
  }, [schema, initialConfig]);

  return allEntries.current;
}
