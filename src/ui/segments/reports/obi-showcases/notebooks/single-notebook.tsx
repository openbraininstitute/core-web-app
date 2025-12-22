'use client';

import { PortableText } from 'next-sanity';
import { useState } from 'react';

import { NotebooksProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

import { ChevronRight, ReadMeIcon } from '@/components/icons';

import { classNames } from '@/util/utils';

import styles from '@/ui/segments/reports/obi-showcases/notebooks/notebook.module.css';

export default function SingleNotebook({
  content,
  index,
}: {
  content: NotebooksProps;
  index: number;
}) {
  const [readMeOpen, setReadMeOpen] = useState(false);

  return (
    <div className="relative flex w-full flex-col items-start">
      <header className="text-primary-9 relative flex w-full flex-row items-center justify-between">
        <div className="flex w-full flex-col">
          <div className="flex flex-row items-center text-base font-normal">
            {index + 1 < 10 ? '0' : ''}
            {index + 1}
          </div>
          <div className="w-full text-3xl leading-[1.3] font-bold hyphens-auto">{content.name}</div>
        </div>
        {content.url && (
          <a
            href={content.url}
            className="border-primary-9 hover:bg-primary-9 rounded-full border border-solid px-6 py-3 text-lg whitespace-nowrap transition-colors duration-300 hover:text-white"
            target="_blank"
          >
            View Notebook
          </a>
        )}
      </header>

      <div className="my-3 h-px w-full bg-gray-200" />

      <div className="flex flex-row gap-x-16">
        <div>
          <div className="text-sm tracking-wider text-gray-400 uppercase">Scale</div>
          <div className="text-primary-9 text-xl">{content.scale}</div>
        </div>
        <div>
          <div className="text-sm tracking-wider text-gray-400 uppercase">Object of interest</div>
          <div className="text-primary-9 text-xl">{content.objectOfInterest}</div>
        </div>
        <div>
          <div className="text-sm tracking-wider text-gray-400 uppercase">Author(s)</div>
          <div className="text-primary-9 text-xl">{content.authors}</div>
        </div>
      </div>
      <div className="my-3 h-px w-full bg-gray-200" />
      <div className="flex w-full flex-col items-start">
        <div>
          <div className="mt-2 text-sm font-normal tracking-wider text-gray-400 uppercase">
            Description
          </div>
          <div className="text-primary-9 text-xl leading-normal font-normal">
            {content.description}
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Open read-me block"
            onClick={() => setReadMeOpen(!readMeOpen)}
            className="shadow-skeumorphic mt-6 flex w-full flex-row justify-between rounded-full border border-solid border-gray-300 px-5 py-3"
          >
            <div className="text-primary-9 flex flex-row items-center text-lg font-normal">
              <ReadMeIcon iconColor="#A6A6A6" className="mr-2 h-4 w-auto tracking-wide uppercase" />
              Read me
            </div>
            <div className="ml-10">
              <ChevronRight
                fill="#002766"
                className={classNames(
                  'relative top-2 transition-transform duration-300 ease-in-out',
                  readMeOpen ? 'rotate-90' : 'rotate-0'
                )}
              />
            </div>
          </button>
          {readMeOpen && (
            <div className={styles.readMeParagraph}>
              <PortableText value={content.readMe} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
