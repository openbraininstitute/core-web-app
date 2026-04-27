/**
 * Simple hook that tells whether the diff overlay is currently active.
 * Consumed by components that only need a boolean guard (block-union, middle, etc.).
 */

import { useAtomValue } from 'jotai';

import { configHighlightsAtom } from '@/state/config-highlights';

export function useShowingDiffs(): boolean {
  const highlights = useAtomValue(configHighlightsAtom);
  return highlights.length > 0;
}
