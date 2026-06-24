'use client';

/**
 * loads everything the scan-config editor needs: entity, ObiOne schema, grid endpoint, optional circuit mapping
 *
 * assumes `entity` if you already fetched it (workflow pages), otherwise pass `entityId` and will fetch it next
 * when stuff's ready, `ready` has the props for `ScanConfigTemplate`. until then check `isLoading`, `error`, or `unresolvedMessage`
 */

import { get } from 'es-toolkit/compat';
import { useMemo } from 'react';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import {
  type TSchemaMappingConfiguration,
  useObioneJsonSchema,
  useSchemaMappingConfiguration,
} from '@/features/scan-config/components/hooks/schema';
import {
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import {
  type Config,
  type ConfigSchema,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  SchemaMappingKeyDict,
  type SchemaName,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntitiesForScanConfiguration,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { resolvePrimaryEntityIdFromConfigForm } from '@/features/scan-config/workflow/workflow-schema-selection';
import {
  buildGeneratedApiUrl,
  resolveScanConfigFromRegistry,
  resolveSimulatorScanConfigOverride,
  type TScanConfigRegistryConfig,
} from '@/ui/segments/workflows/config/scan-config-binding';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { Nullish } from '@/utils/type';

export type TUseScanConfigurationParams = {
  entityId?: string | Nullish;
  entity?: TSupportedEntitiesForScanConfiguration | Nullish;
  virtualLabId: string;
  projectId: string;
  origin?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  activity?: TScanConfigActivity;
  campaignOriginAction?: TScanConfigCampaignOriginActionDict;
  scanConfig: TScanConfigRegistryConfig;
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
  resolveSessionFromIdType?: (browseType: TExtendedEntitiesTypeDict) => string | undefined;
};

export type TScanConfigurationReadyState = {
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  entityType: TSupportedEntityTypesForScanConfiguration;
  virtualLabId: string;
  projectId: string;
  origin?: string;
  initialConfig?: Config;
  defaultTab: TScanConfigTabs;
  readOnly?: boolean;
  activity: TScanConfigActivity;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  schema: ConfigSchema;
  schemaName: SchemaName;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  generatedEndpoint: string;
  aiEnabled: boolean;
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
  resolveSessionFromIdType?: (browseType: TExtendedEntitiesTypeDict) => string | undefined;
};

/**
 * - `ready` hands this to the template
 * - `unresolvedMessage` soft fail (bad entity type, missing schema, ...), not a thrown error
 */
export type TUseScanConfigurationResult = {
  isLoading: boolean;
  error: Error | null;
  unresolvedMessage: string | null;
  ready: TScanConfigurationReadyState | null;
};

export function useScanConfiguration({
  entityId,
  entity: entityFromProps,
  virtualLabId,
  projectId,
  origin,
  initialConfig,
  defaultTab = ScanConfigDefaultTab,
  readOnly,
  activity = ScanConfigActivity.Simulate,
  campaignOriginAction = ScanConfigCampaignOriginActionDict.Task,
  scanConfig,
  workflowSessionSelection,
  resolveSessionFromIdType,
}: TUseScanConfigurationParams): TUseScanConfigurationResult {
  const registryResolved = useMemo(() => resolveScanConfigFromRegistry(scanConfig), [scanConfig]);

  // When the entity id must be extracted from a saved config form, we need a schema to do so.
  // Use the descriptor's default schema for that extraction — the circuit reference shape is the
  // same across circuit-simulation schemas, so it resolves the primary entity id regardless.
  const needsFormEntityId = !entityFromProps && !entityId && !!initialConfig;
  const { schema: formSchema } = useObioneJsonSchema({
    schemaName: needsFormEntityId ? registryResolved.schemaName : undefined,
  });

  const entityIdFromForm = useMemo(
    () =>
      formSchema && initialConfig
        ? resolvePrimaryEntityIdFromConfigForm(formSchema, initialConfig)
        : undefined,
    [initialConfig, formSchema]
  );

  const effectiveEntityId = entityId ?? entityIdFromForm;
  const shouldFetchEntity = !entityFromProps && !!effectiveEntityId;

  const {
    entity: fetchedEntity,
    isLoading: loadingEntity,
    error,
  } = useModelQuery({
    id: shouldFetchEntity ? effectiveEntityId : undefined,
    context: { virtualLabId, projectId },
  });

  const entity = entityFromProps ?? fetchedEntity;
  const isEntityLoading = shouldFetchEntity && loadingEntity;

  // Select the circuit-simulation generation endpoint + schema from the circuit's
  // `target_simulator` (Brian2 / LearningEngine), falling back to the descriptor default.
  const simulatorOverride = useMemo(() => {
    const targetSimulator = entity && 'target_simulator' in entity ? entity.target_simulator : null;
    return resolveSimulatorScanConfigOverride(targetSimulator);
  }, [entity]);

  const effectiveSchemaName = simulatorOverride?.schemaName ?? registryResolved.schemaName;
  const effectiveEndpoint = simulatorOverride
    ? buildGeneratedApiUrl(simulatorOverride.generatedApiPath)
    : registryResolved.generatedEndpoint;

  const { schema, isLoading: loadingSchema } = useObioneJsonSchema({
    schemaName: effectiveSchemaName,
  });

  const resolved = useMemo(() => {
    if (isEntityLoading && !entity) {
      return null;
    }

    const entityConfig = getEntityByExtendedType({ type: registryResolved.entityType });

    return {
      usedType: registryResolved.entityType,
      entityConfig,
      endpoint: effectiveEndpoint,
      schemaName: effectiveSchemaName,
      effectiveSchemaMappingKey: registryResolved.schemaMappingKey,
    };
  }, [entity, isEntityLoading, registryResolved, effectiveEndpoint, effectiveSchemaName]);

  const property_endpoints = resolved?.effectiveSchemaMappingKey
    ? get(schema?.property_endpoints, resolved.effectiveSchemaMappingKey, '')
    : '';

  const { data: schemaMappingConfig, isLoading: loadingConfiguration } =
    useSchemaMappingConfiguration({
      entityId: entity?.id,
      workspace: { virtualLabId, projectId },
      endpoint: property_endpoints,
      isSchemaLoaded:
        !loadingSchema &&
        !!schema &&
        resolved?.effectiveSchemaMappingKey === SchemaMappingKeyDict.Circuit,
    });

  const isLoading = loadingConfiguration || isEntityLoading || loadingSchema;

  return useMemo(() => {
    if (isLoading) {
      return { isLoading: true, error: null, unresolvedMessage: null, ready: null };
    }

    if (error) {
      return {
        isLoading: false,
        error,
        unresolvedMessage: null,
        ready: null,
      };
    }

    if (!resolved?.usedType || !resolved.entityConfig) {
      return {
        isLoading: false,
        error: null,
        unresolvedMessage: 'Could not resolve the entity or the entity configuration',
        ready: null,
      };
    }

    if (!resolved.endpoint) {
      return {
        isLoading: false,
        error: null,
        unresolvedMessage: `No grid generation found for ${resolved.entityConfig.title}`,
        ready: null,
      };
    }

    if (!resolved.schemaName || !schema) {
      return {
        isLoading: false,
        error: null,
        unresolvedMessage: `No configuration schema found for ${resolved.entityConfig.title}`,
        ready: null,
      };
    }

    const aiEnabled =
      activity === ScanConfigActivity.Simulate || activity === ScanConfigActivity.Process;

    if (!entity && !resolved.usedType) {
      return { isLoading: false, error: null, unresolvedMessage: null, ready: null };
    }

    return {
      isLoading: false,
      error: null,
      unresolvedMessage: null,
      ready: {
        entity,
        entityType: resolved.usedType,
        virtualLabId,
        projectId,
        origin,
        initialConfig,
        defaultTab,
        readOnly,
        activity,
        campaignOriginAction,
        schema,
        schemaName: resolved.schemaName,
        schemaMappingConfig,
        generatedEndpoint: resolved.endpoint,
        aiEnabled,
        workflowSessionSelection,
        resolveSessionFromIdType,
      },
    };
  }, [
    activity,
    campaignOriginAction,
    defaultTab,
    entity,
    error,
    origin,
    initialConfig,
    isLoading,
    projectId,
    readOnly,
    resolveSessionFromIdType,
    resolved,
    schema,
    schemaMappingConfig,
    virtualLabId,
    workflowSessionSelection,
  ]);
}
