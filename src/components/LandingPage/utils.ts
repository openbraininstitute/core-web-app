'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_SECTION, ID_MENU, Section, SECTIONS } from './constants';
import { EnumSection } from './sections/sections';
import { isString } from '@/util/type-guards';

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
  window.location.href = section.slug;
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
