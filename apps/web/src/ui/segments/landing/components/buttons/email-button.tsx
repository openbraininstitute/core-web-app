import { styleButtonHoverable } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';

import styles from './email-button.module.css';

interface EmailButtonProps {
  className?: string;
  testId?: string;
  email: string;
  children: ReactNode;
}

export default function EmailButton({ className, testId, email, children }: EmailButtonProps) {
  return (
    <a
      className={classNames(className, styles.emailButton, styleButtonHoverable)}
      href={`mailto:${email}`}
      data-testid={testId}
    >
      <div>{children}</div>
      <big>{email}</big>
    </a>
  );
}
