import Ajv, { type AnySchema } from 'ajv';
import { useEffect, useMemo, useRef } from 'react';
import { match, P } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config as appConfig } from '@/config';
import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import {
  type Config,
  type ConfigSchema,
  ScanConfigActivity,
  type SchemaName,
  SchemaNameDict,
  type TScanConfigActivity,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { log } from '@/utils/logger';

import type { Nullish } from '@/utils/type';

export function getGeneratedApiUrl({
  activity = ScanConfigActivity.Simulate,
  entityType,
}: {
  activity?: TScanConfigActivity;
  entityType: TSupportedEntityTypesForScanConfiguration | Nullish;
}) {
  const apiPath = match(activity)
    .with(ScanConfigActivity.Extract, () => {
      const path = match({ entityType })
        .with(
          { entityType: EntityTypeDict.Circuit },
          () => 'circuit-extraction-scan-config-generate-grid'
        )
        .otherwise(() => {
          throw new Error(`Unsupported entity type ${entityType}`);
        });
      return path;
    })
    .with(ScanConfigActivity.Simulate, () => {
      const path = match({ entityType })
        .with(
          { entityType: ExtendedEntitiesTypeDict.MemodelCircuit },
          () => 'me-model-simulation-scan-config-generate-grid'
        )
        .with(
          { entityType: ExtendedEntitiesTypeDict.IonChannelModel },
          () => 'ion-channel-model-simulation-scan-config-generate-grid'
        )
        .with(
          {
            entityType: ExtendedEntitiesTypeDict.MEModelWithSynapses,
          },
          () => 'me-model-with-synapses-circuit-simulation-scan-config-generate-grid'
        )
        .with(
          { entityType: EntityTypeDict.Circuit },
          () => 'circuit-simulation-scan-config-generate-grid'
        )
        .otherwise(() => {
          throw new Error(`Unsupported entity type ${entityType}`);
        });
      return path;
    })
    .with(ScanConfigActivity.Build, () => {
      const path = match({ entityType })
        .with(
          { entityType: ExtendedEntitiesTypeDict.UniversalCellMorphology },
          () => 'em-synapse-mapping-scan-config-generate-grid'
        )
        .otherwise(() => {
          throw new Error(`Unsupported entity type ${entityType}`);
        });
      return path;
    })
    .exhaustive(() => {
      throw new Error(`No obi-one generated url found for this entity ${entityType}`);
    });

  return `${appConfig.OBI_ONE_URL}/generated/${apiPath}`;
}

export function getScanConfigSchemaName({
  entityType,
  activity = ScanConfigActivity.Simulate,
}: {
  activity?: TScanConfigActivity;
  entityType: TSupportedEntityTypesForScanConfiguration | Nullish;
}) {
  const schemaName = match({ activity, entityType })
    .with({ entityType: P.nullish }, () => {
      return null;
    })
    .with({ activity: ScanConfigActivity.Extract }, () => {
      const name = match({ entityType })
        .with(
          { entityType: ExtendedEntitiesTypeDict.Circuit },
          () => SchemaNameDict.CircuitExtractionScanConfig
        )
        .otherwise(() => {
          throw new Error(`Unsupported entity type: ${entityType}`);
        });
      return name as SchemaName;
    })
    .with({ activity: ScanConfigActivity.Simulate }, () => {
      const name = match({ entityType })
        .with(
          { entityType: ExtendedEntitiesTypeDict.MemodelCircuit },
          () => SchemaNameDict.MEModelSimulationScanConfig
        )
        .with(
          { entityType: ExtendedEntitiesTypeDict.IonChannelModel },
          () => SchemaNameDict.IonChannelModelSimulationScanConfig
        )
        .with(
          { entityType: ExtendedEntitiesTypeDict.MEModelWithSynapses },
          () => SchemaNameDict.MEModelWithSynapsesCircuitSimulationScanConfig
        )
        .with({ entityType: ExtendedEntitiesTypeDict.Circuit }, () => 'CircuitSimulationScanConfig')
        .with(
          { entityType: ExtendedEntitiesTypeDict.SingleNeuronCircuit },
          () => 'CellMorphologyFromID'
        )
        .otherwise(() => {
          throw new Error(`Unsupported entity type: ${entityType}`);
        });
      return name as SchemaName;
    })
    .with({ activity: ScanConfigActivity.Build }, () => {
      const name = match({ entityType })
        .with(
          { entityType: ExtendedEntitiesTypeDict.UniversalCellMorphology },
          () => SchemaNameDict.EMSynapseMappingScanConfig
        )
        .otherwise(() => {
          throw new Error(`Unsupported entity type: ${entityType}`);
        });
      return name;
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
