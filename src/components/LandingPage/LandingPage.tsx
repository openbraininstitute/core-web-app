'use client';

import { useEffect, useState } from 'react';

import { getSection } from './utils';

import PaddedBlock from './components/PaddedBlock';
import VerticalSpace from './components/VerticalSpace';
import FooterPanel from './layout/FooterPanel';
import Hero from './layout/Hero';
import Menu from './layout/Menu';
import SectionContact from './sections/SectionContact';
import SectionGeneric from './sections/SectionGeneric';
import SectionNews from './sections/SectionNews';
import { EnumSection } from './sections/sections';

import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';
import { classNames } from '@/util/utils';
import { logError } from '@/util/logger';

import styles from './LandingPage.module.css';
import './global.css';

interface LandingPageProps {
  className?: string;
  section: EnumSection;
  error?: {
    errorcode: string | undefined;
    originalCode: string | undefined;
    description: string | undefined;
  };
}

export default function LandingPage({ className, section, error }: LandingPageProps) {
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
        <VerticalSpace height="30px" />
        <FooterPanel />
        {error?.errorcode && <InvitationErrorDialog error={error} />}
      </div>
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
    case EnumSection.Resources:
    case EnumSection.TermsAndConditions:
    case EnumSection.Financing:
    case EnumSection.PrivacyPolicy:
    case EnumSection.ComingSoon:
    case EnumSection.Story:
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
