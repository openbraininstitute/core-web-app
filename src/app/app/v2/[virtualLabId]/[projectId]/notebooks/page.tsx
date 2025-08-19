import { notebookRepoUrl } from '@/config';
import { ServerSideComponentProp } from '@/types/common';
import NotebookMain from '@/ui/segments/notebooks';
import fetchNotebooks from '@/util/virtual-lab/fetchNotebooks';

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }, null>) {
  const params = await promisedParams;
  const { projectId, virtualLabId } = params;

  const { notebooks, error } = await fetchNotebooks(notebookRepoUrl, true);

  return (
    <NotebookMain
      notebooks={notebooks}
      projectId={projectId}
      vlabId={virtualLabId}
      serverError={error}
    />
  );
}
