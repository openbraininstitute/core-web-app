import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

const atomToolsInvertedSelection = atomWithStorage<string[]>(
  'AIAssistant/tools-inverted-selection',
  []
);

/**
 * Atom state for the tools selection.
 */
export function useAIToolsInvertedSelection() {
  return useAtom(atomToolsInvertedSelection);
}
