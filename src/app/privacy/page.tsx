'use client';

import Link from 'next/link';

import SectionGeneric from '@/components/LandingPage/sections/SectionGeneric';
import PaddingBlock from '@/components/LandingPage/components/PaddedBlock/PaddedBlock';
import Hero from '@/components/LandingPage/layout/Hero/Hero';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { classNames } from '@/util/utils';

import styles from '@/components/LandingPage/LandingPage.module.css';

export default function page() {
  return (
    <div className={classNames(styles.landingPage)}>
      <div className="relative z-10">
        <div className="absolute top-0 p-[19px] text-white md:p-[19px]">
          <Link href="/" className="max-w-[8em] flex-none font-serif text-[19px]">
            <h2 className="relative text-balance text-right leading-[0.8]">
              Open Brain <br /> Institute
            </h2>
          </Link>
        </div>
      </div>
      <Hero section={EnumSection.PrivacyPolicy} />
      <PaddingBlock>
        <SectionGeneric section={EnumSection.PrivacyPolicy} />
      </PaddingBlock>
      <div className="bg-white px-2 py-2 text-base text-gray-400 md:px-[19px]">
        Copyright &copy; {new Date().getFullYear()} – Open Brain Institute
      </div>
    </div>
  );
}
