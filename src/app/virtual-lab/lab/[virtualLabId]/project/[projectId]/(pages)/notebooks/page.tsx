import NotebookTable from './NotebookTable';
import { notebookRepoUrl } from '@/config';
import { ServerSideComponentProp } from '@/types/common';
import fetchNotebooks from '@/util/virtual-lab/github';

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }>) {
  const { projectId, virtualLabId } = params;
  const notebooks = await fetchNotebooks(notebookRepoUrl);
  return <NotebookTable notebooks={notebooks} projectId={projectId} vlabId={virtualLabId} />;
}
