'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ID_MENU } from './constants';

function useResizeObserver(callback: ResizeObserverCallback): ResizeObserver {
  const ref = useRef<ResizeObserver | null>(null);
  if (!ref.current) ref.current = new ResizeObserver(callback);
  return ref.current;
}

export function useMenuHeight(): number {
  const [menuHeight, setMenuHeight] = useState(0);
  const handleResize = useCallback(() => {
    const menu = document.getElementById(ID_MENU);
    if (!menu) return;

    setMenuHeight(menu.clientHeight);
  }, [setMenuHeight]);
  const observer = useResizeObserver(handleResize);
  useEffect(() => {
    observer.observe(document.body);
    return () => observer.unobserve(document.body);
  }, [observer]);
  return menuHeight;
}
