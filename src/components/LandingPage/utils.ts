import { isString } from '@/util/type-guards';

import { DEFAULT_SECTION, SECTIONS, type Section } from './constants';

import type { EnumSection } from './sections/sections';

/**
 * Predicate for `*[_type=="pages"][<here>][0]` so the homepage matches Sanity whether
 * `slug.current` is stored as `"/"` or `"home"` (datasets differ; see `content/portals.ts`).
 */
export function getSanityPagesSlugPredicate(sectionSlug: string): string {
  const segments = sectionSlug.split('/').filter(Boolean);
  const last = segments.at(-1);
  if (last === undefined) {
    return '(slug.current == "/" || slug.current == "home")';
  }
  return `slug.current == ${JSON.stringify(last)}`;
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
  window.location.href = section.slug;
}
