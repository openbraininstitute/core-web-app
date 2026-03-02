'use client';

import { useModelQuery } from '@/features/scan-config/components/atoms';
import { useGeneratedApiUrl, useSchemaName } from '@/features/scan-config/components/hooks';
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
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Nullish } from '@/utils/type';

type Props = {
  entityId?: string | Nullish;
  entityType?: TExtendedEntitiesTypeDict | Nullish;
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

  const supportedType = getSupportedEntityTypesForScanConfiguration({
    type: entity?.type ?? entityType,
  });

  const entityDiscriminator = entity && 'scale' in entity ? entity.scale : null;

  const generatedApiUrl = useGeneratedApiUrl({
    activity,
    entityDiscriminator,
    entityType: supportedType,
  });

  const schemaName = useSchemaName({
    activity,
    entityDiscriminator,
    entityType: supportedType,
  });

  const { schema, isLoading: loadingSchema } = useObioneJsonSchema(schemaName);

  const { data: schemaMappingConfig, isLoading: loadingConfiguration } =
    useSchemaMappingConfiguration({
      schema,
      entityId: entity?.id,
      workspace: { virtualLabId, projectId },
      endpointType: schemaMappingKey,
    });

  const loading = loadingConfiguration || loadingEntity || loadingSchema;

  if (loading) {
    return <ScanConfigSkeleton />;
  }
  if (error) {
    return <div className="h-full w-full flex items-center justify-center">{error.message}</div>;
  }
  if (!schemaName || !schema) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        No schema found for {schemaName}
      </div>
    );
  }

  const aiEnabled = entity ? 'scale' in entity && entity.scale !== 'single' : false;

  if (entity || entityType) {
    return (
      <ScanConfigTemplate
        {...{
          entity,
          entityType: supportedType,
          entityDiscriminator,
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
          aiEnabled,
          generatedApiUrl,
        }}
      />
    );
  }

  return null;
}

export default ScanConfiguration;
