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
    <div>
      <button
        type="button"
        aria-label="Show transcript"
        onClick={() => setTranscriptVisible(!transcriptVisible)}
        className="boder-solid mb-3 mt-4 flex w-full flex-row items-center justify-between rounded-lg border border-primary-5 px-6 py-4 text-white transition-height duration-300 ease-in-out"
      >
        <h3 className="text-xl font-bold">Transcript</h3>
        <div className="text-base font-normal">View full transcript</div>
      </button>
      <div
        className={classNames(
          styles.transcript,
          'overflow-hidden transition-height duration-300 ease-in-out',
          transcriptVisible ? 'h-auto' : 'h-0'
        )}
      >
        <PortableText value={content.transcript ?? []} />
      </div>
    </div>
  );
}
