/**
 * Hook that creates a read-only preview atom when showing diffs.
 *
 * Extracts the preview-atom logic that was duplicated in middle.tsx and
 * block-dictionary.tsx so those components stay focused on layout.
 */

import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { useAIConfig } from '@/services/ai-agent';
import { configHighlightsAtom } from '@/state/config-highlights';

import { isPlainObject } from '../components/utils';

import type { ConfigValue } from '../types';

/**
 * Returns a preview atom when diffs are active and aiConfig has data for the
 * given root element (and optionally a specific entry within it).
 * Returns `null` otherwise.
 */
export function useDiffPreviewAtom(
  selectedRootElement: string,
  selectedEntry?: string
): ReturnType<typeof atom<Record<string, ConfigValue>>> | null {
  const { aiConfig } = useAIConfig();
  const highlights = useAtomValue(configHighlightsAtom);
  const showingDiffs = highlights.length > 0;

  const previewData = useMemo(() => {
    if (!showingDiffs || !aiConfig) return null;
    const rootData = (aiConfig as Record<string, unknown>)[selectedRootElement];
    if (!isPlainObject(rootData)) return null;

    // For dictionary blocks, drill into the specific entry
    if (selectedEntry) {
      const entryData = (rootData as Record<string, unknown>)[selectedEntry];
      return isPlainObject(entryData) ? (entryData as Record<string, ConfigValue>) : null;
    }

    return rootData as Record<string, ConfigValue>;
  }, [showingDiffs, aiConfig, selectedRootElement, selectedEntry]);

  return useMemo(
    () => (previewData ? atom<Record<string, ConfigValue>>(previewData) : null),
    [previewData]
  );
}
