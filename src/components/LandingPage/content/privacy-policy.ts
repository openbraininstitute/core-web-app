import { EnumSection } from '../sections/sections';
import { useSanityContentRTF } from './content';
import { ContentForRichText } from './types';

export function useSanityContentForPrivacyPolicyContent(): ContentForRichText {
  return useSanityContentRTF(EnumSection.PrivacyPolicy);
}
