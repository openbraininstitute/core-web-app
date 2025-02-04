import React from 'react';

import { styleButtonHoverable } from '../../../styles';
import { classNames } from '@/util/utils';

import styles from './EmailButton.module.css';

export interface EmailButtonProps {
  className?: string;
  email: string;
  children: React.ReactNode;
}

export default function EmailButton({ className, email, children }: EmailButtonProps) {
  return (
    <a
      className={classNames(className, styles.emailButton, styleButtonHoverable)}
      href={`mailto:${email}`}
    >
      <div>{children}</div>
      <big>{email}</big>
    </a>
  );
}
