'use client';

import { PortableText } from 'next-sanity';
import { useState } from 'react';
import { ContentForSingleTutorial } from './fetch-single-tutorial';

import { classNames } from '@/util/utils';
import styles from './text-content-bloc.module.css';

export default function TextContentBloc({
  content,
}: {
  content: ContentForSingleTutorial | null | undefined;
}) {
  const [transcriptVisible, setTranscriptVisible] = useState<boolean>(false);

  if (!content) {
    return null;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        aria-label="Show transcript"
        onClick={() => setTranscriptVisible(!transcriptVisible)}
        className="border-primary-6 transition-height flex w-1/3 flex-row items-center justify-between rounded-lg border border-solid px-6 py-4 text-white duration-300 ease-in-out"
      >
        <h3 className="text-xl font-bold">Transcript</h3>
        <div className="text-base font-normal">
          {transcriptVisible ? (
            <span className="text-primary-3">Hide transcript</span>
          ) : (
            <span className="text-primary-3">View full transcript</span>
          )}
        </div>
      </button>
      <div
        className={classNames(
          styles.transcript,
          'transition-height overflow-hidden duration-300 ease-in-out',
          transcriptVisible ? 'h-auto' : 'h-0'
        )}
      >
        <PortableText value={content.transcript ?? []} />
      </div>
    </div>
  );
}
