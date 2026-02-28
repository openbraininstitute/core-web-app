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
  setPanelContainer: (container: HTMLDivElement | null) => void;
} {
  const [container, setContainer] = useAtom(atomPanelContainer);
  const dimension = useContainerDimension(container);
  const clamp = (value: number) => {
    if (value < MINIMAL_PANEL_SIZE) return MINIMAL_PANEL_SIZE;

    const maxWidth = dimension.left + dimension.width - (globalThis.screen?.availWidth ?? 0) / 3;
    if (maxWidth > 0 && value > maxWidth) return maxWidth;

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
        const rect = container.getBoundingClientRect();
        setDimension({
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }) as unknown as number;
    };
    const observer = new ResizeObserver(callback);
    callback();
    observer.observe(container);
    return () => observer.unobserve(container);
  }, [container]);
  return dimension;
}
