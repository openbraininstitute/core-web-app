import VirtualLabProjectAdmin from '@/components/VirtualLab/projects/VirtualLabProjectAdmin';
import { ServerSideComponentProp } from '@/types/common';

export default async function ProjectAdminPage(
  props: ServerSideComponentProp<{ virtualLabId: string; projectId: string }>
) {
  const params = await props.params;
  const { virtualLabId, projectId } = params;

  return <VirtualLabProjectAdmin virtualLabId={virtualLabId} projectId={projectId} />;
}
