'use client';

import { WorkflowActivityDictValue, WorkspaceSection } from '@/constants';
import { createWorkflowNewRoutePage } from '@/ui/segments/workflows/browse/listing';

export default createWorkflowNewRoutePage(
  WorkflowActivityDictValue.build,
  WorkspaceSection.ScanConfigBuildWorkflow
);
