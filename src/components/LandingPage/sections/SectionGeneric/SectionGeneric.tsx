import React from 'react';

import SanityContentRTF from '../../components/SanityContentRTF';
import { useSanityContentRTF } from '../../content/content';
import { EnumSection } from '../sections';

export interface GenericSectionProps {
  section: EnumSection;
}

export default function SectionGeneric({ section }: GenericSectionProps) {
  const content = useSanityContentRTF(section);

  return <SanityContentRTF value={content} />;
}
