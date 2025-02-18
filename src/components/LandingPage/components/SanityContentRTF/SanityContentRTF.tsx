import React from 'react';

import {
  ContentForRichText,
  ContentForRichTextImage,
  ContentForRichTextItems,
  ContentForRichTextParagraph,
  ContentForRichTextPreview,
  ContentForRichTextTitle,
  ContentForRichTextVerticalSpace,
  ContentForRichTextWidget,
} from '../../content/types';
import Error from '../Error';
import SanityContentTitle from './SanityContentTitle';
import SanityContentParagraph from './SanityContentParagraph';
import SanityContentItems from './SanityContentItems';
import SanityContentWidget from './SanityContentWidget';
import SanityContentVerticalDivider from './SanityContentVerticalSpace';
import SanityContentPreview from './SanityContentPreview';
import SanityContentImage from './sanity-content-image';
import { logError } from '@/util/logger';

export interface SanityContentRTFProps {
  className?: string;
  value: ContentForRichText;
}

export default function SanityContentRTF({ value }: SanityContentRTFProps) {
  return value.map(renderItem);
}

function renderItem(
  item:
    | ContentForRichTextTitle
    | ContentForRichTextItems
    | ContentForRichTextWidget
    | ContentForRichTextParagraph
    | ContentForRichTextVerticalSpace
    | ContentForRichTextPreview
    | ContentForRichTextImage,
  index: number
) {
  const key = `${item._type}/${index}`;
  switch (item._type) {
    case 'verticalDivider':
      return <SanityContentVerticalDivider key={key} value={item} />;
    case 'titleHeadline':
      return <SanityContentTitle key={key} value={item} />;
    case 'richContent':
      return <SanityContentParagraph key={key} value={item} />;
    case 'bulletList':
      return <SanityContentItems key={key} value={item} />;
    case 'section':
      return <SanityContentWidget key={key} value={item} />;
    case 'previewBlock':
      return <SanityContentPreview key={key} value={item} />;
    case 'imageBlock':
      return <SanityContentImage key={key} value={item} />;
    default:
      logError("Don't know how to render this item:", item);
      return (
        <Error>
          Don&apos;t know (yet) how to display this content:{' '}
          <strong>{(item as { _type: string })._type}</strong>!
        </Error>
      );
  }
}
