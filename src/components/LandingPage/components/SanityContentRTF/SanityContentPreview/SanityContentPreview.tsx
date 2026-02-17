import { styleBlockFullWidth, styleBlockSmall, styleLayout } from '@/components/LandingPage/styles';
import { gotoSection } from '@/components/LandingPage/utils';
import { classNames } from '@/util/utils';

import ProgressiveImage from '../../ProgressiveImage';
import { Text } from '../../Text';
import Title from '../../Title';
import VerticalSpace from '../../VerticalSpace';

import type { ContentForRichTextPreview } from '@/components/LandingPage/content';

import styles from './SanityContentPreview.module.css';

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
            <button
              type="button"
              className={styles.button}
              onClick={() => gotoSection(value.button?.link ?? '')}
            >
              {value.button.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
