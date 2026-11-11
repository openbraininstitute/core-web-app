'use client';

import { useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';

import {
  BrainRegionUrlBoundaryMode,
  type TBrainRegionUrlBoundaryMode,
} from '@/features/brain-region-hierarchy/constants';
import {
  BrainRegionUrlBoundaryContext,
  speciesSelectionModeAtom,
  useHierarchyBrainRegionUrlState,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import {
  SpeciesSelectionMode,
  type TSpeciesSelectionMode,
} from '@/features/brain-region-hierarchy/types';

import type { ReactNode } from 'react';
import type { BrainRegionUrlOverride } from '@/features/brain-region-hierarchy/context';

type Props = {
  mode: Exclude<TBrainRegionUrlBoundaryMode, 'none'>;
  children: ReactNode;
};

type NextBrainRegionUrlStateInput = {
  mode: Exclude<TBrainRegionUrlBoundaryMode, 'none'>;
  syncSettled: boolean;
  hasPendingUrlOverride: boolean;
  speciesSelectionMode: TSpeciesSelectionMode;
  urlHierarchyId: string;
  urlBrainRegionId: string;
  urlSpeciesMode: TSpeciesSelectionMode | null;
  selectedBrainRegionId?: string | null;
  selectedHierarchyId?: string | null;
  workspaceHierarchyId?: string | null;
};

type BrainRegionUrlState = {
  hierarchyId: string;
  brainRegionId: string;
  speciesMode: TSpeciesSelectionMode;
};

/** compute the next url state in Sync mode.
 *
 * - when species mode is 'all', writes `?s=all` and clears hierarchy / brain-region params.
 * - when species mode is 'focused', writes hierarchy + brain-region ids and clears `?s`
 *   (clearOnDefault collapses `?s=focused` to an absent param).
 * - returns `null` when nothing changes or when the sync isn't ready yet.
 */
export function getNextBrainRegionUrlState({
  mode,
  syncSettled,
  hasPendingUrlOverride,
  speciesSelectionMode,
  urlHierarchyId,
  urlBrainRegionId,
  urlSpeciesMode,
  selectedBrainRegionId,
  selectedHierarchyId,
  workspaceHierarchyId,
}: NextBrainRegionUrlStateInput): BrainRegionUrlState | null {
  if (mode !== BrainRegionUrlBoundaryMode.Sync || !syncSettled || hasPendingUrlOverride) {
    return null;
  }

  if (speciesSelectionMode === SpeciesSelectionMode.All) {
    const isAlreadySynced =
      urlSpeciesMode === SpeciesSelectionMode.All &&
      urlHierarchyId === '' &&
      urlBrainRegionId === '';
    if (isAlreadySynced) return null;
    return {
      hierarchyId: '',
      brainRegionId: '',
      speciesMode: SpeciesSelectionMode.All,
    };
  }

  const nextHierarchyId = selectedHierarchyId || workspaceHierarchyId;
  if (!nextHierarchyId || !selectedBrainRegionId) return null;

  const isAlreadySynced =
    urlSpeciesMode === SpeciesSelectionMode.Focused &&
    urlHierarchyId === nextHierarchyId &&
    urlBrainRegionId === selectedBrainRegionId;

  if (isAlreadySynced) return null;

  return {
    hierarchyId: nextHierarchyId,
    brainRegionId: selectedBrainRegionId,
    speciesMode: SpeciesSelectionMode.Focused,
  };
}

/** side effects only: clears brain url params in Strip mode;
 * updates url from selection in Sync mode
 * */
function BrainRegionUrlBoundaryEffects({ mode }: { mode: Props['mode'] }) {
  const { urlState, setUrlState } = useHierarchyBrainRegionUrlState();
  const { selectedBrainRegion, workspaceHierarchyId, syncSettled, hasPendingUrlOverride } =
    useWorkspaceHierarchyRegistry();
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);

  const hasBrainParams =
    !!urlState.hierarchyId ||
    !!urlState.brainRegionId ||
    urlState.speciesMode === SpeciesSelectionMode.Focused ||
    urlState.speciesMode === SpeciesSelectionMode.All;

  useEffect(() => {
    if (mode !== BrainRegionUrlBoundaryMode.Strip || !hasBrainParams) return;
    void setUrlState(null);
  }, [mode, hasBrainParams, setUrlState]);

  useEffect(() => {
    const nextUrlState = getNextBrainRegionUrlState({
      mode,
      syncSettled,
      hasPendingUrlOverride,
      speciesSelectionMode,
      urlHierarchyId: urlState.hierarchyId,
      urlBrainRegionId: urlState.brainRegionId,
      urlSpeciesMode: urlState.speciesMode,
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
    speciesSelectionMode,
    workspaceHierarchyId,
    selectedBrainRegion?.id,
    selectedBrainRegion?.hierarchy_id,
    urlState.hierarchyId,
    urlState.brainRegionId,
    urlState.speciesMode,
    setUrlState,
  ]);

  return null;
}

/** provides `BrainRegionUrlBoundaryContext` (mode + optional url override)
 * and runs URL sync/strip effects for descendants.
 * */
export function BrainRegionUrlBoundary({ mode, children }: Props) {
  const { urlState } = useHierarchyBrainRegionUrlState();

  const value = useMemo(() => {
    let urlOverride: BrainRegionUrlOverride | null = null;

    if (mode === BrainRegionUrlBoundaryMode.Sync) {
      if (
        urlState.speciesMode === SpeciesSelectionMode.All &&
        !urlState.hierarchyId &&
        !urlState.brainRegionId
      ) {
        urlOverride = { kind: 'all' };
      } else if (urlState.hierarchyId) {
        urlOverride = {
          kind: 'focused',
          hierarchyId: urlState.hierarchyId,
          brainRegionId: urlState.brainRegionId,
        };
      }
    }

    return { mode, urlOverride };
  }, [mode, urlState.hierarchyId, urlState.brainRegionId, urlState.speciesMode]);

  return (
    <BrainRegionUrlBoundaryContext.Provider value={value}>
      <BrainRegionUrlBoundaryEffects mode={mode} />
      {children}
    </BrainRegionUrlBoundaryContext.Provider>
  );
}
