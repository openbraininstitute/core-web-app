import { logError } from '@/utils/logger';

import ViewError from '../error';
import PageSection from '../page-section';
import SanityContentImage from './sanity-content-image/sanity-content-image';
import SanityContentItems from './sanity-content-items';
import { SanityContentMultipleButton } from './sanity-content-multiple-button/sanity-content-multiple-button';
import SanityContentParagraph from './sanity-content-paragraph';
import SanityContentPreview from './sanity-content-preview';
import SanityContentTitle from './sanity-content-title';
import SanityContentVerticalDivider from './sanity-content-vertical-space';
import SanityContentVideo from './sanity-content-video/sanity-content-video';
import SanityContentWidget from './sanity-content-widget';

import type { ReactNode } from 'react';
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
  sectionSlug?: string;
  value: ContentForRichText;
}

/** The page's items in sections: one from each title on, and each band on its own. */
export default function SanityContentRTF({ sectionSlug, value }: SanityContentRTFProps) {
  let storyTitleIndex = 0;
  const sections: ReactNode[][] = [];
  let open = false;

  value.forEach((item, index) => {
    const testId =
      sectionSlug === 'the-real-digital-brain-story' && item._type === 'titleHeadline'
        ? `story-chapter-${storyTitleIndex++}`
        : undefined;
    const band = item._type === 'previewBlock';
    if (!open || band || item._type === 'titleHeadline') sections.push([]);
    sections[sections.length - 1].push(renderItem(item, index, sectionSlug, testId));
    open = !band;
  });

  return sections.map((items, index) => (
    // eslint-disable-next-line react/no-array-index-key -- The page's order is its identity.
    <PageSection key={index}>{items}</PageSection>
  ));
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
  index: number,
  sectionSlug?: string,
  testId?: string
) {
  const key = `${item._type}/${index}`;
  switch (item._type) {
    case 'verticalDivider':
      return <SanityContentVerticalDivider key={key} value={item} />;
    case 'titleHeadline':
      return <SanityContentTitle key={key} testId={testId} value={item} />;
    case 'richContent':
      return <SanityContentParagraph key={key} value={item} />;
    case 'bulletList':
      return (
        <SanityContentItems
          key={key}
          testIdPrefix={sectionSlug === 'mission' ? 'mission-purpose' : undefined}
          value={item}
        />
      );
    case 'section':
      return <SanityContentWidget key={key} value={item} sectionSlug={sectionSlug} />;
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
        <ViewError>
          Don&apos;t know (yet) how to display this content:{' '}
          <strong>
            <code>&quot;{(item as { _type: string })._type}&quot;</code>
          </strong>
          !
        </ViewError>
      );
  }
}
