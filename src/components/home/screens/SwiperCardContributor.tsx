import Link from 'next/link';

import { ContributorProps } from '@/constants/home/contributors-list';

export default function SwiperCardContributor({ content }: { content: ContributorProps }) {
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
    <div className="relative flex w-[50vw] flex-col gap-y-2">
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
