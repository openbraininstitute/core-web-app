import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const PANEL_STATE = {
  Collapsed: 'collapsed',
  Expanded: 'expanded',
  Fullscreen: 'fullscreen',
} as const;

export type TPanelState = (typeof PANEL_STATE)[keyof typeof PANEL_STATE];

const panelStateAtom = atomWithStorage<TPanelState>('AI-assistant/panel-state', 'expanded');

export function usePanelState() {
  const [state, setState] = useAtom(panelStateAtom);
  return {
    state,
    setState,
    isCollapsed: state === PANEL_STATE.Collapsed,
    isExpanded: state === PANEL_STATE.Expanded,
    isFullscreen: state === PANEL_STATE.Fullscreen,
  };
}
