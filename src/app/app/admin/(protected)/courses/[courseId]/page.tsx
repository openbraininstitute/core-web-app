import { CourseDetail } from '@/admin/sections/virtual-lab/ui/course-detail';
import { requireCapability } from '@/admin/server/require-capability';

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireCapability('education.admin');
  const { courseId } = await params;
  return <CourseDetail courseId={courseId} />;
}
