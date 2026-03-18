/**
 * Hook that resolves all diff/flash visual state for a single root element tab.
 *
 * Extracts the diff-specific logic that was previously inline in root-element.tsx
 * so the component can stay focused on layout and interaction.
 */

import { useAtomValue } from 'jotai';
import {
  activeFlashesAtom,
  configHighlightsAtom,
  expandedRootElementsAtom,
} from '@/state/config-highlights';
import { getDiffClassName } from '@/utils/diff-class';
import { hasHighlightsForRoot, resolveRootHighlightType } from '../diff-helpers';

import type { ConfigHighlight } from '@/state/config-highlights';

export interface RootElementDiffState {
  /** All current highlights (passed down to children like BlockDictionaryEntries). */
  highlights: ConfigHighlight[];
  /** Whether this root element has any active highlights. */
  hasHighlights: boolean;
  /** Whether this root element is expanded (driven by diff or user toggle). */
  isExpanded: boolean;
  /** The resolved CSS class name for the root tab (flash or static highlight). */
  diffClass: string | undefined;
}

export function useRootElementDiff(rootElement: string): RootElementDiffState {
  const highlights = useAtomValue(configHighlightsAtom);
  const expandedRootElements = useAtomValue(expandedRootElementsAtom);
  const activeFlashes = useAtomValue(activeFlashesAtom);

  const hasHighlights = hasHighlightsForRoot(highlights, rootElement);
  const isExpanded = expandedRootElements.has(rootElement);

  // Flash state
  const activeFlash = activeFlashes.get(rootElement);
  const shouldFlash = !!activeFlash;
  const flashType = activeFlash?.rootFlashType ?? 'replace';

  // Resolve highlight type
  const resolvedHighlightType = resolveRootHighlightType(highlights, rootElement);

  // Flash takes priority over static highlight
  const diffClass = shouldFlash
    ? getDiffClassName(flashType, 'flash-slow')
    : getDiffClassName(resolvedHighlightType, 'highlight');

  return { highlights, hasHighlights, isExpanded, diffClass };
}
