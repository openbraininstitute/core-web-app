// NOTE: please note this file is used in server components
// importing runtime constants from a client module into a server component is unsafe
// so this file should not have the directive "use client";

export const BrainRegionUrlBoundaryMode = {
  Sync: 'sync',
  Strip: 'strip',
  None: 'none',
} as const;

export type TBrainRegionUrlBoundaryMode =
  (typeof BrainRegionUrlBoundaryMode)[keyof typeof BrainRegionUrlBoundaryMode];
