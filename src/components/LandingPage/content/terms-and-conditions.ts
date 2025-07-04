import { EnumSection } from '../sections/sections';
import { useSanityContentRTF } from './content';
import { ContentForRichText } from './types';

function useSanityContentForTermsAndConditionsContent(): ContentForRichText {
  return useSanityContentRTF(EnumSection.TermsAndConditions);
}
