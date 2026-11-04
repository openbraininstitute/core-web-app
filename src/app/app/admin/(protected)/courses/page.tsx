import { requireCapability } from '@/admin/server/resolve';
import { CoursesList } from '@/admin/services/virtual-lab/ui/courses-list';

export default async function CoursesPage() {
  await requireCapability('virtualLab.admin');
  return <CoursesList />;
}
