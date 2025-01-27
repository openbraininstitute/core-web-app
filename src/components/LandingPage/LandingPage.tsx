'use client';

import React from 'react';

import { useAtom } from 'jotai';
import SectionMain from './sections/SectionHome';
import FooterPanel from './FooterPanel';
import Menu from './Menu';
import SectionInstitute from './sections/SectionInstitute';
import SectionOurMission from './sections/SectionOurMission';
import SectionPricing from './sections/SectionPricing';
import SectionOurTeam from './sections/SectionOurTeam';
import SectionContact from './sections/SectionContact';
import { atomSection, EnumSection } from './sections/sections';
import TermsAndConditions from './sections/TermsAndConditions';
import { classNames } from '@/util/utils';

import styles from './LandingPage.module.css';

export interface LandingPageProps {
  className?: string;
}

export default function LandingPage({ className }: LandingPageProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [section, setSection] = useAtom(atomSection);
  React.useEffect(() => {
    const div = ref.current;
    if (!div) return;

    div.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, [section]);

  return (
    <div className={classNames(className, styles.landingPage)} ref={ref}>
      <Menu />
      {renderSection(section, setSection)}
      <FooterPanel />
    </div>
  );
}

function renderSection(
  section: EnumSection,
  setSection: (section: EnumSection) => void
): React.ReactNode {
  const makeNext = (nextSection: EnumSection) => () => setSection(nextSection);
  switch (section) {
    case EnumSection.Institute:
      return <SectionInstitute onNext={makeNext(EnumSection.OurMission)} />;
    case EnumSection.OurMission:
      return <SectionOurMission />;
    case EnumSection.Pricing:
      return <SectionPricing />;
    case EnumSection.OurTeam:
      return <SectionOurTeam />;
    case EnumSection.Contact:
      return <SectionContact />;
    case EnumSection.TermsAndConditions:
      return <TermsAndConditions />;
    default:
      return <SectionMain />;
  }
}
