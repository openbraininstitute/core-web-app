'use client';

import SectionGeneric from '@/components/LandingPage/sections/SectionGeneric';
import PaddingBlock from '@/components/LandingPage/components/PaddedBlock/PaddedBlock';
import Hero from '@/components/LandingPage/layout/Hero/Hero';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { classNames } from '@/util/utils';
import styles from '@/components/LandingPage/LandingPage.module.css';

export default function page() {
  return (
    <div className={classNames(styles.landingPage)}>
      <Hero section={EnumSection.PrivacyPolicy} />
      <PaddingBlock>
        <SectionGeneric section={EnumSection.PrivacyPolicy} />
      </PaddingBlock>
    </div>
  );
}
