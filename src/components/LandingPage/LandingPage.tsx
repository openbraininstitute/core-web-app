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

import AcceptInviteErrorDialog from '@/components/Invites/AcceptInviteErrorDialog';
import { logError } from '@/util/logger';
import { classNames } from '@/util/utils';

import styles from './LandingPage.module.css';
import './global.css';

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

  console.log('LandingPage', { section, errorCode });

  return (
    <>
      <div className={classNames(className, styles.landingPage)}>
        <Menu scrollHasStarted={scrollHasStarted} section={section} />
        <Hero section={section} />
        <PaddedBlock>{renderSection(section)}</PaddedBlock>
        <VerticalSpace height="30px" />
        <FooterPanel />
        {errorCode && <AcceptInviteErrorDialog errorCode={errorCode} />}
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
