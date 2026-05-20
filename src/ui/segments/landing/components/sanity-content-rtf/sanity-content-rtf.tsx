import { logError } from '@/util/logger';

import Error from '../error';
import SanityContentImage from './sanity-content-image/sanity-content-image';
import SanityContentItems from './sanity-content-items';
import { SanityContentMultipleButton } from './sanity-content-multiple-button/sanity-content-multiple-button';
import SanityContentParagraph from './sanity-content-paragraph';
import SanityContentPreview from './sanity-content-preview';
import SanityContentTitle from './sanity-content-title';
import SanityContentVerticalDivider from './sanity-content-vertical-space';
import SanityContentVideo from './sanity-content-video/sanity-content-video';
import SanityContentWidget from './sanity-content-widget';

import type {
  ContentForRichText,
  ContentForRichTextImage,
  ContentForRichTextItems,
  ContentForRichTextMultipleButton,
  ContentForRichTextParagraph,
  ContentForRichTextPreview,
  ContentForRichTextTitle,
  ContentForRichTextVerticalSpace,
  ContentForRichTextVideo,
  ContentForRichTextWidget,
} from '@/services/sanity/types/rtf-content';

interface SanityContentRTFProps {
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
    | ContentForRichTextImage
    | ContentForRichTextVideo
    | ContentForRichTextMultipleButton,
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
    case 'video':
      return <SanityContentVideo key={key} value={item} />;
    case 'multipleButton':
      return <SanityContentMultipleButton key={key} value={item} />;
    default:
      logError("Don't know how to render this item:", item);
      return (
        <Error>
          Don&apos;t know (yet) how to display this content:{' '}
          <strong>
            <code>&quot;{(item as { _type: string })._type}&quot;</code>
          </strong>
          !
        </Error>
      );
  }
}
