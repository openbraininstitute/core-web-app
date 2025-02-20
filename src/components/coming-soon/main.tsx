'use client';

import { useSanityContentForHero } from '../LandingPage/content';
import { classNames } from '@/util/utils';
import { EnumSection } from '@/components/LandingPage/sections/sections';

export default function Main() {
  const { title, content } = useSanityContentForHero(EnumSection.ComingSoon);

  return (
    <div className="mb-6 mt-24 animate-fade-in md:mt-0">
      <h1
        className={classNames(
          'mb-4 select-none font-serif text-3xl font-bold tracking-[0.040em]',
          'text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl'
        )}
      >
        {title}
      </h1>
      <p
        className={classNames(
          'mx-auto mr-4 max-w-3xl select-none text-lg font-medium md:text-justify',
          'text-lg text-white sm:text-left md:text-balance md:text-xl'
        )}
      >
        {content}
      </p>
    </div>
  );
}
