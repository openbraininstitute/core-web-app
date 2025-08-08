import JobReportList from '../../../ui/segments/project/credits/job-report-list';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';
import { useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';
import { virtualLabBalanceAtomFamily } from '@/state/virtual-lab/lab';

export default function SpendingsPanel({ virtualLabId }: { virtualLabId: string }) {
  const projectsObj = useUnwrappedValue(
    virtualLabProjectsAtomFamily({ virtualLabId, page: 1, size: 20 })
  );
  const virtualLabBalance = useLastTruthyValue(virtualLabBalanceAtomFamily({ virtualLabId }));

  if (!projectsObj || !virtualLabBalance) {
    return <div>Loading...</div>;
  }

  // const getProjectBalance = (projectId: string) => {
  //   const balance = virtualLabBalance.data.projects?.find((p) => p.proj_id === projectId);
  //   if (!balance) throw new Error('Project balance not found');
  //   return balance;
  // };

  return (
    <>
      {projectsObj.data?.results.map((project) => (
        <div key={project.id}>
          {/* <ProjectBalanceCard project={project} balance={getProjectBalance(project.id)} /> */}
          <JobReportList />
        </div>
      ))}
    </>
  );
}
