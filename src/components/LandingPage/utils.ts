'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_SECTION, ID_MENU, Section, SECTIONS } from './constants';
import { EnumSection } from './sections/sections';
import { config } from '@/config';
import { isString } from '@/util/type-guards';

/**
 * When an URL starts with a "/", that is an application page.
 * So we need to prepend the `basePath`.
 */
export function sanitizeURL(url: string): string {
  if (url.startsWith('/')) {
    return `${config.BASE_PATH}${url}`;
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
