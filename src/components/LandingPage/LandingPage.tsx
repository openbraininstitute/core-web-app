'use client';

import { useEffect, useState } from 'react';

import FooterPanel from './layout/FooterPanel';
import Menu from './layout/Menu';
import SectionContact from './sections/SectionContact';
import { EnumSection } from './sections/sections';
import { getSection } from './utils';
import Hero from './layout/Hero';
import SectionGeneric from './sections/SectionGeneric';
import PaddedBlock from './components/PaddedBlock';
import SectionNews from './sections/SectionNews';
import { classNames } from '@/util/utils';
import AcceptInviteErrorDialog from '@/components/Entrypoint/segments/AcceptInviteErrorDialog';
import { logError } from '@/util/logger';

import styles from './LandingPage.module.css';

export interface LandingPageProps {
  className?: string;
  section: EnumSection;
  errorCode?: string;
}

export default function LandingPage({ className, section, errorCode }: LandingPageProps) {
  const scrollHasStarted = useScrollHasStarted();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, [section]);

  return (
    <>
      <div className={classNames(className, styles.landingPage)}>
        <Menu scrollHasStarted={scrollHasStarted} section={section} />
        <Hero section={section} />
        <PaddedBlock>{renderSection(section)}</PaddedBlock>
        <FooterPanel section={section} />
        {errorCode && <AcceptInviteErrorDialog errorCode={errorCode} />}
      </div>
      {/* <MatomoAnalytics /> */}
    </>
  );
}

function renderSection(section: EnumSection): React.ReactNode {
  switch (section) {
    case EnumSection.Home:
    case EnumSection.About:
    case EnumSection.Mission:
    case EnumSection.Pricing:
    case EnumSection.Team:
    case EnumSection.Repositories:
    case EnumSection.TermsAndConditions:
    case EnumSection.PrivacyPolicy:
    case EnumSection.ComingSoon:
      return <SectionGeneric section={section} />;
    case EnumSection.Contact:
      return <SectionContact />;
    case EnumSection.News:
      return <SectionNews />;
    default:
      logError('This slug has NOT been implemented yet!', getSection(section));
      return null;
  }
}

function useScrollHasStarted() {
  const [scrollHasStarted, setScrollHasStarted] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrollHasStarted(window.scrollY > 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrollHasStarted;
}
