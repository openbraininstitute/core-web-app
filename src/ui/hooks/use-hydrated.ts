import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const client = () => true;
const server = () => false;

/** Stable server markup, followed by the browser snapshot without a mount-effect state update. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, client, server);
}
