'use client';

import { WorkspaceMainPages } from '@/constants';
import { WorkspaceNotFoundRedirect } from '@/ui/segments/workspaces/not-found-redirect';

export default function DataViewNotFound() {
  return <WorkspaceNotFoundRedirect section={WorkspaceMainPages.Data} label="Data" />;
}
