import { ProjectDetail } from '@/admin/sections/virtual-lab/ui/project-detail';
import { requireCapability } from '@/admin/server/require-capability';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  await requireCapability('virtualLab.read');
  const { projectId } = await params;
  return <ProjectDetail projectId={projectId} />;
}
