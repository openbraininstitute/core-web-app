import { useEffect } from 'react';

import { isBrowser } from '@/utils/environment';

const OpenSpaceSwitcherEvent = 'OpenSpaceSwitcherEvent' as const;

/** Opens the lab/project switcher from anywhere on the page, e.g. to change project. */
export function openSpaceSwitcher() {
  if (isBrowser()) window.dispatchEvent(new CustomEvent(OpenSpaceSwitcherEvent));
}

export function useOpenSpaceSwitcherEvent(open: () => void) {
  useEffect(() => {
    window.addEventListener(OpenSpaceSwitcherEvent, open);
    return () => window.removeEventListener(OpenSpaceSwitcherEvent, open);
  }, [open]);
}
