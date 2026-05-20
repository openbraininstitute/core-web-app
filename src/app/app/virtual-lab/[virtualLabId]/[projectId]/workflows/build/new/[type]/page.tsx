'use client';

import { WorkflowActivityDictValue, WorkspaceSection } from '@/constants';
import { createWorkflowNewRoutePage } from '@/ui/segments/workflows/browse';

export default createWorkflowNewRoutePage({
  activity: WorkflowActivityDictValue.build,
  section: WorkspaceSection.ScanConfigBuildWorkflow,
});
