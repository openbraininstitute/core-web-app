/* eslint-disable react/no-array-index-key */
import React from 'react';

import { styleBlockSmall } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import ProgressiveImage from '../progressive-image/progressive-image';

import type { ContentForRichTextItems } from '@/services/sanity/types/rtf-content';

import styles from './sanity-content-items.module.css';

interface SanityContentItemsProps {
  value: ContentForRichTextItems;
}

export default function SanityContentItems({ value }: SanityContentItemsProps) {
  return (
    <ul className={classNames(styles.sanityContentItems, styleBlockSmall)}>
      {value.content.map((item, index) => (
        <li key={`${index}`}>
          {item.title && <h3>{item.title}</h3>}
          <div className={styles.content}>
            {item.imageURL && item.imageWidth && item.imageHeight && (
              <ProgressiveImage
                className={styles.vignette}
                src={item.imageURL}
                width={item.imageWidth}
                height={item.imageHeight}
                alt={item.title ?? 'Vignette'}
              />
            )}
            <div>{item.content}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
