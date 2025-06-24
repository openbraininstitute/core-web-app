import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

const atomToolsSelection = atomWithStorage<null | string[]>('AIAssistant/tools-selection', null);

/**
 * Atom state for the tools selection.
 */
export function useAIToolsSelection() {
  return useAtom(atomToolsSelection);
}
