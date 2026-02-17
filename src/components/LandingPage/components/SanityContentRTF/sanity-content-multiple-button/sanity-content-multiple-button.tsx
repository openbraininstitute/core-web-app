import { styleBlockMedium } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';

import { SingleButton } from './single-button';

import type { ContentForRichTextMultipleButton } from '@/components/LandingPage/content';

import styles from './sanity-content-multiple-button.module.css';

interface SanityContentMultipleButtonProps {
  className?: string;
  value: ContentForRichTextMultipleButton;
}

export function SanityContentMultipleButton({
  className,
  value,
}: SanityContentMultipleButtonProps) {
  return (
    <div className={classNames(className, styles.sanityContentMultipleButton, styleBlockMedium)}>
      {value.buttonsList.map((item) => (
        <SingleButton key={item.href} value={item} />
      ))}
    </div>
  );
}
