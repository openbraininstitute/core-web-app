import { atom, useAtom, useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import React from 'react';

import { useAITools } from '@/services/ai-agent/tools/tools';

import type { AiAgentRateLimitEndpoint } from '@/services/ai-agent/hooks/rate-limit';

const atomToolsInvertedSelection = atomWithStorage<string[]>(
  'AIAssistant/tools-inverted-selection',
  []
);

export const atomRateLimit = atom<AiAgentRateLimitEndpoint | null>(null);

export const pendingAiPromptAtom = atom<string | null>(null);

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
