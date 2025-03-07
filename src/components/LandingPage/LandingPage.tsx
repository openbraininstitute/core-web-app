'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Modal } from 'antd';

import FooterPanel from './layout/FooterPanel';
import Menu from './layout/Menu';
import SectionContact from './sections/SectionContact';
import { EnumSection } from './sections/sections';
import { useSanity } from './content/content';
import { getSection } from './utils';
import Hero from './layout/Hero';
import SectionGeneric from './sections/SectionGeneric';
import PaddedBlock from './components/PaddedBlock';
import SectionNews from './sections/SectionNews';
import VerticalSpace from './components/VerticalSpace';
import { classNames } from '@/util/utils';
import AcceptInviteErrorDialog from '@/components/Invites/AcceptInviteErrorDialog';
import { logError } from '@/util/logger';

import styles from './LandingPage.module.css';
import './global.css';

export interface LandingPageProps {
  className?: string;
  section: EnumSection;
  errorCode?: string;
}

export const comingSoonDataSchema = z.object({
  title: z.string(),
  introduction: z.string(),
});

export type ComingSoonData = z.infer<typeof comingSoonDataSchema>;

export default function LandingPage({ className, section, errorCode }: LandingPageProps) {
  const scrollHasStarted = useScrollHasStarted();
  const [popupOpen, setPopupOpen] = useState(false);

  const popUpData = useSanity(
    `*[slug.current == "releasing-soon"][0]`,
    (data): data is ComingSoonData => {
      comingSoonDataSchema.parse(data);
      return true;
    }
  );

  useEffect(() => {
    setPopupOpen(localStorage.getItem('popupOpen') === null);
  }, []);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, [section]);

  const handleClose = () => {
    localStorage.setItem('popupOpen', 'false');
    setPopupOpen(false);
  };

  return (
    <>
      <div className={classNames(className, styles.landingPage)}>
        <Menu scrollHasStarted={scrollHasStarted} section={section} />
        <Hero section={section} />
        {/* <PaddedBlock>{renderSection(section)}</PaddedBlock> */}
        <VerticalSpace height="30px" />
        {/* <FooterPanel /> */}
        {errorCode && <AcceptInviteErrorDialog errorCode={errorCode} />}
      </div>

      <Modal open={popupOpen && !!popUpData} onCancel={handleClose} footer={null}>
        <div>
          {popUpData?.title}
          {popUpData?.introduction}
        </div>
      </Modal>

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
    case EnumSection.Resources:
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
