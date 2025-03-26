/* eslint-disable no-console */
import { EnumSection } from '../sections/sections';
import { getSection } from '../utils';
import { ContentForRichText, isContentForRichText } from './types';
import queryContentRTF from './content.groq';
import { useSanity } from '@/services/sanity';

export function useSanityContentRTF(sectionIndex: EnumSection): ContentForRichText {
  const section = getSection(sectionIndex);
  // In Sanity, we use only the last word of the actual slug.
  // `/welcome/home` is referenced as `home` in Sanity.
  const slug = section.slug.split('/').pop() || '/';
  const query = queryContentRTF.replaceAll('<SLUG>', slug);
  return useSanity(query, isContentForRichText) ?? [];
}
