import NotebookTable from './NotebookTable';
import { notebookRepoUrl } from '@/config';
import { ServerSideComponentProp } from '@/types/common';
import fetchNotebooks from '@/util/virtual-lab/fetchNotebooks';
import { env } from '@/env.mjs';

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }>) {
  const { projectId, virtualLabId } = params;

  const { notebooks, error } = await fetchNotebooks(notebookRepoUrl, true);

  return (
    <NotebookTable
      notebooks={notebooks}
      projectId={projectId}
      vlabId={virtualLabId}
      serverError={error}
      enableRunNotebook={env.NEXT_PUBLIC_ENABLE_RUN_NOTEBOOK}
    />
  );
}
