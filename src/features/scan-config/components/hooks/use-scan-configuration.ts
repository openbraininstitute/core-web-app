'use client';

/**
 * loads everything the scan-config editor needs: entity, ObiOne schema, grid endpoint, optional circuit mapping
 *
 * assumes `entity` if you already fetched it (workflow pages), otherwise pass `entityId` and will fetch it next
 * when stuff's ready, `ready` has the props for `ScanConfigTemplate`. until then check `isLoading`, `error`, or `unresolvedMessage`
 */

import { get } from 'es-toolkit/compat';
import { useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import {
  getGeneratedApiUrl,
  getScanConfigSchemaName,
} from '@/features/scan-config/components/hooks';
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
  getSupportedEntityTypesForScanConfiguration,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  SchemaMappingKeyDict,
  type SchemaName,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSchemaMappingKey,
  type TSupportedEntitiesForScanConfiguration,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Nullish } from '@/utils/type';

export type TUseScanConfigurationParams = {
  entityId?: string | Nullish;
  entityType: TExtendedEntitiesTypeDict;
  entity?: TSupportedEntitiesForScanConfiguration | Nullish;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  activity?: TScanConfigActivity;
  schemaMappingKey?: TSchemaMappingKey;
  campaignOriginAction?: TScanConfigCampaignOriginActionDict;
};

export type TScanConfigurationReadyState = {
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  entityType: TSupportedEntityTypesForScanConfiguration;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
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
  entityType,
  entity: entityFromProps,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  defaultTab = ScanConfigDefaultTab,
  readOnly,
  activity = ScanConfigActivity.Simulate,
  schemaMappingKey,
  campaignOriginAction = ScanConfigCampaignOriginActionDict.Task,
}: TUseScanConfigurationParams): TUseScanConfigurationResult {
  const shouldFetchEntity = !entityFromProps && !!entityId;

  const {
    entity: fetchedEntity,
    isLoading: loadingEntity,
    error,
  } = useModelQuery({
    id: shouldFetchEntity ? entityId : undefined,
    context: { virtualLabId, projectId },
  });

  const entity = entityFromProps ?? fetchedEntity;
  const isEntityLoading = shouldFetchEntity && loadingEntity;

  const resolved = useMemo(() => {
    if (isEntityLoading && !entity) {
      return null;
    }

    if (!entity && !entityType) {
      return null;
    }

    const usedType = getSupportedEntityTypesForScanConfiguration({
      entity: entity ?? { type: entityType },
    });

    const entityConfig = getEntityByExtendedType({ type: usedType });
    const endpoint = getGeneratedApiUrl({
      activity,
      entityType: usedType,
    });
    const schemaName = getScanConfigSchemaName({
      activity,
      entityType: usedType,
    });

    return { usedType, entityConfig, endpoint, schemaName };
  }, [activity, entity, entityType, isEntityLoading]);

  const { schema, isLoading: loadingSchema } = useObioneJsonSchema({
    schemaName: resolved?.schemaName,
  });

  const effectiveSchemaMappingKey = useMemo((): TSchemaMappingKey | undefined => {
    if (schemaMappingKey) {
      return schemaMappingKey;
    }
    // TODO: WHY DO WE NEED THIS?: THERE SHOULD BE A SINGLE SOURCE OF TRUTH (THE WORKFLOW CONFIG)
    if (
      resolved?.usedType === ExtendedEntitiesTypeDict.Circuit ||
      resolved?.usedType === ExtendedEntitiesTypeDict.MEModelWithSynapses
    ) {
      return SchemaMappingKeyDict.Circuit;
    }

    return undefined;
  }, [resolved?.usedType, schemaMappingKey]);

  const property_endpoints = effectiveSchemaMappingKey
    ? get(schema?.property_endpoints, effectiveSchemaMappingKey, '')
    : '';

  const { data: schemaMappingConfig, isLoading: loadingConfiguration } =
    useSchemaMappingConfiguration({
      entityId: entity?.id,
      workspace: { virtualLabId, projectId },
      endpoint: property_endpoints,
      isSchemaLoaded:
        !loadingSchema && !!schema && effectiveSchemaMappingKey === SchemaMappingKeyDict.Circuit,
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
        initialCampaignId,
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
      },
    };
  }, [
    activity,
    campaignOriginAction,
    defaultTab,
    entity,
    error,
    initialCampaignId,
    initialConfig,
    isLoading,
    projectId,
    readOnly,
    resolved,
    schema,
    schemaMappingConfig,
    virtualLabId,
  ]);
}
