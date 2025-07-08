'use client';

import React from 'react';

import SanityContentRTF from '../../components/SanityContentRTF';
import { useSanityContentRTF } from '../../content/content';
import { EnumSection } from '../sections';
import { ContentForRichText } from '../../content';
import isEmpty from 'lodash/isEmpty';

interface GenericSectionProps {
  section: EnumSection;
  content: ContentForRichText;
}

export default function SectionGeneric({ content }: GenericSectionProps) {
  if (isEmpty(content)) return null;
  return <SanityContentRTF value={content} />;
}
