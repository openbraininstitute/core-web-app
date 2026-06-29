import { NotebookViewLayout } from '@/features/notebooks/components/notebook-view-layout';

import type { ReactNode } from 'react';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Layout({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext & { type: string; id: string }, null> & {
  children: ReactNode;
}) {
  const { virtualLabId, projectId, type, id } = await params;

  return (
    <NotebookViewLayout context={{ virtualLabId, projectId }} type={type} id={id}>
      {children}
    </NotebookViewLayout>
  );
}
