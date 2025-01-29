import VirtualLabProjectSidebar from './VirtualLabProjectSidebar';
import fetchNotebooks from '@/util/virtual-lab/github';

type Props = {
  virtualLabId: string;
  projectId: string;
};

export default async function VirtualLabProjectSidebarServer({ virtualLabId, projectId }: Props) {
  const notebooks = await fetchNotebooks();
  return (
    <VirtualLabProjectSidebar
      virtualLabId={virtualLabId}
      projectId={projectId}
      n_notebooks={notebooks.length}
    />
  );
}
