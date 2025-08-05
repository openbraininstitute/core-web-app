'use client';

import JobReportList from './job-report-list';

export function Credits() {
  // const project = useUnwrappedValue(
  //   virtualLabProjectDetailsAtomFamily({ virtualLabId, projectId })
  // );
  // const balance = useLastTruthyValue(projectBalanceAtomFamily({ virtualLabId, projectId }));

  // if (!project || !balance) {
  //   return <div>Loading...</div>;
  // }

  return (
    <>
      {/* <ProjectBalanceCard project={project} balance={balance} /> */}
      <div className="px-6">
        <JobReportList />
      </div>
    </>
  );
}

export default Credits;
