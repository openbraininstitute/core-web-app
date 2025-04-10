import VirtualLabProjectHomePage from '@/components/VirtualLab/projects/VirtualLabProjectHomePage';
import { ServerSideComponentProp } from '@/types/common';

export default async function VirtualLabProjectPage(
  props: ServerSideComponentProp<{ virtualLabId: string; projectId: string }>
) {
  const params = await props.params;
  const { virtualLabId, projectId } = params;
  return <VirtualLabProjectHomePage virtualLabId={virtualLabId} projectId={projectId} />;
}
