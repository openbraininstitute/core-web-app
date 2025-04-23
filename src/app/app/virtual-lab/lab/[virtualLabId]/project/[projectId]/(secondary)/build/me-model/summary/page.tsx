'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { useQueryState } from 'nuqs';
import { useEffect, use } from 'react';

import { selectedEModelAtom, selectedMModelAtom } from '@/state/virtual-lab/build/me-model';
import MorphologyOverviewCard from '@/features/entities/me-model/card-viewers/morphology-overview-card';
import EModelOverviewCard from '@/features/entities/me-model/card-viewers/emodel-overview-card';
import SaveButton from '@/components/build-section/virtual-lab/me-model/SaveButton';
import { initializeSummaryAtom } from '@/state/virtual-lab/build/me-model-setter';
import { useSessionAtomValue } from '@/hooks/hooks';
import AnalysisPreview from '@/components/build-section/virtual-lab/me-model/AnalysisPreview';

export default function MEModelSummaryPage(props: {
  params: Promise<{
    projectId: string;
    virtualLabId: string;
  }>;
}) {
  const params = use(props.params);
  const selectedEModel = useAtomValue(selectedEModelAtom);
  const selectedMModel = useAtomValue(selectedMModelAtom);
  const initializeSummary = useSetAtom(initializeSummaryAtom);
  const [meModelId] = useQueryState('meModelId');
  const session = useSessionAtomValue();

  useEffect(() => {
    if (!meModelId || !session) return;
    // info already set
    if (selectedEModel && selectedMModel) return;

    initializeSummary(meModelId, params.virtualLabId, params.projectId);
  }, [
    meModelId,
    session,
    initializeSummary,
    selectedEModel,
    selectedMModel,
    params.virtualLabId,
    params.projectId,
  ]);

  if (!meModelId)
    return (
      <div className="text-primary-8 flex h-full items-center justify-center text-2xl">
        No ME-Model found in URL
      </div>
    );

  return (
    <div className="flex h-full flex-col gap-10 p-10">
      <div className="text-primary-8 text-2xl font-bold">Single Neuron</div>
      <MorphologyOverviewCard />
      <EModelOverviewCard />

      <AnalysisPreview />

      <div>
        <SaveButton />
      </div>
    </div>
  );
}
