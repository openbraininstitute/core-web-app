import $RefParser from '@apidevtools/json-schema-ref-parser';
import { useQueries, useQuery } from '@tanstack/react-query';
import { pick } from 'es-toolkit/compat';
import get from 'es-toolkit/compat/get';
import { atom } from 'jotai';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';

import { EntityTypeDict, type IMEModel } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';
import { config } from '@/config';
import { isAtom, isPlainObject } from '@/features/scan-config/components/utils';
import {
  type AtomsMap,
  type ConfigSchema,
  isType,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlock,
} from '@/features/scan-config/types';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { Config, ConfigValue } from '@/features/scan-config/components/components';
import type { WorkspaceContext } from '@/types/common';

export function useObioneJsonSchema(schemaName: SchemaName) {
  const { data: schema } = useQuery({
    queryKey: keyBuilder.obiOneJsonSchema(schemaName),
    queryFn: () => fetchSchema({ schemaName }),
    // Keep data fresh indefinitely to prevent atom regeneration on window focus
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return schema;
}

export type TUsabilityAndPropertyMappingConfiguration = {
  usability: Record<string, boolean>;
  properties: Record<string, ConfigValue>;
};

export function useSchemaUsabilityAndPropertiesMappingConfiguration({
  schema,
  circuitId,
  workspace,
  endpointType,
}: {
  workspace: WorkspaceContext;
  circuitId: string;
  schema: ConfigSchema | undefined;
  endpointType: string;
}) {
  const properties_endpoint = get(schema?.properties_endpoints, endpointType, '');
  const usability_endpoint = get(schema?.usability_endpoints ?? {}, endpointType, '');

  return useQueries({
    queries: [
      {
        queryKey: ['entity_properties_config', { workspace, circuitId, endpointType }],
        queryFn: async () => {
          const api = await obioneApi();
          return api.get<TUsabilityAndPropertyMappingConfiguration['properties']>(
            `/declared${properties_endpoint}`.replace('{circuit_id}', circuitId),
            {
              headers: {
                ...getEntityCoreContext(workspace).headers,
              },
            }
          );
        },
        enabled: !!properties_endpoint,
        refetchOnWindowFocus: false,
        staleTime: 3600, //  1 hour
      },
      {
        queryKey: ['entity_usability_config', { workspace, circuitId, endpointType }],
        queryFn: async () => {
          const api = await obioneApi();
          return api.get<TUsabilityAndPropertyMappingConfiguration['usability']>(
            `/declared${usability_endpoint}`.replace('{circuit_id}', circuitId),
            {
              headers: {
                ...getEntityCoreContext(workspace).headers,
              },
            }
          );
        },
        enabled: !!usability_endpoint,
        refetchOnWindowFocus: false,
        staleTime: 3600, //  1 hour
      },
    ],
    combine(result) {
      return {
        isLoading: result.some((r) => r.isLoading),
        isError: result.some((r) => r.isError),
        data: {
          properties: result[0].data ?? {},
          usability: result[1].data ?? {},
        },
      };
    },
  });
}

export function getBlockUsabilityConfig({ block }: { block: TBlock }) {
  return pick(block, [
    'block_usability_entity_dependent',
    'block_usability_false_message',
    'block_usability_group',
    'block_usability_property',
  ]);
}

export function useDefaultConfig(
  schemaName: SchemaName,
  formModelType: 'CircuitFromId' = 'CircuitFromId'
) {
  const schema = useObioneJsonSchema(schemaName);

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

export function useAtomsMap({
  schema,
  initialConfig,
  model,
}: {
  schema?: ConfigSchema;
  initialConfig?: Config;
  model: ICircuit | IMEModel;
}) {
  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});

  useEffect(() => {
    if (!schema?.properties) return;

    const map: {
      [key: string]:
        | ReturnType<typeof atom<Record<string, ConfigValue>>>
        | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
    } = {};

    // Logic to build the atoms map based on initialConfig OR schema defaults
    if (initialConfig) {
      Object.entries(initialConfig)
        .filter(([k]) => isRootBlock(schema, k) || isRootBlockSingle(schema, k))
        .forEach(([k, v]) => {
          if (isPlainObject(v)) map[k] = atom<Record<string, ConfigValue>>(v);
        });

      Object.entries(initialConfig)
        .filter(([k]) => !isRootBlock(schema, k) && !isRootBlockSingle(schema, k))
        .forEach(([k, v]) => {
          map[k] = {};
          Object.entries(v).forEach(([subK, subV]) => {
            if (!isPlainObject(subV) || isAtom(map[k])) return;
            map[k][subK] = atom<Record<string, ConfigValue>>(subV);
          });
        });
    } else {
      Object.entries(schema.properties).forEach(([k, v]) => {
        if (isType(v)) return;
        if (v.ui_element === ScanConfigUIElementDict.BlockSingle) {
          const initial: Record<string, ConfigValue> = {};

          Object.entries(v.properties).forEach(([subkey, subValue]) => {
            initial[subkey] = subValue.default ?? null;
            if (
              !isType(subValue) &&
              subValue.ui_element === ScanConfigUIElementDict.ModelIdentifier
            ) {
              const formModelType = match(model)
                .with({ type: EntityTypeDict.Memodel }, () => 'MEModelFromID')
                .with(
                  {
                    type: EntityTypeDict.Circuit,
                    scale: CircuitScaleDictionary.Single,
                  },
                  () => 'MEModelWithSynapsesCircuitFromID'
                )
                .with({ type: EntityTypeDict.Circuit }, () => 'CircuitFromID')
                .otherwise(() => {
                  throw new Error(`Unsupported entity type: ${model.type}`);
                });
              initial[subkey] = {
                type: formModelType,
                id_str: model.id,
              };
            }
          });

          map[k] = atom<Record<string, ConfigValue>>(initial);
        } else if (v.ui_element === ScanConfigUIElementDict.BlockUnion) {
          // Initialize as empty - user must select a variant first (like block_dictionary)
          map[k] = atom<Record<string, ConfigValue>>({});
        } else {
          map[k] = {};
        }
      });
    }

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
      | ReturnType<typeof atom<Record<string, ConfigValue>>>
      | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
  } = {};

  Object.entries(newConfig)
    .filter(([k]) => isRootBlock(schema, k))
    .forEach(([k, v]) => {
      if (isPlainObject(v)) map[k] = atom<Record<string, ConfigValue>>(v);
    });

  Object.entries(newConfig)
    .filter(([k]) => !isRootBlock(schema, k))
    .forEach(([k, v]) => {
      map[k] = {};
      Object.entries(v).forEach(([subK, subV]) => {
        if (!isPlainObject(subV) || isAtom(map[k])) return;
        map[k][subK] = atom<Record<string, ConfigValue>>(subV);
      });
    });

  setAtomsMap(map);
}

export function useReferenceTypeDict(schemaName: SchemaName) {
  const schema = useObioneJsonSchema(schemaName);

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
