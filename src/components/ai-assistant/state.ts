import { atom, useAtom, useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import { useAITools } from '@/services/ai-agent/tools/tools';
import type { AiAgentRateLimitEndpoint } from '@/services/ai-agent/hooks/chat';
import React from 'react';

const atomToolsInvertedSelection = atomWithStorage<string[]>(
  'AIAssistant/tools-inverted-selection',
  []
);

export const atomRateLimit = atom<AiAgentRateLimitEndpoint | null>(null);

/**
 * Atom state for the tools selection.
 */
export function useAIToolsInvertedSelection() {
  return useAtom(atomToolsInvertedSelection);
}

/**
 * @returns List of currently active tools.
 */
export function useAIActiveTools(): string[] {
  const allTools = useAITools();
  const invertedSelection = useAtomValue(atomToolsInvertedSelection);
  return React.useMemo(() => {
    if (!allTools) return [];

    const allToolsIds = allTools.map((tool) => tool.id);
    const activeTools = allToolsIds.filter((id) => !invertedSelection.includes(id));
    return activeTools;
  }, [allTools, invertedSelection]);
}
