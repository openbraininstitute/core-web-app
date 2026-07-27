'use client';

import { use } from 'react';

import { RunNotebookView } from '@/features/notebook-workbench/run-notebook-view';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

/**
 * Runs an analysis notebook inside the workspace, next to the AI assistant,
 * rather than handing the browser off to JupyterHub.
 */
export default function Page({
  params,
  searchParams,
}: ServerSideComponentProp<WorkspaceContext & { type: string; id: string }, { cloud?: string }>) {
  useDisableElementOverflow({ id: 'workspace-body' });
  const { id } = use(params);
  const { cloud } = use(searchParams);

  return <RunNotebookView id={id} cloud={cloud} />;
}
