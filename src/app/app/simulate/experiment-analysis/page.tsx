import ExperimentAnalyses from '@/app/app/virtual-lab/(free)/explore/(content)/simulation-campaigns/[id]/experiment-analysis/page';

export default async function ExperimentAnalysis({
  searchParams,
}: {
  searchParams?: Promise<{ targetEntity?: string }>;
}) {
  // const searchParams = await promisedSearchParams;
  return <ExperimentAnalyses searchParams={searchParams} />;
}
