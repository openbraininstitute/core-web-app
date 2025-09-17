import VirtualLabProjectHomePage from '@/components/VirtualLab/projects/VirtualLabProjectHomePage';
import { ServerSideComponentProp } from '@/types/common';

export default async function VirtualLabProjectPage({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null>) {
  const params = await promisedParams;
  const { virtualLabId, projectId } = params;
  return <VirtualLabProjectHomePage virtualLabId={virtualLabId} projectId={projectId} />;
}
