import { EnumSection } from '../sections/sections';
import { useSanityContentRTF } from './content';
import { ContentForRichText } from './types';

export function useSanityContentForAboutContent(): ContentForRichText {
  return useSanityContentRTF(EnumSection.About);
}
