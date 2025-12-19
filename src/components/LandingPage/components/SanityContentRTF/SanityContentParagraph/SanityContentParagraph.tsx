import { classNames } from '@/util/utils';
import type { ContentForRichTextParagraph } from '../../../content/types';
import { styleBlockSmall } from '../../../styles';
import { Text } from '../../Text';

import styles from './SanityContentParagraph.module.css';

interface SanityContentParagraphProps {
  value: ContentForRichTextParagraph;
}

export default function SanityContentParagraph({ value }: SanityContentParagraphProps) {
  return (
    <div className={classNames(styles.sanityContentParagraph, styleBlockSmall)}>
      <Text value={value.content} />
    </div>
  );
}
