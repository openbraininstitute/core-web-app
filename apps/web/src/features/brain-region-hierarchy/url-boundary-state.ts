import type { TBrainRegionUrlBoundaryMode } from './constants';

export function shouldClearAppliedUrlOverrideState({
  boundaryMode,
  hasActiveUrlOverride,
}: {
  boundaryMode: TBrainRegionUrlBoundaryMode;
  hasActiveUrlOverride: boolean;
}) {
  return boundaryMode !== 'none' && !hasActiveUrlOverride;
}
