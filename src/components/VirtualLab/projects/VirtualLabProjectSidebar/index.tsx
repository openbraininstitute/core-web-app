import VirtualLabProjectSidebar from './VirtualLabProjectSidebar';

type Props = {
  virtualLabId: string;
  projectId: string;
};

export default async function VirtualLabProjectSidebarServer({ virtualLabId, projectId }: Props) {
  return <VirtualLabProjectSidebar virtualLabId={virtualLabId} projectId={projectId} />;
}
