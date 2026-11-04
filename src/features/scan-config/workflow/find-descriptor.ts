import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';

import type { Config, SchemaName } from '@/features/scan-config/types';
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

/**
 * the workflow that wrote a stored form, when it is not the one opening it
 *
 * @param form: the stored form, whose `type` is the ScanConfig it was written with
 * @param schemaName: the schema of the workflow opening it
 * @returns the other workflow, or `null` when the form belongs here or to no workflow
 */
export function findWorkflowOfStoredForm({
  form,
  schemaName,
}: {
  form: Config | undefined;
  schemaName: SchemaName;
}): IWorkflowDescriptor | null {
  const formType = form?.type;
  if (!formType || formType === schemaName) return null;

  for (const activity of Object.values(ActivityRegistry)) {
    const workflow = activity.workflows.find(
      ({ scanConfig }) => scanConfig?.schemaName === formType
    );
    if (workflow) return workflow;
  }

  return null;
}
