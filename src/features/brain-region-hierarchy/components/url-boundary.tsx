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

type NextBrainRegionUrlStateInput = {
  mode: Exclude<TBrainRegionUrlBoundaryMode, 'none'>;
  syncSettled: boolean;
  hasPendingUrlOverride: boolean;
  urlHierarchyId: string;
  urlBrainRegionId: string;
  selectedBrainRegionId?: string | null;
  selectedHierarchyId?: string | null;
  workspaceHierarchyId?: string | null;
};

type BrainRegionUrlState = {
  hierarchyId: string;
  brainRegionId: string;
};

/** when in Sync mode with settled state and no pending override,
 * returns URL params that match workspace selection; otherwise `null`
 * */
export function getNextBrainRegionUrlState({
  mode,
  syncSettled,
  hasPendingUrlOverride,
  urlHierarchyId,
  urlBrainRegionId,
  selectedBrainRegionId,
  selectedHierarchyId,
  workspaceHierarchyId,
}: NextBrainRegionUrlStateInput): BrainRegionUrlState | null {
  const nextHierarchyId = selectedHierarchyId || workspaceHierarchyId;
  if (
    mode !== BrainRegionUrlBoundaryMode.Sync ||
    !syncSettled ||
    hasPendingUrlOverride ||
    !nextHierarchyId ||
    !selectedBrainRegionId
  ) {
    return null;
  }

  const isAlreadySynced =
    urlHierarchyId === nextHierarchyId && urlBrainRegionId === selectedBrainRegionId;

  if (isAlreadySynced) return null;

  return {
    hierarchyId: nextHierarchyId,
    brainRegionId: selectedBrainRegionId,
  };
}

/** side effects only: clears brain url params in Strip mode;
 * updates url from selection in Sync mode
 * */
function BrainRegionUrlBoundaryEffects({ mode }: { mode: Props['mode'] }) {
  const { urlState, setUrlState } = useHierarchyBrainRegionUrlState();
  const { selectedBrainRegion, workspaceHierarchyId, syncSettled, hasPendingUrlOverride } =
    useWorkspaceHierarchyRegistry();

  const hasBrainParams = !!urlState.hierarchyId || !!urlState.brainRegionId;

  useEffect(() => {
    if (mode !== BrainRegionUrlBoundaryMode.Strip || !hasBrainParams) return;
    void setUrlState(null);
  }, [mode, hasBrainParams, setUrlState]);

  useEffect(() => {
    const nextUrlState = getNextBrainRegionUrlState({
      mode,
      syncSettled,
      hasPendingUrlOverride,
      urlHierarchyId: urlState.hierarchyId,
      urlBrainRegionId: urlState.brainRegionId,
      selectedBrainRegionId: selectedBrainRegion?.id,
      selectedHierarchyId: selectedBrainRegion?.hierarchy_id,
      workspaceHierarchyId,
    });

    if (!nextUrlState) return;

    void setUrlState(nextUrlState);
  }, [
    mode,
    syncSettled,
    hasPendingUrlOverride,
    workspaceHierarchyId,
    selectedBrainRegion?.id,
    selectedBrainRegion?.hierarchy_id,
    urlState.hierarchyId,
    urlState.brainRegionId,
    setUrlState,
  ]);

  return null;
}

/** provides `BrainRegionUrlBoundaryContext` (mode + optional url override)
 * and runs URL sync/strip effects for descendants.
 * */
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
