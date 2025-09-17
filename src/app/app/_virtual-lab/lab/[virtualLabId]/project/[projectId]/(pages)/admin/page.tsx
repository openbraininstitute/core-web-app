import VirtualLabProjectAdmin from '@/components/VirtualLab/projects/VirtualLabProjectAdmin';
import { ServerSideComponentProp } from '@/types/common';

export default async function ProjectAdminPage({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, any>) {
  const params = await promisedParams;
  const { virtualLabId, projectId } = params;

  return <VirtualLabProjectAdmin virtualLabId={virtualLabId} projectId={projectId} />;
}
