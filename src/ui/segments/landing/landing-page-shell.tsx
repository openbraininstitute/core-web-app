'use client';

import { useEffect } from 'react';

import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';
import { classNames } from '@/util/utils';

import styles from './landing-page.module.css';
import './global.css';

import type { ReactNode } from 'react';

export type LandingPageError = {
  errorcode: string | undefined;
  originalCode: string | undefined;
  description: string | undefined;
};

interface LandingPageShellProps {
  className?: string;
  error?: LandingPageError;
  children: ReactNode;
}

export default function LandingPageShell({ className, error, children }: LandingPageShellProps) {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, []);

  return (
    <div className={classNames(className, styles.landingPage)}>
      {children}
      {error?.errorcode && <InvitationErrorDialog error={error} />}
    </div>
  );
}
