'use client';

import { useSanityContentForHero } from '../LandingPage/content';
import { EnumSection } from '../LandingPage/sections/sections';

export default function Main() {
  const { title, content } = useSanityContentForHero(EnumSection.ComingSoon);

  return (
    <div className="mb-6 animate-fade-in">
      <h1 className="mb-4 select-none font-serif text-4xl font-bold tracking-[0.040em] text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
        {title}
      </h1>
      <p className="mx-auto mr-4 max-w-3xl select-none text-justify text-lg font-medium text-white sm:text-left md:text-xl">
        {content}
      </p>
    </div>
  );
}
