import { requireCapability } from '@/admin/server/resolve';
import { ProjectDetail } from '@/admin/services/virtual-lab/ui/project-detail';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  await requireCapability('virtualLab.read');
  const { projectId } = await params;
  return <ProjectDetail projectId={projectId} />;
}
