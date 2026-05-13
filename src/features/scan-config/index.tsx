'use client';

import { get } from 'es-toolkit/compat';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import {
  getGeneratedApiUrl,
  getScanConfigSchemaName,
} from '@/features/scan-config/components/hooks';
import {
  useObioneJsonSchema,
  useSchemaMappingConfiguration,
} from '@/features/scan-config/components/hooks/schema';
import {
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import { ScanConfigTemplate } from '@/features/scan-config/template';
import {
  type Config,
  getSupportedEntityTypesForScanConfiguration,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  SchemaMappingKeyDict,
  type SchemaName,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSchemaMappingKey,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';

import ScanConfigSkeleton from './components/skeletons/full-page';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { Nullish } from '@/utils/type';

type Props = {
  entityId?: string | Nullish;
  entityType: TExtendedEntitiesTypeDict;
  schemaMappingKey?: TSchemaMappingKey;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  className?: string;
  activity?: TScanConfigActivity;
  campaignOriginAction?: TScanConfigCampaignOriginActionDict;
};

export function ScanConfiguration({
  entityId,
  entityType,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  defaultTab = ScanConfigDefaultTab,
  readOnly,
  className,
  activity = ScanConfigActivity.Simulate,
  schemaMappingKey = SchemaMappingKeyDict.Circuit,
  campaignOriginAction = ScanConfigCampaignOriginActionDict.Task,
}: Props) {
  let endpoint: string | undefined;
  let schemaName: SchemaName | undefined;
  let usedType: TSupportedEntityTypesForScanConfiguration | undefined;

  let entityConfig: EntityCoreTypeConfig<any, any, any> | undefined;

  const {
    entity,
    isLoading: loadingEntity,
    error,
  } = useModelQuery({
    id: entityId,
    context: { virtualLabId, projectId },
  });

  if (!loadingEntity && (entity || entityType)) {
    usedType = getSupportedEntityTypesForScanConfiguration({
      entity: entity ?? { type: entityType },
    });

    entityConfig = getEntityByExtendedType({ type: usedType });
    endpoint = getGeneratedApiUrl({
      activity,
      entityType: usedType,
    });

    schemaName = getScanConfigSchemaName({
      activity,
      entityType: usedType,
    });
  }

  const { schema, isLoading: loadingSchema } = useObioneJsonSchema({
    schemaName,
  });

  const property_endpoints = schemaMappingKey
    ? get(schema?.property_endpoints, schemaMappingKey, '')
    : '';

  // TODO: discussed with @James to refactor this endpoint to purpose-based endpoints
  // one for usage and one for property mapping
  const { data: schemaMappingConfig, isPending: loadingConfiguration } =
    useSchemaMappingConfiguration({
      entityId: entity?.id,
      workspace: { virtualLabId, projectId },
      endpoint: property_endpoints,
      isSchemaLoaded: !loadingSchema && !!schema && schemaMappingKey === 'Circuit',
    });

  const loading = loadingConfiguration || loadingEntity || loadingSchema;

  if (loading) {
    return <ScanConfigSkeleton />;
  }

  if (error) {
    return <div className="h-full w-full flex items-center justify-center">{error?.message}</div>;
  }

  if (!usedType || !entityConfig) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        Could not resolve the entity or the entity configuration
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        No grid generation found for {entityConfig?.title}
      </div>
    );
  }

  if (!schemaName || !schema) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        No configuration schema found for {entityConfig?.title}
      </div>
    );
  }

  const aiEnabled = entity ? 'scale' in entity && entity.scale !== 'single' : false;

  if (entity || usedType) {
    return (
      <ScanConfigTemplate
        {...{
          entity,
          entityType: usedType,
          virtualLabId,
          projectId,
          initialCampaignId,
          initialConfig,
          defaultTab,
          readOnly,
          className,
          activity,
          campaignOriginAction,
          schema,
          schemaName,
          schemaMappingConfig,
          generatedEndpoint: endpoint,
          aiEnabled,
        }}
      />
    );
  }

  return null;
}

export default ScanConfiguration;
