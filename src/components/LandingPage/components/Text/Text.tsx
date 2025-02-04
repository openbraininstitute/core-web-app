import React from 'react';
import { PortableText } from 'next-sanity';

import { RichText } from '../../content/_common';
import { classNames } from '@/util/utils';
import { isString } from '@/util/type-guards';

import styles from './Text.module.css';

export interface TextProps {
  className?: string;
  value: string | RichText;
  raw?: boolean;
}

export function Text({ className, value, raw }: TextProps) {
  return (
    <div className={classNames(className, styles.text, raw && styles.raw)}>
      {isString(value) ? value : <PortableText value={value} />}
    </div>
  );
}
