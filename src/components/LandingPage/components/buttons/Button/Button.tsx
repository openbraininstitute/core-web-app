import React from 'react';

import Link from 'next/link';
import { IconArrowRight } from '../../../icons/IconArrowRight';
import { styleButtonHoverable } from '../../../styles';
import { classNames } from '@/util/utils';

import styles from './Button.module.css';

export interface ButtonProps {
  className?: string;
  subTitle: string;
  title: string;
  /** Pass a string for links. */
  onClick: string | (() => void);
  align?: 'end' | 'start' | 'center';
  target?: string;
}

export default function Button({
  className,
  subTitle,
  title,
  onClick,
  align = 'end',
  target,
}: ButtonProps) {
  const core = (
    <div className={styles.core}>
      <div>
        <div>{subTitle}</div>
        <div>
          <IconArrowRight />
        </div>
      </div>
      <div className="font-dm">{title}</div>
    </div>
  );
  const cls = classNames(className, styles.button, styles[align], styleButtonHoverable);
  return typeof onClick === 'string' ? (
    <Link href={onClick} className={cls} target={target}>
      {core}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={onClick}>
      {core}
    </button>
  );
}
