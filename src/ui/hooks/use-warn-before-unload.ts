import { useEffect } from 'react';

/** Asks the browser to confirm before the page is closed or reloaded while `active`. */
export function useWarnBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
}
