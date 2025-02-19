'use client';

import SectionGeneric from '@/components/LandingPage/sections/SectionGeneric';
import PaddingBlock from '@/components/LandingPage/components/PaddedBlock/PaddedBlock';
import Hero from '@/components/LandingPage/layout/Hero/Hero';
import LogoAsLink from '@/components/logo/as-link';

import { EnumSection } from '@/components/LandingPage/sections/sections';
import { classNames } from '@/util/utils';
import styles from '@/components/LandingPage/LandingPage.module.css';

export default function page() {
  return (
    <div className={classNames(styles.landingPage)}>
      <div className="relative z-10">
        <div className="absolute top-0 px-6 py-8 text-white md:px-12">
          <LogoAsLink type="svg" />
        </div>
      </div>
      <Hero section={EnumSection.PrivacyPolicy} />
      <PaddingBlock>
        <SectionGeneric section={EnumSection.PrivacyPolicy} />
      </PaddingBlock>
    </div>
  );
}
