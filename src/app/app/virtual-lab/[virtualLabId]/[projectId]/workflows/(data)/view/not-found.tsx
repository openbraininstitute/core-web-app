'use client';

import { WorkspaceMainPages } from '@/constants';
import { WorkspaceNotFoundRedirect } from '@/ui/segments/workspaces/not-found-redirect';

export default function WorkflowViewNotFound() {
  return <WorkspaceNotFoundRedirect section={WorkspaceMainPages.Workflows} label="Workflows" />;
}
