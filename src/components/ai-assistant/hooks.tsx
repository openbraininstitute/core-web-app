import React from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

const atomSuggestedValue = atomWithStorage('AI-assistant/collapsed-panel', false);

export function useCollapsedPanel(): [value: boolean, setValue: (value: boolean) => void] {
  return useAtom(atomSuggestedValue);
}

interface AiContextType {
  section: 'explore' | 'build' | 'simulate' | 'bookmark' | 'activity';
}

export function useAiContext(): AiContextType {
  const context = React.useContext(AiContext);
  return context;
}

export const MINIMAL_PANEL_SIZE = 25;

const AiContext = React.createContext<AiContextType>({
  section: 'explore',
});

export function AiContextProvider({
  children,
  section,
}: {
  children: React.ReactNode;
  section: 'explore' | 'build' | 'simulate' | 'bookmark' | 'activity';
}) {
  const value = React.useMemo(() => ({ section }), [section]);
  return <AiContext value={value}>{children}</AiContext>;
}

const atomPanelWidth = atomWithStorage('ai-assistant/panel-width', MINIMAL_PANEL_SIZE);

export function usePanelWidth(): [panelWidth: number, setPanelWidth: (panelWidth: number) => void] {
  return useAtom(atomPanelWidth);
}
