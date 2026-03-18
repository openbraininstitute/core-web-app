/**
 * Hook that resolves diff/flash visual state for dictionary entry tabs.
 *
 * Extracts the diff-specific logic that was previously inline in
 * block-dictionary-entries.tsx so the component stays focused on rendering.
 */

import { useAtomValue } from 'jotai';
import { activeFlashesAtom, type ConfigHighlight } from '@/state/config-highlights';
import { getDiffClassName } from '@/utils/diff-class';
import {
  resolveEntryHighlightType,
  highlightedEntries as collectHighlightedEntries,
} from '../diff-helpers';

import type { DiffType } from '@/utils/diff';

export interface EntryDiffHelpers {
  /** Get the CSS class for an entry's diff styling (flash takes priority). */
  getEntryDiffClass: (entry: string, isSelected: boolean) => string | undefined;
  /** Entries that appear only in highlights as 'remove' (deleted in diff). */
  deletedEntries: string[];
  /** Entries that appear only in highlights as 'add' (not yet in live config). */
  addedEntries: string[];
}

export function useEntryDiff(
  rootElement: string,
  highlights: ConfigHighlight[],
  configKeys: Set<string>,
): EntryDiffHelpers {
  const activeFlashes = useAtomValue(activeFlashesAtom);
  const activeFlash = activeFlashes.get(rootElement);
  const flashingEntries = activeFlash?.entries ?? new Map();

  const getEntryDiffClass = (entry: string, isSelected: boolean): string | undefined => {
    const flashState = flashingEntries.get(entry);
    if (flashState) return getDiffClassName(flashState.type, 'flash-slow');
    const hlType = resolveEntryHighlightType(highlights, rootElement, entry);
    return getDiffClassName(hlType, isSelected ? 'highlight-selected' : 'highlight');
  };

  const deletedEntries = collectHighlightedEntries(highlights, rootElement, 'remove');
  const addedEntries = collectHighlightedEntries(highlights, rootElement, 'add', configKeys);

  return { getEntryDiffClass, deletedEntries, addedEntries };
}
