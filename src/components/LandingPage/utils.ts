import React from 'react';

import { EnumSection } from './sections/sections';
import { DEFAULT_SECTION, ID_MENU, Section, SECTIONS } from './constants';
import { basePath } from '@/config';
import { isString } from '@/util/type-guards';

/**
 * When an URL starts with a "/", that is an application page.
 * So we need to prepend the `basePath`.
 */
export function sanitizeURL(url: string): string {
  if (url.startsWith('/')) {
    return `${basePath}${url}`;
  }
  return url;
}

export function getSection(slugOrIndex: string | EnumSection): Section {
  return isString(slugOrIndex) ? getSectionFromSlug(slugOrIndex) : getSectionFromIndex(slugOrIndex);
}

function getSectionFromSlug(slug: string): Section {
  const sanitizedSlug = slug.trim().toLocaleLowerCase();
  return SECTIONS.find((section) => section.slug.endsWith(sanitizedSlug)) ?? DEFAULT_SECTION;
}

function getSectionFromIndex(index: EnumSection): Section {
  return SECTIONS.find((section) => section.index === index) ?? DEFAULT_SECTION;
}

export function gotoSection(slugOrIndex: string | EnumSection) {
  const section = getSection(slugOrIndex);
  const url = sanitizeURL(section.slug);
  window.location.href = url;
}

export function useResizeObserver(callback: ResizeObserverCallback): ResizeObserver {
  const ref = React.useRef<ResizeObserver | null>(null);
  if (!ref.current) ref.current = new ResizeObserver(callback);
  return ref.current;
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
    observer.observe(document.body);
    return () => observer.unobserve(document.body);
  }, [observer]);
  return menuHeight;
}
