'use client';

import Link from 'next/link';
import { useState } from 'react';

import NavigationContributors from './NavigationContributors';

import { CONTRIBUTORS } from '@/constants/home/content-home';
import { ContributorProps, CONTRIBUTORS_LIST } from '@/constants/home/contributors-list';

import 'swiper/css';

export type LinkListProps = {
  link: string;
  name: string;
};

export function SingleContributorCard({ content }: { content: ContributorProps }) {
  const linkList = [];

  if (content.ORCID !== null) {
    linkList.push({ link: `https://orcid.org/${content.ORCID}`, name: 'ORCID' });
  }

  if (content.google_scholar !== null) {
    linkList.push({
      link: `https://scholar.google.com/citations?user=${content.google_scholar}`,
      name: 'Google Scholar',
    });
  }

  return (
    <div className="relative flex flex-col gap-y-2">
      <div className="relative z-10 font-sans text-3xl font-semibold leading-tight text-white transition-all duration-300 ease-out-expo md:text-xl">
        {content.full_name}
      </div>
      <div className="relative z-20 flex flex-row gap-x-4">
        {content.ORCID !== null && (
          <Link
            href={`https://orcid.org/${content.ORCID}`}
            className="flex h-12 items-center justify-center bg-primary-8 px-8 text-lg uppercase text-white md:h-10 md:px-4 md:text-sm"
            target="_blank"
          >
            ORCID
          </Link>
        )}
        {content.google_scholar !== null && (
          <Link
            href={`https://scholar.google.com/citations?user=${content.google_scholar}`}
            className="whitespace-nowraps flex h-12 items-center justify-center bg-primary-8 px-8 text-lg uppercase text-white md:h-10 md:px-4 md:text-sm"
            target="_blank"
          >
            Google Scholar
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ScreenContributors() {
  const [selectedLetter, setSelectedLetter] = useState<string>('A');

  const filteredContributors = CONTRIBUTORS_LIST.filter(
    (contributor: ContributorProps) => contributor.last_name[0] === selectedLetter
  );

  return (
    <div className="relative flex min-h-screen w-screen snap-start snap-always flex-col items-center gap-y-6 pb-56 pt-[24vh]">
      <div className="flex w-full grid-cols-2 flex-col gap-x-6 gap-y-3.5 px-8 font-title md:grid md:px-[16vw]">
        <h3 className="text-5xl font-bold text-white md:text-7xl">{CONTRIBUTORS.title}</h3>
        <h4 className="text-3xl font-normal text-primary-2 md:text-4xl">{CONTRIBUTORS.subtitle}</h4>
      </div>
      <div className="relative mt-8 flex w-full flex-col gap-y-12 px-0 md:mt-32 md:px-[16vw]">
        <NavigationContributors
          selectedLetter={selectedLetter}
          setSelectedLetter={setSelectedLetter}
        />
        <div className="relative mt-4 grid w-full grid-cols-1 gap-x-12 gap-y-8 px-6 md:grid-cols-3 md:gap-y-20 md:px-0 lg:grid-cols-4 2xl:grid-cols-5">
          {filteredContributors.map((contributor: ContributorProps, index: number) => (
            <SingleContributorCard
              content={contributor}
              key={`Contributor-${contributor.last_name}_Card_${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
