import { EnumSection } from '../sections/sections';
import { useSanityContentRTF } from './content';
import { ContentForRichText } from './types';

export function useSanityContentForTermsAndConditionsContent(): ContentForRichText {
  return useSanityContentRTF(EnumSection.TermsAndConditions);
}
