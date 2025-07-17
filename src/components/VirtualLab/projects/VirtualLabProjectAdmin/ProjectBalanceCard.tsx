import { ProjectBalance } from '@/types/accounting';
import { Project } from '@/api/virtual-lab-svc/queries/types';

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
          <div className="bg-primary-3 h-4 w-4 rounded-full" />
          <span className="text-primary-2 text-lg uppercase">Project</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold">{project.name}</h2>
      </div>
      <div className="border-primary-4 flex items-stretch border">
        <div className="border-primary-3 flex flex-col justify-center border-r px-4 py-2 text-right">
          <p className="text-primary-2 text-sm">Reserved</p>
          <p className="text-lg font-semibold">{balance?.reservation ?? ''}</p>
        </div>
        <div className="border-primary-3 flex flex-col justify-center border-r px-4 py-2 text-right">
          <p className="text-primary-2 text-sm">Credit balance</p>
          <p className="text-lg font-semibold">{balance?.balance ?? ''}</p>
        </div>
      </div>
    </div>
  );
}
