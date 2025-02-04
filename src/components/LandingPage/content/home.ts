import { EnumSection } from '../sections/sections';
import { useSanityContentRTF } from './content';
import { ContentForRichText } from './types';

export function useSanityContentForHomeContent(): ContentForRichText {
  return useSanityContentRTF(EnumSection.Home);
}
