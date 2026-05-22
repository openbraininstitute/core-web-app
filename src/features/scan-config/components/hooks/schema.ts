import $RefParser from '@apidevtools/json-schema-ref-parser';
import { type QueryClient, useQuery } from '@tanstack/react-query';
import { omit, pick } from 'es-toolkit/compat';
import { useMemo, useState } from 'react';
import { match } from 'ts-pattern';

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

const OBI_ONE_JSON_SCHEMA_STALE_TIME_MS = Number.POSITIVE_INFINITY;

function obiOneJsonSchemaQueryOptions(schemaName: SchemaName) {
  return {
    queryKey: keyBuilder.obiOneJsonSchema(schemaName),
    queryFn: () => fetchSchema({ schemaName }),
    staleTime: OBI_ONE_JSON_SCHEMA_STALE_TIME_MS,
  } as const;
}

export async function fetchObiOneJsonSchema(opts: {
  qc?: QueryClient;
  schemaName: SchemaName;
}): Promise<ConfigSchema> {
  if (opts.qc) {
    return opts.qc.fetchQuery(obiOneJsonSchemaQueryOptions(opts.schemaName));
  }

  return fetchSchema({ schemaName: opts.schemaName });
}

export function useObioneJsonSchema({ schemaName }: { schemaName?: SchemaName | undefined }) {
  const { data: schema, isLoading } = useQuery({
    ...(schemaName
      ? obiOneJsonSchemaQueryOptions(schemaName)
      : {
          queryKey: ['obi-one-json-schema', 'disabled'] as const,
          queryFn: (): Promise<ConfigSchema> =>
            Promise.reject(new Error('useObioneJsonSchema: schemaName is required')),
          enabled: false,
        }),
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

export function isRootBlockSingle(schema: ConfigSchema, key: string) {
  return (
    schema.properties?.[key] &&
    schema.properties[key].ui_element === ScanConfigUIElementDict.BlockUnion
  );
}

export async function fetchSchema({ schemaName }: { schemaName: SchemaName }) {
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
