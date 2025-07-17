import React from 'react';
import Link from 'next/link';

import ProgressiveImage from '../ProgressiveImage';
import { styleBlockSmall } from '../../styles';
import BackgroundURL from './background.jpg';
import { classNames } from '@/util/utils';

import styles from './TemporaryGoToLabButton.module.css';

interface TemporaryGoToLabButtonProps {
  className?: string;
  title: string;
  subTitle?: string;
  href: string;
}

export function TemporaryGoToLabButton({
  className,
  title,
  subTitle,
  href,
}: TemporaryGoToLabButtonProps) {
  return (
    <Link
      className={classNames(className, styles.temporaryGoToLabButton, styleBlockSmall)}
      href={href}
    >
      <ProgressiveImage
        className={styles.image}
        src={BackgroundURL.src}
        width={BackgroundURL.width}
        height={BackgroundURL.height}
      />
      <strong>{title}</strong>
      {subTitle && <div>{subTitle}</div>}
    </Link>
  );
}
