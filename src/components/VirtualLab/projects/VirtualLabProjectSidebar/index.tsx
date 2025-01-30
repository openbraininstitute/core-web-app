import VirtualLabProjectSidebar from './VirtualLabProjectSidebar';
import { fetchNotebooksCatchError } from '@/util/virtual-lab/github';

type Props = {
  virtualLabId: string;
  projectId: string;
};

export default async function VirtualLabProjectSidebarServer({ virtualLabId, projectId }: Props) {
  const notebooks = await fetchNotebooksCatchError();
  return (
    <VirtualLabProjectSidebar
      virtualLabId={virtualLabId}
      projectId={projectId}
      n_notebooks={notebooks.length}
    />
  );
}
