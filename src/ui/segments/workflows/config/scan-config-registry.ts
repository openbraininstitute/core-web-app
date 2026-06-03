import { ActivityRegistry } from './activities';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TScanConfigWorkflowDefinition } from '@/features/scan-config/workflow/types';
import type { TScanConfigRegistryConfig } from './scan-config-binding';
import type { IWorkflowDescriptor, TActivityEntry } from './types';

function collectRegistryWorkflows(activity: TActivityEntry): readonly IWorkflowDescriptor[] {
  const browseWorkflows = activity.browseWorkflows ?? [];
  return [...activity.workflows, ...browseWorkflows];
}

/** resolves registry scan-config config for a workflow definition id */
export function findScanConfigRegistryByDefinition(
  definition: TScanConfigWorkflowDefinition
): TScanConfigRegistryConfig | null {
  for (const activity of Object.values(ActivityRegistry)) {
    for (const workflow of collectRegistryWorkflows(activity)) {
      const scanConfig = workflow.scanConfig;
      if (scanConfig?.definition.id !== definition.id) {
        continue;
      }

      return {
        configureBinding: scanConfig.configureBinding,
        schemaName: scanConfig.schemaName,
      };
    }
  }

  return null;
}

/** resolves registry scan-config config for a workflow campaign/target type */
export function findScanConfigRegistryByTargetType(
  targetType: TExtendedEntitiesTypeDict
): TScanConfigRegistryConfig | null {
  for (const activity of Object.values(ActivityRegistry)) {
    for (const workflow of collectRegistryWorkflows(activity)) {
      if (workflow.targetType !== targetType) {
        continue;
      }

      const scanConfig = workflow.scanConfig;
      if (!scanConfig) {
        continue;
      }

      return {
        configureBinding: scanConfig.configureBinding,
        schemaName: scanConfig.schemaName,
      };
    }
  }

  return null;
}
