import { atom, useAtom } from 'jotai';
import { useCallback } from 'react';

import {
  COOKIE_MAX_AGE,
  defaultFlags,
  FEATURE_FLAGS_COOKIE,
} from '@/features/feature-flags/config';
import { PanelState } from '@/ui/segments/ai/types';

const panelStateAtom = atom<PanelState>(readPanelStateFromCookie());

function readPanelStateFromCookie(): PanelState {
  if (typeof document === 'undefined') return PanelState.Collapsed;

  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith(`${FEATURE_FLAGS_COOKIE}=`));

    if (!raw) return PanelState.Collapsed;

    const parsed = JSON.parse(decodeURIComponent(raw.split('=')[1]));
    const value = parsed?.aiPanelState;

    if (Object.values(PanelState).includes(value)) return value;
  } catch {
    // noop
  }

  return PanelState.Collapsed;
}

function persistPanelStateToCookie(newState: PanelState) {
  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith(`${FEATURE_FLAGS_COOKIE}=`));

    const current = raw ? JSON.parse(decodeURIComponent(raw.split('=')[1])) : {};
    const merged = { ...defaultFlags, ...current, aiPanelState: newState };

    document.cookie = `${FEATURE_FLAGS_COOKIE}=${encodeURIComponent(JSON.stringify(merged))};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
  } catch {
    // noop
  }
}

export function usePanelState() {
  const [state, setStateInternal] = useAtom(panelStateAtom);

  const setState = useCallback(
    (next: PanelState) => {
      setStateInternal(next);
      persistPanelStateToCookie(next);
    },
    [setStateInternal]
  );

  return {
    state,
    setState,
    isCollapsed: state === PanelState.Collapsed,
    isExpanded: state === PanelState.Expanded,
    isFullscreen: state === PanelState.Fullscreen,
  };
}
