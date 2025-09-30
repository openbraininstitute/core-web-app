import { notebookRepoUrl } from '@/config';
import { ServerSideComponentProp } from '@/types/common';
import { NotebookTable } from '@/ui/segments/notebooks/table';
import fetchNotebooks from '@/util/virtual-lab/fetchNotebooks';

export default async function NotebooksPage({
  params: promisedParams,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }, null>) {
  const params = await promisedParams;
  const { projectId, virtualLabId } = params;

  const { notebooks, error } = await fetchNotebooks(notebookRepoUrl, true);

  return (
    <div className="w-full">
      <NotebookTable
        notebooks={notebooks}
        projectId={projectId}
        vlabId={virtualLabId}
        serverError={error}
      />
    </div>
  );
}
