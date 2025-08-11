'use client';

import JobReportList from './job-report-list';
import { BalanceCard } from './balance-card';

export function Credits() {
  // const project = useUnwrappedValue(
  //   virtualLabProjectDetailsAtomFamily({ virtualLabId, projectId })
  // );
  // const balance = useLastTruthyValue(projectBalanceAtomFamily({ virtualLabId, projectId }));

  // if (!project || !balance) {
  //   return <div>Loading...</div>;
  // }

  return (
    <div id="project-credits" data-testid="project-credits" className="flex flex-col gap-6 px-0">
      <BalanceCard />
      <JobReportList />
    </div>
  );
}

export default Credits;
