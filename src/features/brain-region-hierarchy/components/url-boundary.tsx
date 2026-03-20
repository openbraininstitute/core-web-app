'use client';

import { useEffect, useMemo } from 'react';

import {
  BrainRegionUrlBoundaryMode,
  type TBrainRegionUrlBoundaryMode,
} from '@/features/brain-region-hierarchy/constants';
import {
  BrainRegionUrlBoundaryContext,
  useHierarchyBrainRegionUrlState,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';

import type { ReactNode } from 'react';

type Props = {
  mode: Exclude<TBrainRegionUrlBoundaryMode, 'none'>;
  children: ReactNode;
};

function BrainRegionUrlBoundaryEffects({ mode }: { mode: Props['mode'] }) {
  const { urlState, setUrlState } = useHierarchyBrainRegionUrlState();
  const { selectedBrainRegion, workspaceHierarchyId } = useWorkspaceHierarchyRegistry();

  const hasBrainParams = !!urlState.hierarchyId || !!urlState.brainRegionId;

  useEffect(() => {
    if (mode !== BrainRegionUrlBoundaryMode.Strip || !hasBrainParams) return;
    void setUrlState(null);
  }, [mode, hasBrainParams, setUrlState]);

  useEffect(() => {
    const nextHierarchyId = selectedBrainRegion?.hierarchy_id || workspaceHierarchyId;
    if (mode !== BrainRegionUrlBoundaryMode.Sync || !nextHierarchyId || !selectedBrainRegion?.id)
      return;

    const isAlreadySynced =
      urlState.hierarchyId === nextHierarchyId && urlState.brainRegionId === selectedBrainRegion.id;

    if (isAlreadySynced) return;

    void setUrlState({
      hierarchyId: nextHierarchyId,
      brainRegionId: selectedBrainRegion.id,
    });
  }, [
    mode,
    workspaceHierarchyId,
    selectedBrainRegion?.id,
    selectedBrainRegion?.hierarchy_id,
    urlState.hierarchyId,
    urlState.brainRegionId,
    setUrlState,
  ]);

  return null;
}

export function BrainRegionUrlBoundary({ mode, children }: Props) {
  const { urlState } = useHierarchyBrainRegionUrlState();

  const value = useMemo(
    () => ({
      mode,
      urlOverride:
        mode === BrainRegionUrlBoundaryMode.Sync && urlState.hierarchyId
          ? {
              hierarchyId: urlState.hierarchyId,
              brainRegionId: urlState.brainRegionId,
            }
          : null,
    }),
    [mode, urlState.hierarchyId, urlState.brainRegionId]
  );

  return (
    <BrainRegionUrlBoundaryContext.Provider value={value}>
      <BrainRegionUrlBoundaryEffects mode={mode} />
      {children}
    </BrainRegionUrlBoundaryContext.Provider>
  );
}
