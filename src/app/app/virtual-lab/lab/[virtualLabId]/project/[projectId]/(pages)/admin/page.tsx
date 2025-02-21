import VirtualLabProjectAdmin from '@/components/VirtualLab/projects/VirtualLabProjectAdmin';
import { ServerSideComponentProp } from '@/types/common';

export default function ProjectAdminPage({
  params,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }>) {
  const { virtualLabId, projectId } = params;

  return <VirtualLabProjectAdmin virtualLabId={virtualLabId} projectId={projectId} />;
}
