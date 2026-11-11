import React from 'react';

import { styleBlockMedium } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import { SingleButton } from './single-button/single-button';

import type { ContentForRichTextMultipleButton } from '@/services/sanity/types/rtf-content';

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
