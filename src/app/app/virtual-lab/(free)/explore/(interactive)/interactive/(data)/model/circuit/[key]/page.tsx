'use client';

import CIRCUITS_FULL from '@/components/explore-section/Circuit/content/circuits_tree_formatted';
import MainDetailViewCore from '@/components/explore-section/Circuit/DetailView/MainDetailViewCore';
import { useAllCircuitMapping } from '@/components/explore-section/Circuit/utils/allCircuitsMapping';

export default function CircuitDetailPage({
  params,
}: {
  params: {
    key: string;
  };
}) {
  const circuitsCompletelyFlatten = useAllCircuitMapping(CIRCUITS_FULL);

  const currentContent = circuitsCompletelyFlatten.get(params.key);

  if (!currentContent) {
    return <div>Loading...</div>;
  }

  console.log('circuitCompletelyFlatten', currentContent);

  return (
    <div className="relative flex w-full flex-col">
      <MainDetailViewCore content={currentContent} />
    </div>
  );
}
