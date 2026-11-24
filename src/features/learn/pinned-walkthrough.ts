import { atomWithStorage, createJSONStorage } from 'jotai/utils';

/** The walkthrough kept to hand while the app is used: which, how far in, and whether it is open. */
export interface IPinnedWalkthrough {
  id: string;
  at: number;
  open: boolean;
  /** The window's width, px, once it has been dragged to another. */
  width?: number;
}

/** Each tab has its own, kept over its pages and reloads. */
export const pinnedWalkthroughAtom = atomWithStorage<IPinnedWalkthrough | null>(
  'learn:202611241:walkthrough:pinned',
  null,
  createJSONStorage(() => window.sessionStorage)
);
