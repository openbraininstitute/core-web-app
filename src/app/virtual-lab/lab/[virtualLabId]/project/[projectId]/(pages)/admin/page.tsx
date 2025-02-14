import VirtualLabProjectAdmin from '@/components/VirtualLab/projects/VirtualLabProjectAdmin';
import { ServerSideComponentProp } from '@/types/common';

export default function ProjectAdminPage({
  params,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }>) {
  const { virtualLabId, projectId } = params;

  return (
    <div>
      <h1>Project admin page</h1>
      <VirtualLabProjectAdmin virtualLabId={virtualLabId} projectId={projectId} />
    </div>
  );
  // return <ProjectAdminPageComponent virtualLabId={virtualLabId} projectId={projectId} />;
}
