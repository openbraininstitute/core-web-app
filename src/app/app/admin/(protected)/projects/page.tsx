import { requireCapability } from '@/admin/server/resolve';
import { ProjectsList } from '@/admin/services/virtual-lab/ui/projects-list';

export default async function ProjectsPage() {
  await requireCapability('virtualLab.read');
  return <ProjectsList />;
}
