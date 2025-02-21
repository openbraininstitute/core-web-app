import React from 'react';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { IconArrowRight } from '../../../icons/IconArrowRight';
import { classNames } from '@/util/utils';

import styles from './HeaderLoginButton.module.css';

export interface HeaderLoginButtonProps {
  className?: string;
  stuck: boolean;
}

/**
 * @param {boolean} params.stuck Stuck mean that the menu is stuck to the top of the screen
 * because of the page having been scolled down. In this case, the menu must be smaller.
 * `styles.small` is visible when the menu is stuck, otherwise `styles.large` is visible.
 */
export default function HeaderLoginButton({ className, stuck }: HeaderLoginButtonProps) {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const link = isAuthenticated ? '/app/virtual-lab' : `/app/log-in?callbackUrl=/app/virtual-lab`;
  const captionLarge = isAuthenticated ? 'Go to' : 'Log in to';
  const captionSmall = isAuthenticated ? 'Go to' : 'Log in to';
  return (
    <Link
      className={classNames(className, styles.headerLoginButton, stuck && styles.stuck)}
      href={link}
    >
      <div className={styles.label}>
        <span className={styles.small}>
          {captionSmall} the <b>Platform</b>
        </span>
        <span className={styles.large}>
          {captionLarge} the <b>Platform</b>
        </span>
      </div>
      <div className={classNames(styles.arrow, styles.large)}>
        <IconArrowRight />
      </div>
    </Link>
  );
}
