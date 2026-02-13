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
const atomPanelContainer = atom<HTMLDivElement | null>(null);

/**
 * @param container Container that defines the min width.
 * @returns Panel width in pixels.
 */
export function usePanelWidth(): {
  panelWidth: number;
  setPanelWidth: (panelWidth: number) => void;
  setPanelContainer: (container: HTMLDivElement | null) => void;
} {
  const [container, setContainer] = useAtom(atomPanelContainer);
  const _dimension = useContainerDimension(container);
  const clamp = (value: number) => {
    const minWidth = MINIMAL_PANEL_SIZE; // Fixed minimum, not container width
    if (value < minWidth) return minWidth;

    const maxWidth = (globalThis.screen?.availWidth ?? 1920) - 200; // Screen width minus margin
    if (value > maxWidth) return maxWidth;

    return value;
  };
  const [width, setWidth] = useAtom(atomPanelWidth);
  return {
    panelWidth: clamp(width),
    setPanelWidth: (value: number) => setWidth(clamp(value)),
    setPanelContainer: (value: HTMLDivElement | null) => {
      if (value) setContainer(value);
    },
  };
}

export function useContainerDimension(container: HTMLDivElement | null) {
  const refTimeoutId = React.useRef(0);
  const [dimension, setDimension] = React.useState({ left: 0, top: 0, width: 0, height: 0 });
  React.useEffect(() => {
    if (!container) return;

    const callback = () => {
      globalThis.clearTimeout(refTimeoutId.current);
      refTimeoutId.current = globalThis.setTimeout(() => {
        setDimension(container.getBoundingClientRect());
      }) as unknown as number;
    };
    const observer = new ResizeObserver(callback);
    callback();
    observer.observe(container);
    return () => observer.unobserve(container);
  }, [container]);
  return dimension;
}
