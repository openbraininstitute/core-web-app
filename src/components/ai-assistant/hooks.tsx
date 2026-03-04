import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import React from 'react';

import { AppUInterfaceSection, type TAppUInterfaceSection } from '@/utils/key-builder';

const atomCollapsedValue = atomWithStorage('AI-assistant/collapsed-panel', false);

export function useCollapsedPanel(): [value: boolean, setValue: (value: boolean) => void] {
  return useAtom(atomCollapsedValue);
}

interface AiContextType {
  section: TAppUInterfaceSection;
}

export function useAiContext(): AiContextType {
  const context = React.useContext(AiContext);
  return context;
}

export const MINIMAL_PANEL_SIZE = 400;

const AiContext = React.createContext<AiContextType>({
  section: AppUInterfaceSection.Data,
});

export function AiContextProvider({
  children,
  section,
}: {
  children: React.ReactNode;
  section: TAppUInterfaceSection;
}) {
  const value = React.useMemo(() => ({ section }), [section]);
  return <AiContext value={value}>{children}</AiContext>;
}

const atomPanelWidth = atomWithStorage('ai-assistant/panel-width', MINIMAL_PANEL_SIZE);
const atomIsDragging = atom<boolean>(false);

export function useIsDragging(): boolean {
  const [isDragging] = useAtom(atomIsDragging);
  return isDragging;
}

export function useSetIsDragging(): (value: boolean) => void {
  const [, setIsDragging] = useAtom(atomIsDragging);
  return setIsDragging;
}

/**
 * @param container Container that defines the min width.
 * @returns Panel width in pixels.
 */
export function usePanelWidth(): {
  panelWidth: number;
  setPanelWidth: (panelWidth: number) => void;
} {
  const [width, setWidth] = useAtom(atomPanelWidth);

  const clamp = React.useCallback((value: number): number => {
    if (value < MINIMAL_PANEL_SIZE) return MINIMAL_PANEL_SIZE;
    const maxWidth = (globalThis.window?.innerWidth ?? Infinity) * (2 / 3);
    if (value > maxWidth) return maxWidth;
    return value;
  }, []);

  return React.useMemo(
    () => ({ panelWidth: clamp(width), setPanelWidth: setWidth }),
    [width, setWidth, clamp]
  );
}
