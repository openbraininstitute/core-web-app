'use client';

import $RefParser from '@apidevtools/json-schema-ref-parser';
import { type QueryClient, useQuery } from '@tanstack/react-query';
import { omit, pick } from 'es-toolkit/compat';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { applyWorkflowSessionSelectionPatch } from '@/features/scan-config/workflow/workflow-session-selection';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
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

  // @ts-expect-error: dereferenced is a JSONSchema6 object, but we know it has the components property
  const theSchema = dereferenced.components.schemas[schemaName] as ConfigSchema;

  return theSchema;
}

const ModelIdentifierSelector = {
  [ExtendedEntitiesTypeDict.Memodel]: 'MEModelFromID',
  [ExtendedEntitiesTypeDict.SingleNeuronCircuit]: 'MEModelWithSynapsesCircuitFromID',
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
              () => ModelIdentifierSelector[ExtendedEntitiesTypeDict.SingleNeuronCircuit]
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
            .with({ type: EntityTypeDict.EMCellMesh }, () => 'EMCellMeshFromID')
            .with(
              { type: EntityTypeDict.CellMorphology },
              () => ModelIdentifierSelector[ExtendedEntitiesTypeDict.UniversalCellMorphology]
            )
            .with(
              { type: EntityTypeDict.Memodel },
              () => ModelIdentifierSelector[ExtendedEntitiesTypeDict.Memodel]
            )
            .otherwise(() => {
              throw new Error(`Unsupported entity type: ${model.type}`);
            });

          if (formModelType) {
            initialConfigforKey[subkey] = [
              {
                type: formModelType,
                id_str: model.id,
              },
            ];
          }
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

/**
 * determines whether browse {@link applyWorkflowSessionSelectionPatch session selection}
 * should overwrite the initialize model field when building editor state
 *
 * @returns `true` only for fresh configure flows (no origin campaign). Returns `false`
 *   when session/resolver inputs are missing, or when an origin campaign config is
 *   already available
 *
 * @remarks
 * resume and duplicate URLs pass `?origin=` and load `initialConfig` from the stored
 * campaign form. Patching session selection on top would replace grouped model inputs
 * (e.g. EM synapse mapping neuron sets) with a partial browse selection
 */
function shouldApplyWorkflowSessionSelection(opts: {
  origin?: string;
  initialConfig?: Config;
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
  resolveFromIdType?: (browseType: TExtendedEntitiesTypeDict) => string | undefined;
}): boolean {
  if (!opts.workflowSessionSelection || !opts.resolveFromIdType) {
    return false;
  }

  if (opts.origin || opts.initialConfig) {
    return false;
  }

  return true;
}

/**
 * builds the scan-config editor state from schema defaults, optional origin form,
 * entity model, and optional workflow browse session selection
 *
 * session selection is applied only when {@link shouldApplyWorkflowSessionSelection}
 * returns `true`; otherwise the origin/initial form is returned unchanged
 *
 * @param schema: scan-config schema
 * @param initialConfig: optional origin form
 * @param model: entity model
 * @param workflowSessionSelection: optional workflow browse session selection
 * @param resolveFromIdType: optional function to resolve the from_id type from the browse type
 * @param origin: optional campaign id from `?origin=` when resuming or duplicating
 * @returns the scan-config editor state
 */
function buildConfigState(
  schema: ConfigSchema,
  initialConfig: Config | undefined,
  model: TSupportedEntitiesForScanConfiguration | Nullish,
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null,
  resolveFromIdType?: (browseType: TExtendedEntitiesTypeDict) => string | undefined,
  origin?: string
): Config {
  const baseConfig = buildInitialConfigState(schema, initialConfig, model);

  // new browse → configure: seed the initialize model field from sessionStorage
  // duplicate/resume: keep origin campaign form; session selection is route-only
  if (
    !shouldApplyWorkflowSessionSelection({
      origin,
      initialConfig,
      workflowSessionSelection,
      resolveFromIdType,
    })
  ) {
    return baseConfig;
  }

  if (!workflowSessionSelection || !resolveFromIdType) {
    return baseConfig;
  }

  return applyWorkflowSessionSelectionPatch({
    config: baseConfig,
    schema,
    sessionSelection: workflowSessionSelection,
    resolveFromIdType,
  });
}

/**
 * hook for the scan-config form blob (`config` + `setConfig`).
 *
 * @param origin: campaign id from `?origin=` when resuming or duplicating
 * when set, session selection is not merged into the form (see
 * {@link shouldApplyWorkflowSessionSelection})
 *
 * @param schema: scan-config schema
 * @param initialConfig: optional origin form
 * @param model: entity model
 * @param workflowSessionSelection: optional workflow browse session selection
 * @param resolveFromIdType: optional function to resolve the from_id type from the browse type
 * @returns the scan-config form blob (`config` + `setConfig`)
 */
export function useConfig({
  schema,
  initialConfig,
  model,
  origin,
  workflowSessionSelection,
  resolveFromIdType,
}: {
  schema: ConfigSchema;
  initialConfig?: Config;
  model: TSupportedEntitiesForScanConfiguration | Nullish;
  origin?: string;
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
  resolveFromIdType?: (browseType: TExtendedEntitiesTypeDict) => string | undefined;
}) {
  const [configState, setConfigState] = useState<Config>(() =>
    buildConfigState(
      schema,
      initialConfig,
      model,
      workflowSessionSelection,
      resolveFromIdType,
      origin
    )
  );
  const appliedInitialConfigRef = useRef<Config | undefined>(initialConfig);

  useEffect(() => {
    if (appliedInitialConfigRef.current === initialConfig) {
      return;
    }

    appliedInitialConfigRef.current = initialConfig;
    setConfigState(
      buildConfigState(
        schema,
        initialConfig,
        model,
        workflowSessionSelection,
        resolveFromIdType,
        origin
      )
    );
  }, [initialConfig, model, origin, resolveFromIdType, schema, workflowSessionSelection]);

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
