'use client';

import { useEffect, useState } from 'react';

import type { RefObject } from 'react';

function useScrollHasStarted(containerRef?: RefObject<HTMLElement | null>) {
  const [scrollHasStarted, setScrollHasStarted] = useState(false);
  useEffect(() => {
    const el = containerRef?.current;
    const target = el ?? window;
    const handleScroll = () => {
      setScrollHasStarted(el ? el.scrollTop > 0 : window.scrollY > 0);
    };
    handleScroll();
    target.addEventListener('scroll', handleScroll);
    return () => target.removeEventListener('scroll', handleScroll);
  }, [containerRef]);
  return scrollHasStarted;
}

export default useScrollHasStarted;
