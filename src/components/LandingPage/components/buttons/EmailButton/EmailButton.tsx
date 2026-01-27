import type React from 'react';
import { classNames } from '@/util/utils';
import { styleButtonHoverable } from '../../../styles';

import styles from './EmailButton.module.css';

interface EmailButtonProps {
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
