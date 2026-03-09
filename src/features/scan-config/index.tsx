'use client';

import { useModelQuery } from '@/features/scan-config/components/atoms';
import { useSchemaName } from '@/features/scan-config/components/hooks';
import {
  useObioneJsonSchema,
  useSchemaMappingConfiguration,
} from '@/features/scan-config/components/hooks/schema';
import { ScanConfigSkeleton } from '@/features/scan-config/components/loading-skeleton';
import { ScanConfigTemplate } from '@/features/scan-config/template';
import {
  type Config,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';

export function ScanConfiguration({
  modelId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  defaultTab = ScanConfigDefaultTab,
  readOnly,
  className,
  activity = ScanConfigActivity.Simulate,
}: {
  modelId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  className?: string;
  activity?: TScanConfigActivity;
}) {
  const {
    entity,
    isLoading: loadingEntity,
    error,
  } = useModelQuery({
    id: modelId,
    context: { virtualLabId, projectId },
  });

  const schemaName = useSchemaName({ model: entity, activity });
  const { schema, isLoading: loadingSchema } = useObioneJsonSchema(schemaName);

  const { data: schemaMappingConfig, isLoading: loadingConfiguration } =
    useSchemaMappingConfiguration({
      schema,
      circuitId: entity?.id,
      workspace: { virtualLabId, projectId },
      endpointType: 'Circuit',
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

  if (entity) {
    return (
      <ScanConfigTemplate
        {...{
          entity,
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
        }}
      />
    );
  }

  return null;
}

export default ScanConfiguration;
