import React from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

const atomSuggestedValue = atomWithStorage('AI-assistant/collapsed-panel', false);

export function useCollapsedPanel(): [value: boolean, setValue: (value: boolean) => void] {
  return useAtom(atomSuggestedValue);
}

export interface AiContext {
  section: 'explore' | 'build' | 'simulate' | 'bookmark' | 'activity';
}

export function useAiContext(): AiContext {
  return React.useContext(AiContextProvider);
}

export const AiContextProvider = React.createContext<AiContext>({
  section: 'explore',
});
