import { describe, expect, it } from 'vitest';

import { getNextBrainRegionUrlState } from '@/features/brain-region-hierarchy/components/url-boundary';
import { BrainRegionUrlBoundaryMode } from '@/features/brain-region-hierarchy/constants';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { shouldClearAppliedUrlOverrideState } from '@/features/brain-region-hierarchy/url-boundary-state';

describe('getNextBrainRegionUrlState', () => {
  it('writes explicit all-mode URL params when bootstrap selects all and the URL has no species override', () => {
    expect(
      getNextBrainRegionUrlState({
        mode: BrainRegionUrlBoundaryMode.Sync,
        syncSettled: true,
        hasPendingUrlOverride: false,
        speciesSelectionMode: SpeciesSelectionMode.All,
        urlHierarchyId: '',
        urlBrainRegionId: '',
        urlSpeciesMode: null,
      })
    ).toEqual({
      hierarchyId: '',
      brainRegionId: '',
      speciesMode: SpeciesSelectionMode.All,
    });
  });

  it('leaves the URL unchanged when all mode is already synced explicitly', () => {
    expect(
      getNextBrainRegionUrlState({
        mode: BrainRegionUrlBoundaryMode.Sync,
        syncSettled: true,
        hasPendingUrlOverride: false,
        speciesSelectionMode: SpeciesSelectionMode.All,
        urlHierarchyId: '',
        urlBrainRegionId: '',
        urlSpeciesMode: SpeciesSelectionMode.All,
      })
    ).toBeNull();
  });
});

describe('shouldClearAppliedUrlOverrideState', () => {
  it('only clears applied URL override bookkeeping inside explicit URL boundaries with no active override', () => {
    expect(
      shouldClearAppliedUrlOverrideState({
        boundaryMode: BrainRegionUrlBoundaryMode.Sync,
        hasActiveUrlOverride: false,
      })
    ).toBe(true);

    expect(
      shouldClearAppliedUrlOverrideState({
        boundaryMode: BrainRegionUrlBoundaryMode.Sync,
        hasActiveUrlOverride: true,
      })
    ).toBe(false);

    expect(
      shouldClearAppliedUrlOverrideState({
        boundaryMode: BrainRegionUrlBoundaryMode.None,
        hasActiveUrlOverride: false,
      })
    ).toBe(false);

    expect(
      shouldClearAppliedUrlOverrideState({
        boundaryMode: BrainRegionUrlBoundaryMode.Strip,
        hasActiveUrlOverride: false,
      })
    ).toBe(true);
  });
});
