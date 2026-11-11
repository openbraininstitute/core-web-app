import Link from 'next/link';

import { styleBlockFullWidth, styleBlockSmall, styleLayout } from '@/ui/segments/landing/styles';
import { getSection } from '@/ui/segments/landing/utils';
import { classNames } from '@/util/utils';

import ProgressiveImage from '../progressive-image/progressive-image';
import { Text } from '../text/text';
import Title from '../text/title';
import VerticalSpace from '../vertical-space';

import type { ContentForRichTextPreview } from '@/services/sanity/types/rtf-content';

import styles from './sanity-content-preview.module.css';

interface SanityContentPreviewProps {
  value: ContentForRichTextPreview;
}

export default function SanityContentPreview({ value }: SanityContentPreviewProps) {
  return (
    <div
      className={classNames(
        styles.sanityContentPreview,
        styleLayout,
        value.background ? styles.dark : styles.light
      )}
    >
      {value.background && (
        <ProgressiveImage
          className={styles.background}
          src={value.background.url}
          width={value.background.width}
          height={value.background.height}
          alt="Background"
        />
      )}
      <Title value={value.title} margin="0" />
      <VerticalSpace height="48px" className={styleBlockFullWidth} />
      <div className={classNames(styles.content, styleBlockSmall)}>
        {value.image && (
          <ProgressiveImage
            className={styles.vignette}
            src={value.image.url}
            width={value.image.width}
            height={value.image.height}
            alt="Vignette"
          />
        )}
        <div className={styles.text}>
          {value.text && <Text value={value.text} className="relative -top-2" />}
          {value.button && (
            <Link href={getSection(value.button.link).slug} className={styles.button}>
              {value.button.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
