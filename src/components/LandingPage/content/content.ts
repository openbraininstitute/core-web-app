/* eslint-disable no-console */

import { useSanity } from '@/services/sanity';

import { getSection } from '../utils';
import queryContentRTF from './content.groq';
import { type ContentForRichText, isContentForRichText } from './types';

import type { EnumSection } from '../sections/sections';

export interface ContentForPage {
  content: ContentForRichText;
  backgroundImage?: string | null;
  data?: unknown;
  description?: unknown;
  headline?: unknown;
  theme?: unknown;
  titleH1?: unknown;
  titleH2?: unknown;
  useCases?: unknown;
}

function isContentForPageWithContent(data: unknown): data is ContentForPage {
  return (
    data !== null &&
    typeof data === 'object' &&
    'content' in data &&
    isContentForRichText((data as { content: unknown }).content)
  );
}

export function useSanityContentRTF(sectionIndex: EnumSection): ContentForRichText {
  const section = getSection(sectionIndex);
  // In Sanity, we use only the last word of the actual slug.
  // `/welcome/home` is referenced as `home` in Sanity.
  const slug = section.slug.split('/').pop() || '/';
  const query = queryContentRTF.replaceAll('<SLUG>', slug);
  const result = useSanity(query, isContentForPageWithContent);
  return result?.content ?? [];
}

function isContentForPagePermissive(data: unknown): data is ContentForPage {
  if (data === null || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!('content' in obj) || !Array.isArray(obj.content)) return false;
  const content = obj.content as unknown[];
  const hasSingleFeature = content.some(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      '_type' in item &&
      (item as { _type: string })._type === 'singleFeature'
  );
  if (hasSingleFeature) return true;
  return isContentForPageWithContent(data);
}

export function useSanityContentForPage(sectionIndex: EnumSection): ContentForPage | undefined {
  const section = getSection(sectionIndex);
  const slug = section.slug.split('/').pop() || '/';
  const query = queryContentRTF.replaceAll('<SLUG>', slug);
  return useSanity(query, isContentForPagePermissive) ?? undefined;
}
