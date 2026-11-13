import { ProjectsList } from '@/admin/sections/virtual-lab/ui/projects-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function ProjectsPage() {
  await requireCapability('virtualLab.read');
  return <ProjectsList />;
}
