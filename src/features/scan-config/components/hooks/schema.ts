import $RefParser from '@apidevtools/json-schema-ref-parser';
import { useQuery } from '@tanstack/react-query';
import { omit, pick } from 'es-toolkit/compat';
import { atom } from 'jotai';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';
import { config } from '@/config';
import { isAtom, isPlainObject } from '@/features/scan-config/components/utils';
import {
  type AtomsMap,
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
  properties: Record<string, any> | null;
};

const SCHEMA_MAPPING_CONFIGURATION_STALE_TIME_MS = 60 * 60 * 1000;

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
      return api.get<{
        usability: {
          [key: string]: boolean;
        } | null;
        [key: string]: any;
      }>(`/declared${endpoint}`.replace('{circuit_id}', entityId ?? ''), {
        headers: {
          ...getEntityCoreContext(workspace).headers,
        },
      });
    },
    enabled: !!endpoint && isSchemaLoaded,
    refetchOnWindowFocus: false,
    staleTime: SCHEMA_MAPPING_CONFIGURATION_STALE_TIME_MS,
    select: (resp) => {
      return {
        properties: omit(resp, ['usability']),
        usability: pick(resp, ['usability']).usability,
      };
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

export function useDefaultConfig(
  schemaName: SchemaName,
  formModelType: 'CircuitFromId' = 'CircuitFromId'
) {
  const { schema } = useObioneJsonSchema({ schemaName });

  if (!schema) return;

  const map: {
    [key: string]: ConfigValue | Record<string, ConfigValue>;
  } = {};

  Object.entries(schema.properties).forEach(([k, v]) => {
    if (isType(v)) return;
    if (v.ui_element === ScanConfigUIElementDict.BlockSingle) {
      const initial: Record<string, ConfigValue> = {};

      Object.entries(v.properties).forEach(([subkey, subValue]) => {
        initial[subkey] = subValue.default ?? null;
        if (!isType(subValue) && subValue.ui_element === ScanConfigUIElementDict.ModelIdentifier) {
          initial[subkey] = {
            type: formModelType,
            id_str: '',
          };
        }
      });

      map[k] = initial;
    } else {
      map[k] = {};
    }
  });

  return map as Config;
}

export function isRootBlock(schema: ConfigSchema, key: string) {
  return (
    schema.properties?.[key] &&
    schema.properties[key].ui_element === ScanConfigUIElementDict.BlockSingle
  );
}

export function isRootBlockSingle(schema: ConfigSchema, key: string) {
  return (
    schema.properties?.[key] &&
    schema.properties[key].ui_element === ScanConfigUIElementDict.BlockUnion
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

export function useAtomsMap({
  schema,
  initialConfig = {},
  model,
}: {
  schema?: ConfigSchema;
  initialConfig?: Config;
  model: TSupportedEntitiesForScanConfiguration | Nullish;
}) {
  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});

  useEffect(() => {
    if (!schema?.properties) return;

    const map: {
      [key: string]:
        | ReturnType<typeof atom<Record<string, ConfigValue>>>
        | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
    } = {};

    Object.entries(schema.properties).forEach(([k, v]) => {
      if (isType(v)) return;

      const initialConfigforKey = initialConfig[k] ?? {};

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

        map[k] = atom<Record<string, ConfigValue | Array<ConfigValue>>>(initialConfigforKey);
      } else if (v.ui_element === ScanConfigUIElementDict.BlockUnion) {
        map[k] = atom<Record<string, ConfigValue | Array<ConfigValue>>>(initialConfigforKey);
      } else {
        map[k] = {};
        Object.entries(initialConfigforKey).forEach(([subK, subV]) => {
          if (!isPlainObject(subV) || isAtom(map[k])) return;
          map[k][subK] = atom<Record<string, ConfigValue>>(subV);
        });
      }
    });

    setAtomsMap(map);
  }, [schema, model, initialConfig]);

  return [atomsMap, setAtomsMap] as const;
}

export function resetConfig(
  schema: ConfigSchema,
  newConfig: Config,
  setAtomsMap: (newMap: AtomsMap) => void
) {
  const map: {
    [key: string]:
      | ReturnType<typeof atom<Record<string, ConfigValue | Array<ConfigValue>>>>
      | Record<string, ReturnType<typeof atom<Record<string, ConfigValue | Array<ConfigValue>>>>>;
  } = {};

  // First, populate from newConfig
  Object.entries(newConfig)
    .filter(([k]) => isRootBlock(schema, k) || isRootBlockSingle(schema, k))
    .forEach(([k, v]) => {
      if (isPlainObject(v)) map[k] = atom<Record<string, ConfigValue | Array<ConfigValue>>>(v);
    });

  Object.entries(newConfig)
    .filter(([k]) => !isRootBlock(schema, k) && !isRootBlockSingle(schema, k))
    .forEach(([k, v]) => {
      map[k] = {};
      if (!v || !isPlainObject(v)) return;
      Object.entries(v).forEach(([subK, subV]) => {
        if (!isPlainObject(subV) || isAtom(map[k])) return;
        map[k][subK] = atom<Record<string, ConfigValue | Array<ConfigValue>>>(subV);
      });
    });

  // Ensure ALL schema-defined root keys exist in the map, even if absent from newConfig.
  // Without this, useAtomsMap's hasInitializedMapForSchema guard fails and re-initializes
  // the entire map from defaults, wiping the restored data.
  if (schema?.properties) {
    for (const [k, v] of Object.entries(schema.properties)) {
      if (isType(v) || k in map) continue;
      if (
        v.ui_element === ScanConfigUIElementDict.BlockSingle ||
        v.ui_element === ScanConfigUIElementDict.BlockUnion
      ) {
        // Create atom with empty defaults for missing single/union blocks
        const initial: Record<string, ConfigValue | Array<ConfigValue>> = {};
        if ('properties' in v && v.properties) {
          Object.entries(v.properties).forEach(([subkey, subValue]) => {
            initial[subkey] = isType(subValue) ? null : (subValue.default ?? null);
          });
        }
        map[k] = atom<Record<string, ConfigValue | Array<ConfigValue>>>(initial);
      } else {
        // Dictionary or other block types — empty map
        map[k] = {};
      }
    }
  }

  setAtomsMap(map);
}

export function useReferenceTypeDict(schema: ConfigSchema) {
  const referenceTypeDict: Record<
    string,
    {
      configKey: string;
      singularName: string;
    }
  > = {};

  if (!schema) return referenceTypeDict;

  Object.keys(schema?.properties).forEach((k) => {
    const v = schema.properties[k];

    if (v.ui_element === ScanConfigUIElementDict.BlockDictionary) {
      const refType = v.reference_type;
      referenceTypeDict[refType] = {
        configKey: k,
        singularName: v.singular_name,
      };
    }
  });

  return referenceTypeDict;
}
