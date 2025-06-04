'use client';

import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { useSanityForSingleTutorial } from '@/components/documentation/tutorials/fetch-single-tutorial';
import SliderTimestamps from '@/components/documentation/tutorials/slider-timestamps';
import TextContentBloc from '@/components/documentation/tutorials/TextContentBloc';

export default function SingleTutorialPage() {
  const params = useParams();
  const slug = params.slug as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTime, setVideoTime] = useState<number>(0);

  const content = useSanityForSingleTutorial({ slug });

  if (!content) {
    return (
      <div className="container mx-auto p-4 text-white">
        <h1 className="text-3xl font-bold">Tutorial Not Found</h1>
        <p>The tutorial with slug &quot;{slug}&quot; could not be found or is still loading.</p>
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col">
      <header className="mb-4 w-full text-white">
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
          ref={videoRef}
        >
          <track kind="captions" srcLang="en" label="English captions" />
        </video>
      </div>
      {(!content.steps || content.steps.length === 0) && (
        <SliderTimestamps
          content={content.steps ?? []}
          videoTime={videoTime}
          setVideoTime={setVideoTime}
          videoRef={videoRef}
        />
      )}
      {!content.transcript && <TextContentBloc content={content} />}
    </div>
  );
}
