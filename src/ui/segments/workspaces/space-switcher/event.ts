import { useEffect, useEffectEvent } from 'react';

import { isBrowser } from '@/utils/environment';

const OpenSpaceSwitcherEvent = 'OpenSpaceSwitcherEvent' as const;

/** Opens the lab/project switcher from anywhere on the page, e.g. to change project. */
export function openSpaceSwitcher() {
  if (isBrowser()) window.dispatchEvent(new CustomEvent(OpenSpaceSwitcherEvent));
}

/** Calls `open` on {@link openSpaceSwitcher}; subscribed once, whatever `open` is. */
export function useOpenSpaceSwitcherEvent(open: () => void) {
  const onOpen = useEffectEvent(open);
  useEffect(() => {
    const listener = () => onOpen();
    window.addEventListener(OpenSpaceSwitcherEvent, listener);
    return () => window.removeEventListener(OpenSpaceSwitcherEvent, listener);
  }, []);
}
