import type { ContentForRichTextMultipleButton } from '@/components/LandingPage/content';
import { styleBlockMedium } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';
import styles from './sanity-content-multiple-button.module.css';
import { SingleButton } from './single-button';

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
