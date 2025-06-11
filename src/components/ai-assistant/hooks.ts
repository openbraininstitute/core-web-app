import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

const atomSuggestedValue = atomWithStorage('AI-assistant/collapsed-panel', false);

export function useCollapsedPanel(): [value: boolean, setValue: (value: boolean) => void] {
  return useAtom(atomSuggestedValue);
}
