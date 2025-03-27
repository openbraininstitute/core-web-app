'use client';

import Link from 'next/link';

import { PaperLitteratureProps } from '../../../type';

import { CopyIcon, LinkIcon } from '../../../icon/ArticlesIcons';

import CalendarIcon from '@/components/icons/Calendar';

export default function SingleArticleCard({ content }: { content: PaperLitteratureProps }) {
  const copyDOI = () => {
    navigator.clipboard.writeText(content.doi);
  };

  return (
    <div className="relative flex w-full flex-col text-primary-8">
      <header className="flex w-full flex-row">
        <div className="mb-2 w-3/4 text-xl font-bold">{content.title}</div>
        <div className="flex w-1/4 flex-row justify-end gap-x-8 text-base font-light">
          <Link href={content.link} target="_blank" className="flex flex-row items-center">
            <LinkIcon iconColor="#003A8C" />
            <span className="ml-2 block">Link</span>
          </Link>
          <button
            type="button"
            aria-label="Copy the article's DOI"
            onClick={copyDOI}
            className="flex flex-row items-center"
          >
            <CopyIcon iconColor="#003A8C" />
            <span className="ml-2 block">Copy DOI</span>
          </button>
        </div>
      </header>

      <div className="relative -top-2 flex w-full flex-row gap-x-4 text-base font-light">
        <div className="flex flex-row">
          {content.authors.map((author: string) => {
            return (
              <div key={`publication_author-${author}`} className="mr-2">
                {author}
              </div>
            );
          })}
        </div>
        <div className="flex flex-row items-center gap-x-1">
          <CalendarIcon className="relative top-px" />
          <div>{content.publicationDate}</div>
        </div>
      </div>

      <p className="mt-2 bg-gray-100 p-6 text-base font-light leading-normal">{content.abstract}</p>
    </div>
  );
}
