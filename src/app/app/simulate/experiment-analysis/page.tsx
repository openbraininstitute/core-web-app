import ExperimentAnalyses from '@/app/app/virtual-lab/(free)/explore/(content)/simulation-campaigns/[id]/experiment-analysis/page';

export default function ExperimentAnalysis({
  searchParams,
}: {
  searchParams?: { targetEntity?: string };
}) {
  return <ExperimentAnalyses searchParams={searchParams} />;
}
