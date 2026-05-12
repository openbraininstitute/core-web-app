import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { styleBlockMedium } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ContentForRichTextImage } from '@/services/sanity/types/rtf-content';

import styles from './sanity-content-image.module.css';

interface SanityContentImageProps {
  className?: string;
  value: ContentForRichTextImage;
}

export default function SanityContentImage({ className, value }: SanityContentImageProps) {
  const { image } = value;

  if (!image) return null;

  return (
    <div
      className={classNames(className, styles.sanityContentImage, styleBlockMedium)}
      style={{ '--custom-aspect-ratio': image.width / image.height }}
    >
      <ProgressiveImage src={image.url} width={image.width} height={image.height} alt={value.alt} />
    </div>
  );
}
