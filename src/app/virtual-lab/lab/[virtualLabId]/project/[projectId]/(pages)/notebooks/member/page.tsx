import NotebookTable from '../NotebookTable';
import { ServerSideComponentProp } from '@/types/common';
import { fetchMultipleRepos } from '@/util/virtual-lab/github';

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ projectId: string }>) {
  // const { projectId } = params;
  const results = await fetchMultipleRepos([]);
  const notebooks = results.filter((r) => typeof r !== 'string').flat();
  const failed = results.filter((r) => typeof r === 'string');

  return <NotebookTable notebooks={notebooks} failed={failed} />;
}
