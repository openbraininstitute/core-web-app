import { styleButtonHoverable } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';

import styles from './email-button.module.css';

interface EmailButtonProps {
  className?: string;
  email: string;
  children: ReactNode;
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
