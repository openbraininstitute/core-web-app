import { EnumSection } from '../sections/sections';
import { useSanityContentRTF } from './content';
import { ContentForRichText } from './types';

export function useSanityContentForTeamContent(): ContentForRichText {
  return useSanityContentRTF(EnumSection.Team);
}
