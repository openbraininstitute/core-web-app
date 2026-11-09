import { AntdRegistry } from '@ant-design/nextjs-registry';

import { learnFonts } from '@/features/learn/fonts';
import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';
import { classNames } from '@/util/utils';

import { informationFont } from './information-font';
import SectionRail from './layout/section-rail';
import { EnumSection } from './sections/sections';

import styles from './landing-page.module.css';
import './global.css';

import type { ReactNode } from 'react';

/** The pages under Find out more: held a section at a time, with dots down the right. */
const SNAPPING = new Set<EnumSection>([
  EnumSection.About,
  EnumSection.Story,
  EnumSection.Mission,
  EnumSection.Team,
  EnumSection.Features,
  EnumSection.Showcases,
  EnumSection.Pricing,
  EnumSection.News,
  EnumSection.Contact,
]);

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
  const snaps = SNAPPING.has(section);

  return (
    <div
      className={classNames(
        className,
        learnFonts,
        styles.landingPage,
        section !== EnumSection.Home && `${informationFont.variable} ${styles.informationPage}`,
        snaps && 'landing-page-snap'
      )}
    >
      <AntdRegistry>{children}</AntdRegistry>
      {snaps && <SectionRail />}
      {error?.errorcode && <InvitationErrorDialog error={error} />}
    </div>
  );
}
