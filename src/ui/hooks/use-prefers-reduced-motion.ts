import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const subscribe = (changed: () => void) => {
  const preference = window.matchMedia(query);
  preference.addEventListener('change', changed);
  return () => preference.removeEventListener('change', changed);
};
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => true;

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
