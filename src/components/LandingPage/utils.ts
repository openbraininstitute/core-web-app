import { DEFAULT_SECTION, Section, SECTIONS } from './constants';
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
