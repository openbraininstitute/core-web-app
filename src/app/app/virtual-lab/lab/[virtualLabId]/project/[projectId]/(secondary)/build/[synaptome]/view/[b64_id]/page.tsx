'use client';

import { useEffect, use } from 'react';
import dynamic from 'next/dynamic';
import { useSetAtom } from 'jotai';

import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { SimulationType } from '@/types/virtual-lab/lab';
import { selectedSimulationScopeAtom } from '@/state/simulate';
import { backToListPathAtom } from '@/state/explore-section/detail-view-atoms';

import Nav from '@/components/build-section/virtual-lab/me-model/Nav';

type Props = {
  params: Promise<{
    projectId: string;
    virtualLabId: string;
  }>;
};

const SynaptomeDetailView = dynamic(
  () => import('@/components/explore-section/Synaptome/DetailView')
);

export default function Synaptome(props: Props) {
  const params = use(props.params);

  const { virtualLabId, projectId } = params;

  const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
  const setBackToListPath = useSetAtom(backToListPathAtom);
  const setScope = useSetAtom(selectedSimulationScopeAtom);

  useEffect(() => {
    setBackToListPath(`${vlProjectUrl}/build`);
    setScope(SimulationType.Synaptome);
  }, [setBackToListPath, setScope, vlProjectUrl]);

  return (
    <div className="grid grid-cols-[min-content_auto] overflow-hidden bg-white">
      <Nav params={{ virtualLabId, projectId }} />
      <SynaptomeDetailView params={{ virtualLabId, projectId }} />
    </div>
  );
}
