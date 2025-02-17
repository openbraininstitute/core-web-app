import { EnumSection } from './sections/sections';
import { DEFAULT_SECTION, Section, SECTIONS } from './constants';
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
