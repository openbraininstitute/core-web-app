import { useAtom } from 'jotai';

import { aiPanelStateAtom } from '@/ui/segments/ai/store';
import { PanelState } from '@/ui/segments/ai/types';

export function usePanelState() {
  const [state, setState] = useAtom(aiPanelStateAtom);

  return {
    state,
    setState,
    isCollapsed: state === PanelState.Collapsed,
    isExpanded: state === PanelState.Expanded,
    isFullscreen: state === PanelState.Fullscreen,
  };
}
