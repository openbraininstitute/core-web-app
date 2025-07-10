'use client';

import React from 'react';
import isEmpty from 'lodash/isEmpty';

import SanityContentRTF from '../../components/SanityContentRTF';
import { ContentForRichText } from '../../content';

interface GenericSectionProps {
  content: ContentForRichText;
}

export default function SectionGeneric({ content }: GenericSectionProps) {
  if (isEmpty(content)) return null;
  return <SanityContentRTF value={content} />;
}
