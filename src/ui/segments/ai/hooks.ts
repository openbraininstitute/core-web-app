import { atom, useAtom } from 'jotai';

import { PanelState } from '@/ui/segments/ai/types';

/**
 * Whether the assistant is open, for the page's session: shut on every load (the user asked for it deselected by
 * default), so a panel left open is not opened again on the next page.
 */
const panelStateAtom = atom<PanelState>(PanelState.Collapsed);

export function usePanelState() {
  const [state, setState] = useAtom(panelStateAtom);

  return {
    state,
    setState,
    isCollapsed: state === PanelState.Collapsed,
    isExpanded: state === PanelState.Expanded,
    isFullscreen: state === PanelState.Fullscreen,
  };
}
