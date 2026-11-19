import { CoursesList } from '@/admin/sections/virtual-lab/ui/courses-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function CoursesPage() {
  await requireCapability('education.admin');
  return <CoursesList />;
}
