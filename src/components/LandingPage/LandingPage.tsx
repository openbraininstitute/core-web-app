'use client';

import { useEffect, useRef } from 'react';

import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';
import { logError } from '@/util/logger';
import { classNames } from '@/util/utils';

import PaddedBlock from './components/PaddedBlock';
import VerticalSpace from './components/VerticalSpace';
import FooterPanel from './layout/FooterPanel';
import Hero from './layout/Hero';
import Menu from './layout/Menu';
import SectionContact from './sections/SectionContact';
import SectionFeatures from './sections/SectionFeatures';
import SectionGeneric from './sections/SectionGeneric';
import SectionNews from './sections/SectionNews';
import SectionPricing from './sections/SectionPricing';
import SectionShowcases from './sections/SectionShowcases';
import { EnumSection } from './sections/sections';
import { getSection } from './utils';

import styles from './LandingPage.module.css';
import './global.css';

import useScrollHasStarted from '@/hooks/use-scroll-has-started';

export type LandingPageProps = {
  className?: string;
  section: EnumSection;
  error?: {
    errorcode: string | undefined;
    originalCode: string | undefined;
    description: string | undefined;
  };
};

export default function LandingPage({ className, section, error }: LandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFeatures = section === EnumSection.Features;
  const scrollHasStarted = useScrollHasStarted(isFeatures ? containerRef : undefined);

  useEffect(() => {
    if (isFeatures && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [isFeatures]);

  return (
    <div
      ref={containerRef}
      className={classNames(className, styles.landingPage, isFeatures && styles.featuresSnap)}
    >
      <Menu scrollHasStarted={scrollHasStarted} section={section} />
      <Hero section={section} />
      <PaddedBlock>{renderSection(section)}</PaddedBlock>
      <VerticalSpace height="30px" />
      <FooterPanel />
      {error?.errorcode && <InvitationErrorDialog error={error} />}
    </div>
  );
}

function renderSection(section: EnumSection): React.ReactNode {
  switch (section) {
    case EnumSection.Home:
    case EnumSection.About:
    case EnumSection.Mission:
    case EnumSection.Team:
    case EnumSection.Resources:
    case EnumSection.Notebooks:
    case EnumSection.TermsAndConditions:
    case EnumSection.Financing:
    case EnumSection.PrivacyPolicy:
    case EnumSection.ComingSoon:
    case EnumSection.Story:
      return <SectionGeneric section={section} />;
    case EnumSection.Pricing:
      return <SectionPricing />;
    case EnumSection.Contact:
      return <SectionContact />;
    case EnumSection.News:
      return <SectionNews />;
    case EnumSection.Features:
      return <SectionFeatures />;
    case EnumSection.Showcases:
      return <SectionShowcases />;
    default:
      logError('This slug has NOT been implemented yet!', getSection(section));
      return null;
  }
}
