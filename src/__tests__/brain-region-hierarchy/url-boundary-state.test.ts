import { describe, expect, it } from 'vitest';

import { BrainRegionUrlBoundaryMode } from '@/features/brain-region-hierarchy/constants';
import { shouldClearAppliedUrlOverrideState } from '@/features/brain-region-hierarchy/url-boundary-state';

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
