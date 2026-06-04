import $RefParser from '@apidevtools/json-schema-ref-parser';
import { useQuery } from '@tanstack/react-query';
import { omit, pick } from 'es-toolkit/compat';
import { useMemo, useState } from 'react';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';
import { config } from '@/config';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isType,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlock,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { WorkspaceContext } from '@/types/common';
import type { Nullish } from '@/utils/type';

export function useObioneJsonSchema({ schemaName }: { schemaName?: SchemaName | undefined }) {
  const { data: schema, isLoading } = useQuery({
    // biome-ignore lint/style/noNonNullAssertion: query only start if the schemaName is present
    queryKey: keyBuilder.obiOneJsonSchema(schemaName!),
    // biome-ignore lint/style/noNonNullAssertion: query only start if the schemaName is present
    queryFn: () => fetchSchema({ schemaName: schemaName! }),
    // keep data fresh indefinitely to prevent atom regeneration on window focus
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !!schemaName,
  });

  return { isLoading, schema };
}

export type TSchemaMappingConfiguration = {
  usability: Record<string, boolean> | null;
  properties:
    | (Record<string, any> & { NodePropertyUniqueValuesByPopulation: NodeProperties })
    | null;
};

const SCHEMA_MAPPING_CONFIGURATION_STALE_TIME_MS = 60 * 60 * 1000;

const stringArraySchema = z.array(z.string());
const nodePropertyUniqueValuesSchema = z.record(
  z.string(),
  z.record(z.string(), stringArraySchema)
);

type NodeProperties = z.infer<typeof nodePropertyUniqueValuesSchema>;

export const usabilitySchema = z.record(z.string(), z.boolean());
export const configSchema = z
  .object({
    NodePropertyUniqueValuesByPopulation: nodePropertyUniqueValuesSchema,
    usability: usabilitySchema,
  })
  .catchall(z.unknown());

export function useSchemaMappingConfiguration({
  entityId,
  workspace,
  endpoint,
  isSchemaLoaded,
}: {
  workspace: WorkspaceContext;
  entityId: string | undefined;
  endpoint: string | undefined;
  isSchemaLoaded: boolean;
}) {
  return useQuery({
    queryKey: ['schema-mapping-configuration', { workspace, entityId, endpoint }],
    queryFn: async () => {
      const api = await obioneApi();

      const resp = await api.get(`/declared${endpoint}`.replace('{circuit_id}', entityId ?? ''), {
        headers: {
          ...getEntityCoreContext(workspace).headers,
        },
      });

      const validatedData = configSchema.parse(resp);

      return validatedData;
    },
    enabled: !!endpoint && isSchemaLoaded,
    refetchOnWindowFocus: false,
    staleTime: SCHEMA_MAPPING_CONFIGURATION_STALE_TIME_MS,
    select: (validatedData) => {
      return {
        properties: omit(validatedData, ['usability']),
        usability: validatedData.usability,
      } as TSchemaMappingConfiguration;
    },
  });
}

export function getBlockUsabilityConfig({ block }: { block: TBlock }) {
  const usability = pick(block, ['block_usability_dictionary']).block_usability_dictionary;

  return {
    isDependent: !!usability,
    error_message: usability?.false_message,
    property: usability?.property,
    property_group: usability?.property_group,
  };
}

export function useDefaultConfig(schemaName: SchemaName) {
  const { schema } = useObioneJsonSchema({ schemaName });

  return useMemo(() => {
    if (!schema) return;
    return buildInitialConfigState(schema, {}, { type: 'circuit' } as ICircuit);
  }, [schema]);
}

export function isRootBlock(schema: ConfigSchema, key: string) {
  return (
    schema.properties?.[key] &&
    schema.properties[key].ui_element === ScanConfigUIElementDict.BlockSingle
  );
}

async function fetchSchema({ schemaName }: { schemaName: SchemaName }) {
  const res = await fetch(`${config.OBI_ONE_URL}/openapi.json`);
  const json = await res.json();
  const dereferenced = await $RefParser.dereference(json);

  // @ts-expect-error
  const theSchema = dereferenced.components.schemas[schemaName] as ConfigSchema;

  return theSchema;
}

const ModelIdentifierSelector = {
  [ExtendedEntitiesTypeDict.Memodel]: 'MEModelFromID',
  [ExtendedEntitiesTypeDict.MEModelWithSynapses]: 'MEModelWithSynapsesCircuitFromID',
  [ExtendedEntitiesTypeDict.Circuit]: 'CircuitFromID',
  [ExtendedEntitiesTypeDict.UniversalCellMorphology]: 'CellMorphologyFromID',
};

function buildInitialConfigState(
  schema: ConfigSchema,
  initialConfig: Config | undefined,
  model: TSupportedEntitiesForScanConfiguration | Nullish
): Config {
  if (!schema.properties) return {};

  const state: Config = {};

  const safeInitialConfig = initialConfig ?? {};

  Object.entries(schema.properties).forEach(([k, v]) => {
    if (isType(v)) {
      state[k] = v.const;
      return;
    }

    const safeInitialConfigforKey = safeInitialConfig[k] ?? {};

    if (!isPlainObject(safeInitialConfigforKey)) return;

    const initialConfigforKey = { ...safeInitialConfigforKey };

    if (!isPlainObject(initialConfigforKey)) return;

    if (v.ui_element === ScanConfigUIElementDict.BlockSingle) {
      Object.entries(v.properties).forEach(([subkey, subValue]) => {
        if (subkey in initialConfigforKey) return;

        initialConfigforKey[subkey] = subValue.default ?? null;

        if (
          model &&
          !isType(subValue) &&
          subValue.ui_element === ScanConfigUIElementDict.ModelIdentifier
        ) {
          const formModelType = match(model)
            .with({ type: EntityTypeDict.EMCellMesh }, () => 'EMCellMeshFromID')
            .with(
              { type: EntityTypeDict.Memodel },
              () => ModelIdentifierSelector[ExtendedEntitiesTypeDict.Memodel]
            )
            .with(
              {
                type: EntityTypeDict.Circuit,
                scale: CircuitScaleDictionary.Single,
              },
              () => ModelIdentifierSelector[ExtendedEntitiesTypeDict.MEModelWithSynapses]
            )
            .with(
              { type: EntityTypeDict.Circuit },
              () => ModelIdentifierSelector[ExtendedEntitiesTypeDict.Circuit]
            )
            .with(
              { type: EntityTypeDict.CellMorphology },
              () => ModelIdentifierSelector[ExtendedEntitiesTypeDict.UniversalCellMorphology]
            )
            .otherwise(() => {
              throw new Error(`Unsupported entity type: ${model.type}`);
            });

          initialConfigforKey[subkey] = {
            type: formModelType,
            id_str: model.id,
          };
        }
        if (
          model &&
          !isType(subValue) &&
          subValue.ui_element === ScanConfigUIElementDict.ModelIdentifierMultiple
        ) {
          const formModelType = match(model)
            .with(
              { type: EntityTypeDict.CellMorphology },
              () => ModelIdentifierSelector[ExtendedEntitiesTypeDict.UniversalCellMorphology]
            )
            .otherwise(() => {
              throw new Error(`Unsupported entity type: ${model.type}`);
            });
          initialConfigforKey[subkey] = [
            {
              type: formModelType,
              id_str: model.id,
            },
          ];
        }
      });

      state[k] = initialConfigforKey;
    } else if (v.ui_element === ScanConfigUIElementDict.BlockUnion) {
      state[k] = initialConfigforKey;
    } else {
      const nestedState: Record<string, Record<string, ConfigValue>> = {};

      Object.entries(initialConfigforKey).forEach(([subK, subV]) => {
        if (!isPlainObject(subV)) return;
        nestedState[subK] = subV;
      });

      state[k] = nestedState;
    }
  });

  return state;
}

export function useConfig({
  schema,
  initialConfig,
  model,
}: {
  schema: ConfigSchema;
  initialConfig?: Config;
  model: TSupportedEntitiesForScanConfiguration | Nullish;
}) {
  const [configState, setConfigState] = useState<Config>(() =>
    buildInitialConfigState(schema, initialConfig, model)
  );

  return [configState, setConfigState] as const;
}

/**
 * builds a lookup map from reference type names to the block dictionaries that hold them
 *
 * a block dictionary declares which reference types it supports via `reference_types` (a list)
 * for example, the `neuron_sets` dictionary might declare:
 *   reference_types: ["BiophysicalNeuronSetReference", "VirtualNeuronSetReference", "PointNeuronSetReference"]
 *
 * this produces a map like:
 *   {
 *     "BiophysicalNeuronSetReference": [{ configKey: "neuron_sets", singularName: "Neuron Set" }],
 *     "VirtualNeuronSetReference":     [{ configKey: "neuron_sets", singularName: "Neuron Set" }],
 *     "PointNeuronSetReference":       [{ configKey: "neuron_sets", singularName: "Neuron Set" }],
 *     "TimestampsReference":           [{ configKey: "timestamps",  singularName: "Timestamps" }],
 *     ...
 *   }
 *
 * the value is an array because multiple dictionaries could support the same reference type
 *
 * this map is consumed by the Reference dropdown component to find which dictionaries
 * to pull options from, given a field's accepted `reference_types`
 */
export function useReferenceTypeDict(schema: ConfigSchema) {
  const referenceTypeDict: Record<
    string,
    Array<{
      configKey: string;
      singularName: string;
    }>
  > = {};

  if (!schema) return referenceTypeDict;

  Object.keys(schema?.properties).forEach((k) => {
    const v = schema.properties[k];

    if (v.ui_element === ScanConfigUIElementDict.BlockDictionary) {
      const refTypes = v.reference_types;
      for (const refType of refTypes) {
        if (!referenceTypeDict[refType]) {
          referenceTypeDict[refType] = [];
        }
        referenceTypeDict[refType].push({
          configKey: k,
          singularName: v.singular_name,
        });
      }
    }
  });

  return referenceTypeDict;
}
