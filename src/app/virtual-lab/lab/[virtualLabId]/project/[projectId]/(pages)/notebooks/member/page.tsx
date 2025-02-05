import NotebookTable from '../NotebookTable';
import { ServerSideComponentProp } from '@/types/common';
import fetchNotebooks from '@/util/virtual-lab/github';

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ projectId: string }>) {
  // eslint-disable-next-line
  const { projectId } = params;
  const notebooks = await fetchNotebooks();
  return <NotebookTable notebooks={notebooks} />;
}
