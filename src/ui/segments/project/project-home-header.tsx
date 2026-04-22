'use client';

import { useQuery } from '@tanstack/react-query';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

export function ProjectHomeHeader() {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });
  const projectName = project?.data?.project?.name;

  return (
    <h1 className="text-primary-9 text-xl font-bold">
      Project Home{projectName ? ': ' : ''}
      {projectName && <span className="font-normal">{projectName}</span>}
    </h1>
  );
}

export default ProjectHomeHeader;
