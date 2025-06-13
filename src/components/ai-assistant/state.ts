import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { SELECTABLE_AI_TOOLS } from '@/services/ai-agent/tools/tools';

const atomToolsSelection = atomWithStorage('AIAssistant/tools-selection', [...SELECTABLE_AI_TOOLS]);

/**
 * Atom state for the tools selection.
 */
export function useAIToolsSelection() {
  return useAtom(atomToolsSelection);
}
