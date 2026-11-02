import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';

import type { IWorkflowDescriptor } from '@/ui/segments/workflows/config/types';

export function findWorkflowDescriptorByDefinitionId(
  definitionId: string
): IWorkflowDescriptor | null {
  for (const activity of Object.values(ActivityRegistry)) {
    const workflows = [...activity.workflows, ...(activity.browseWorkflows ?? [])];

    for (const workflow of workflows) {
      if (workflow.scanConfig?.definition.id === definitionId) {
        return workflow;
      }
    }
  }

  return null;
}
