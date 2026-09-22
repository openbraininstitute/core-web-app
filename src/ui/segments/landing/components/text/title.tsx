import {
  styleBlockSmall,
  styleBlockSmallExpandRight,
  styleBlockSmallMarginLeft,
} from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type React from 'react';
import type { CSSProperties } from 'react';

import styles from './title.module.css';

interface TitleProps {
  className?: string;
  testId?: string;
  value: string;
  margin?: string;
  children?: React.ReactNode;
}

export default function Title({ className, testId, value, children, margin }: TitleProps) {
  const style: CSSProperties = {};
  if (margin) {
    style.marginTop = margin;
    style.marginBottom = margin;
  }
  if (children) {
    return (
      <div className="relative">
        <div className={classNames(styles.title, styleBlockSmallMarginLeft)}>
          <div />
        </div>
        <div className={classNames(className, styleBlockSmallExpandRight, styles.flex)}>
          <h1 data-testid={testId} style={style}>
            {value}
          </h1>
          <div>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={classNames(className, styles.title, styleBlockSmallMarginLeft, 'relative top-9')}
      >
        <div />
      </div>
      <h1 data-testid={testId} style={style} className={styleBlockSmall}>
        {value}
      </h1>
    </>
  );
}
