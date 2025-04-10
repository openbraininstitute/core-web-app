import ExperimentAnalyses from '@/app/app/virtual-lab/(free)/explore/(content)/simulation-campaigns/[id]/experiment-analysis/page';

export default async function ExperimentAnalysis(
  props: {
    searchParams?: Promise<{ targetEntity?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return <ExperimentAnalyses searchParams={searchParams} />;
}
