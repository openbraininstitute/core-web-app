import { ProjectBalance } from '@/types/accounting';
import { Project } from '@/types/virtual-lab/projects';
import {
  projectBalanceAtomFamily,
  virtualLabProjectDetailsAtomFamily,
} from '@/state/virtual-lab/projects';
import { useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';

export function ProjectBalanceCard({
  project,
  balance,
}: {
  project: Project;
  balance: ProjectBalance;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-lg py-6 text-white">
      <div>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-full bg-primary-3" />
          <span className="text-lg uppercase text-primary-2">Project</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold">{project.name}</h2>
      </div>
      <div className="flex items-stretch border border-primary-4">
        <div className="flex flex-col justify-center border-r border-primary-3 px-4 py-2 text-right">
          <p className="text-sm text-primary-2">Reserved</p>
          <p className="text-lg font-semibold">{balance?.reservation ?? ''}</p>
        </div>
        <div className="flex flex-col justify-center border-r border-primary-3 px-4 py-2 text-right">
          <p className="text-sm text-primary-2">Credit balance</p>
          <p className="text-lg font-semibold">{balance?.balance ?? ''}</p>
        </div>
      </div>
    </div>
  );
}

export function ProjectBalanceCardWithFetching({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const balance = useLastTruthyValue(projectBalanceAtomFamily({ virtualLabId, projectId }));
  const project = useUnwrappedValue(
    virtualLabProjectDetailsAtomFamily({ virtualLabId, projectId })
  );

  if (!project || !balance) {
    return <div>Loading...</div>;
  }

  return <ProjectBalanceCard project={project} balance={balance} />;
}
