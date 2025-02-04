import { EnumSection } from '../sections/sections';
import { useSanityContentRTF } from './content';
import { ContentForRichText } from './types';

export function useSanityContentForOurMissionContent(): ContentForRichText {
  return useSanityContentRTF(EnumSection.Mission);
}
