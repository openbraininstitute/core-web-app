import { useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';
import {
  projectBalanceAtomFamily,
  virtualLabProjectDetailsAtomFamily,
} from '@/state/virtual-lab/projects';
import JobReportList from './ProjectJobReportList';
import { ProjectBalanceCard } from './ProjectBalanceCard';

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
