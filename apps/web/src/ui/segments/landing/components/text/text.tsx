import { PortableText, type PortableTextReactComponents } from 'next-sanity';
import React from 'react';

import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import Spacer from './spacer';

import type { RichText } from '@/services/sanity/type-utils';

import styles from './text.module.css';

interface TextProps {
  className?: string;
  value: string | RichText;
  raw?: boolean;
  maxLines?: number;
}

const COMPONENTS: Partial<PortableTextReactComponents> = {
  types: {
    spacer: (value: unknown) => <Spacer value={value} />,
  },
};

export function Text({ className, value, raw, maxLines = 0 }: TextProps) {
  return (
    <div
      className={classNames(
        className,
        styles.text,
        raw && styles.raw,
        maxLines > 0 && styles.maxLines
      )}
      style={{
        '--custom-max-lines': maxLines,
      }}
    >
      {isString(value) ? value : <PortableText value={value} components={COMPONENTS} />}
    </div>
  );
}
