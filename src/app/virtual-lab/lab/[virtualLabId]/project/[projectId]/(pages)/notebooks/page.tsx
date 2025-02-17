import NotebookTable from './NotebookTable';
import { notebookRepoUrl } from '@/config';
import { ServerSideComponentProp } from '@/types/common';
import { assertErrorMessage } from '@/util/utils';
import fetchNotebooks from '@/util/virtual-lab/fetchNotebooks';
import { Notebook } from '@/util/virtual-lab/github';

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }>) {
  const { projectId, virtualLabId } = params;
  let error = '';
  let notebooks: Notebook[] = [];
  try {
    notebooks = await fetchNotebooks(notebookRepoUrl, true);
  } catch (e) {
    error = assertErrorMessage(e);
  }

  return (
    <NotebookTable
      notebooks={notebooks}
      projectId={projectId}
      vlabId={virtualLabId}
      serverError={error}
    />
  );
}
