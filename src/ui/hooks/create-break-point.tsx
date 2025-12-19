'use client';

import findLast from 'es-toolkit/compat/findLast';
import head from 'es-toolkit/compat/head';
import sortBy from 'es-toolkit/compat/sortBy';
import toPairs from 'es-toolkit/compat/toPairs';
import { useEffect, useMemo, useState } from 'react';
import useBreakpoint from 'use-breakpoint';

import { isBrowser } from '@/utils/environment';

export const createBreakpoint = <T extends Record<string, number>>(
  breakpoints?: T,
): (() => keyof T) => {
  return () => {
    const [screen, setScreen] = useState(isBrowser() ? window.innerWidth : 0);

    useEffect(() => {
      if (!isBrowser()) return;

      const updateScreen = () => {
        setScreen(window.innerWidth);
      };

      // Initial measurement
      updateScreen();

      // Use ResizeObserver for optimal performance
      const resizeObserver = new ResizeObserver(() => {
        updateScreen();
      });

      // Observe the viewport changes
      resizeObserver.observe(document.documentElement);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    const defaultBreakpoints = { xl: 1280, l: 768 };
    const breakpointsToUse = breakpoints ?? (defaultBreakpoints as unknown as T);

    const currentBreakpoint = useMemo(() => {
      // convert to array of [name, width] pairs and sort by width ascending
      const sortedEntries = sortBy(toPairs(breakpointsToUse), 1);

      // find the largest breakpoint that the screen width meets or exceeds
      const matchingBreakpoint = findLast(sortedEntries, ([, width]) => screen >= width);

      // return the matching breakpoint name or fallback to the smallest breakpoint
      return matchingBreakpoint?.[0] ?? head(sortedEntries)?.[0];
    }, [breakpointsToUse, screen]);

    return currentBreakpoint as keyof T;
  };
};

// export const useDefaultBreakpoint = createBreakpoint({ xl: 1280, l: 768 });
export const useDefaultBreakpoint = () => {
  const BREAKPOINTS = { mobile: 0, l: 768, xl: 1280 };
  const { breakpoint } = useBreakpoint(BREAKPOINTS, 'l');

  return breakpoint;
};
