import React from 'react';

import SectionGeneric from '../SectionGeneric';
import { ContentForRichText } from '../../content';

export default function SectionContact({ content }: { content: ContentForRichText }) {
  return <SectionGeneric content={content} />;
}
