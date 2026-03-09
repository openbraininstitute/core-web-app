'use client';

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
import { ScanConfigSkeleton } from '@/features/scan-config/components/loading-skeleton';
import { ScanConfigTemplate } from '@/features/scan-config/template';
import {
  type Config,
  getSupportedEntityTypesForScanConfiguration,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  type SchemaName,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { Nullish } from '@/utils/type';

type Props = {
  entityId?: string | Nullish;
  entityType: TExtendedEntitiesTypeDict;
  schemaMappingKey?: 'Circuit' | string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  className?: string;
  activity?: TScanConfigActivity;
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
  schemaMappingKey = 'Circuit',
}: Props) {
  const {
    entity,
    isLoading: loadingEntity,
    error,
  } = useModelQuery({
    id: entityId,
    context: { virtualLabId, projectId },
  });

  let endpoint: string | undefined;
  let schemaName: SchemaName | undefined;
  let usedType: TSupportedEntityTypesForScanConfiguration | undefined;
  let entityConfig: EntityCoreTypeConfig<any, any, any> | undefined;

  if (!loadingEntity) {
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

  const { data: schemaMappingConfig, isLoading: loadingConfiguration } =
    useSchemaMappingConfiguration({
      schema,
      entityId: entity?.id,
      workspace: { virtualLabId, projectId },
      endpointType: schemaMappingKey,
      isBoolean: !loadingEntity,
    });

  const loading = loadingConfiguration || loadingEntity || loadingSchema;

  if (loading) {
    return <ScanConfigSkeleton />;
  }

  if (error) {
    return <div className="h-full w-full flex items-center justify-center">{error?.message}</div>;
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
