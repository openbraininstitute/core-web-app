'use client';

import React from 'react';
import { getSection, sanitizeURL } from './utils';
import { ID_MENU } from './constants';
import { EnumSection } from './sections/sections';
import { isBrowser } from '@/utils/environment';

export function gotoSection(slugOrIndex: string | EnumSection) {
  const section = getSection(slugOrIndex);
  const url = sanitizeURL(section.slug);
  window.location.href = url;
}

function useResizeObserver(callback: ResizeObserverCallback): ResizeObserver | null {
  const ref = React.useRef<ResizeObserver | null>(null);
  if (isBrowser()) {
    if (!ref.current) ref.current = new ResizeObserver(callback);
    return ref.current;
  }
  return null;
}

export function useMenuHeight(): number {
  const [menuHeight, setMenuHeight] = React.useState(0);
  const handleResize = React.useCallback(() => {
    const menu = document.getElementById(ID_MENU);
    if (!menu) return;

    setMenuHeight(menu.clientHeight);
  }, [setMenuHeight]);
  const observer = useResizeObserver(handleResize);
  React.useEffect(() => {
    observer?.observe(document.body);
    return () => observer?.unobserve(document.body);
  }, [observer]);
  return menuHeight;
}
