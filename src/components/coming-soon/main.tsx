'use client';

import { EnumSection } from '@/components/LandingPage/sections/sections';
import { classNames } from '@/util/utils';
import { useSanityContentForHero } from '../LandingPage/content';

export default function Main() {
  const { title, content } = useSanityContentForHero(EnumSection.ComingSoon);

  return (
    <div className="animate-fade-in mt-24 mb-3 md:mt-0 md:mb-6">
      <h1
        className={classNames(
          'mb-2 font-serif font-bold tracking-[0.040em] select-none md:mb-4',
          'text-4xl text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl',
        )}
      >
        {title}
      </h1>
      <p
        className={classNames(
          'mx-auto mr-4 max-w-3xl font-medium select-none',
          'text-lg text-white sm:text-left md:text-xl md:text-balance',
          'leading-6 md:leading-7',
        )}
      >
        {content}
      </p>
    </div>
  );
}
