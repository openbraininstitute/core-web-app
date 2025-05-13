import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { NoCompositionAvailable } from '@/components/common/METypeHierarchy/NoCompositionAvailable';
import { METypeDetails } from '@/features/cell-composition/elements/m-e-type-tree';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { cellCompositionAtom } from '@/features/cell-composition/context';
import { resolveDataKey } from '@/utils/key-builder';

import type { WorkspaceContext } from '@/types/common';

export default function CellCompositionExplorer() {
  const { projectId } = useParams<WorkspaceContext>();
  const { node } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: 'explore', projectId }),
  });

  const cellComposition = useAtomValue(
    useMemo(() => cellCompositionAtom({ brainRegionId: node.id }), [node.id])
  );

  // const meTypesMetadata = useAtomValue(useMemo(() => unwrap(cellTypesByIdAtom), []));

  if (!node) {
    return null;
  }

  if (!cellComposition.totalComposition.neuron) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-6">
        <NoCompositionAvailable />
      </div>
    );
  }

  if (cellComposition) {
    return (
      <div className="flex h-full w-full min-w-[300px] flex-col gap-5 py-8 pb-0 text-white">
        <METypeDetails
          composition={cellComposition}
          // meTypesMetadata={meTypesMetadata}
        />
      </div>
    );
  }
}
