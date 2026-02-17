/* eslint-disable no-console */

import { useSanity } from '@/services/sanity';

import { getSection } from '../utils';
import queryContentRTF from './content.groq';
import { type ContentForRichText, isContentForRichText } from './types';

import type { EnumSection } from '../sections/sections';

export function useSanityContentRTF(sectionIndex: EnumSection): ContentForRichText {
  const section = getSection(sectionIndex);
  // In Sanity, we use only the last word of the actual slug.
  // `/welcome/home` is referenced as `home` in Sanity.
  const slug = section.slug.split('/').pop() || '/';
  const query = queryContentRTF.replaceAll('<SLUG>', slug);
  return useSanity(query, isContentForRichText) ?? [];
}
