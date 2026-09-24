import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import type {
  Config,
  ConfigSchema,
  SchemaName,
  TScanConfigActivity,
  TScanConfigTabs,
  TSupportedEntitiesForScanConfiguration,
  TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import type { TAnyWorkflowSeed } from '@/features/scan-config/workflow/seeding/workflow-seed';
import type { TWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { Nullish } from '@/utils/type';

export type ScanConfigTemplateProps = {
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  origin?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  className?: string;
  activity: TScanConfigActivity;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  schema: ConfigSchema;
  schemaName: SchemaName;
  aiEnabled: boolean;
  generatedEndpoint: string;
  entityType: TSupportedEntityTypesForScanConfiguration;
  campaignEntityType?: TExtendedEntitiesTypeDict;
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
  resolveSessionFromIdType?: (browseType: TExtendedEntitiesTypeDict) => string | undefined;
  seed?: TAnyWorkflowSeed;
  taskTypeBindings?: TWorkflowTaskTypeBindings;
};
