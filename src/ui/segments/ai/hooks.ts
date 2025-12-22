import { useCallback } from 'react';

import { setFlag, useFlags, aiPanelStateFlag } from '@/features/feature-flags';
import { PanelState } from '@/ui/segments/ai/types';

export function usePanelState() {
  const { aiPanelState: state } = useFlags();

  const setState = useCallback(
    (newState: PanelState) => setFlag(aiPanelStateFlag.key, newState),
    []
  );

  return {
    state,
    setState,
    isCollapsed: state === PanelState.Collapsed,
    isExpanded: state === PanelState.Expanded,
    isFullscreen: state === PanelState.Fullscreen,
  };
}
