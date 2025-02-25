import { useEffect, useState } from 'react';

export const isBrowser = typeof window !== 'undefined';

export type UseMediaQuery = (query: string, defaultState?: boolean) => boolean;

function getInitialState(query: string, defaultState?: boolean) {
  if (defaultState !== undefined) {
    return defaultState;
  }

  if (isBrowser) {
    return window.matchMedia(query).matches;
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '`useMediaQuery` When server side rendering, defaultState should be defined to prevent a hydration mismatches.'
    );
  }

  return false;
}

export const useMediaQuery: UseMediaQuery = (query: string, defaultState?: boolean) => {
  const [state, setState] = useState(getInitialState(query, defaultState));

  useEffect(() => {
    let mounted = true;
    const mql = window.matchMedia(query);
    const onChange = () => {
      if (!mounted) {
        return;
      }
      setState(!!mql.matches);
    };

    if ('addEventListener' in mql) {
      mql.addEventListener('change', onChange);
    } else {
      (mql as any).addListener?.(onChange);
    }

    setState(mql.matches);

    return () => {
      mounted = false;
      if ('removeEventListener' in mql) {
        mql.removeEventListener('change', onChange);
      } else {
        (mql as any).removeListener?.(onChange);
      }
    };
  }, [query]);

  return state;
};
