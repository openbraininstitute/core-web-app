'use client';

import { useParams } from 'next/navigation';

import { useSanityForSingleTutorial } from '@/components/documentation/tutorials/fetch-single-tutorial';
import { SingleTutorialProps } from '@/components/documentation/type';

export default function SingleTutorialPage() {
  const params = useParams();
  const slug = params.slug as string;

  const content = useSanityForSingleTutorial({ slug }) as SingleTutorialProps;

  return (
    <div className="relative flex w-full flex-col gap-y-6">
      <header className="w-full text-white">
        <div className="text-base font-normal uppercase tracking-wider">Tutorial</div>
        <h1 className="text-3xl font-bold">{content.title}</h1>
      </header>
      <div className="mb-4 w-full">
        <video
          playsInline
          loop
          controls
          className="h-auto w-full rounded-lg border border-solid border-primary-7"
          src={content.url}
        >
          <track kind="captions" srcLang="en" label="English captions" />
        </video>
      </div>
      <div>
        <p className="text-base text-gray-300">{content.description}</p>
      </div>
    </div>
  );
}
