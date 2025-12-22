import { classNames } from '@/util/utils';
import type { ContentForRichTextVerticalSpace } from '../../../content';
import { styleBlockFullWidth } from '../../../styles';

import styles from './SanityContentVerticalSpace.module.css';

interface SanityContentVerticalSpaceProps {
  value: ContentForRichTextVerticalSpace;
}

export default function SanityContentVerticalDivider({ value }: SanityContentVerticalSpaceProps) {
  return (
    <div
      className={classNames(
        styles.sanityContentVerticalSpace,
        styles[value.spacing],
        styleBlockFullWidth
      )}
    />
  );
}
