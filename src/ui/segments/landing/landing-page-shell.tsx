import { AntdRegistry } from '@ant-design/nextjs-registry';

import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';
import { classNames } from '@/util/utils';

import { EnumSection } from './sections/sections';

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
  section: EnumSection;
  error?: LandingPageError;
  children: ReactNode;
}

export default function LandingPageShell({
  className,
  section,
  error,
  children,
}: LandingPageShellProps) {
  const isFeatures = section === EnumSection.Features;

  return (
    <div
      className={classNames(
        className,
        styles.landingPage,
        isFeatures && 'landing-features-snap'
      )}
    >
      <AntdRegistry>{children}</AntdRegistry>
      {error?.errorcode && <InvitationErrorDialog error={error} />}
    </div>
  );
}
