import type { TScanConfigWorkflowDefinition } from '@/features/scan-config/workflow/types';

export function defineScanConfigWorkflow<const T extends TScanConfigWorkflowDefinition>(
  definition: T
): T {
  return definition;
}
