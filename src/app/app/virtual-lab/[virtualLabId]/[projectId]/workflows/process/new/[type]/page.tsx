'use client';

import { WorkflowActivityDictValue, WorkspaceSection } from '@/constants';
import { createWorkflowNewRoutePage } from '@/ui/segments/workflows/browse';

export default createWorkflowNewRoutePage({
  activity: WorkflowActivityDictValue.process,
  section: WorkspaceSection.ProcessWorkflow,
});
