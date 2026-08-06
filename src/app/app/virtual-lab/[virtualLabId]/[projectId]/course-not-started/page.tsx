import Link from 'next/link';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { config } from '@/config';
import { Button } from '@/ui/molecules/button';

type Props = {
  params: Promise<{ virtualLabId: string; projectId: string }>;
};

export default async function CourseNotStartedPage({ params: promisedParams }: Props) {
  const { virtualLabId, projectId } = await promisedParams;

  const [lab, project] = await Promise.all([
    getVirtualLab({ id: virtualLabId }).catch(() => null),
    getProject({ virtualLabId, projectId }).catch(() => null),
  ]);

  const startDate = lab?.course?.start_date ? new Date(lab.course.start_date) : null;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="mx-auto w-full max-w-md text-center">
        <h2 className="mb-2 text-2xl font-bold text-primary-9">Course not started yet</h2>
        {project?.name && <p className="mb-4 text-gray-600">{project.name}</p>}
        {startDate && (
          <p className="mb-6 text-sm text-gray-500">
            Course starts on <span className="font-semibold">{startDate.toLocaleDateString()}</span>
          </p>
        )}
        <Button asChild>
          <Link href={`${config.ROOT_ROUTE}/sync`}>Go home</Link>
        </Button>
      </div>
    </div>
  );
}
