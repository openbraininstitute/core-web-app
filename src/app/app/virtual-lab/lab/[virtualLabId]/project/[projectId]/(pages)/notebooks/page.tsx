import NotebookTable from './NotebookTable';
import { notebookRepoUrl } from '@/config';
import { ServerSideComponentProp } from '@/types/common';
import fetchNotebooks from '@/util/virtual-lab/fetchNotebooks';

export default async function Notebooks(
  props: ServerSideComponentProp<{ projectId: string; virtualLabId: string }, null>
) {
  const params = await props.params;
  const { projectId, virtualLabId } = params;

  const { notebooks, error } = await fetchNotebooks(notebookRepoUrl, true);

  return (
    <NotebookTable
      notebooks={notebooks}
      projectId={projectId}
      vlabId={virtualLabId}
      serverError={error}
      enableRunNotebook
    />
  );
}
