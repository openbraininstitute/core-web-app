import { ProjectBalanceCard } from './ProjectBalanceCard';
import JobReportList from './ProjectJobReportList';
import {
  projectBalanceAtomFamily,
  virtualLabProjectDetailsAtomFamily,
} from '@/state/virtual-lab/projects';
import { useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';

export default function CostsPanel({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const project = useUnwrappedValue(
    virtualLabProjectDetailsAtomFamily({ virtualLabId, projectId })
  );
  const balance = useLastTruthyValue(projectBalanceAtomFamily({ virtualLabId, projectId }));

  if (!project || !balance) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <ProjectBalanceCard virtualLabId={virtualLabId} project={project} balance={balance} />
      <JobReportList virtualLabId={virtualLabId} projectId={project.id} />
    </>
  );
}
