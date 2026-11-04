import { requireCapability } from '@/admin/server/resolve';
import { CourseDetail } from '@/admin/services/virtual-lab/ui/course-detail';

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireCapability('virtualLab.admin');
  const { courseId } = await params;
  return <CourseDetail courseId={courseId} />;
}
