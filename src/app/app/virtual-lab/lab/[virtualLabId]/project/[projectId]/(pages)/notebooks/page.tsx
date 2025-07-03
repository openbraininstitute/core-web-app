'use cache';

import { unstable_cacheLife as cacheLife } from 'next/cache';

import NotebookTable from './NotebookTable';
import { notebookRepoUrl } from '@/config';
import { ServerSideComponentProp } from '@/types/common';
import fetchNotebooks from '@/util/virtual-lab/fetchNotebooks';

export default async function Notebooks({
  params: promisedParams,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }, null>) {
  cacheLife({ expire: 3600 * 24, revalidate: 3600, stale: 3600 });
  const params = await promisedParams;
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
