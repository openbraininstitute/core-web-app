'use client';

import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { useSanityForSingleTutorial } from '@/components/documentation/tutorials/fetch-single-tutorial';
import SliderTimestamps from '@/components/documentation/tutorials/slider-timestamps';
import TextContentBloc from '@/components/documentation/tutorials/TextContentBloc';
import TutorialVideo from '@/components/documentation/tutorials/tutorial-video';

import type { VideoHandle } from '@/util/play-video-at-time';

export default function SingleTutorialContent() {
  const params = useParams();
  const slug = params.slug as string;

  const videoRef = useRef<VideoHandle>(null!);
  const [videoTime, setVideoTime] = useState<number>(0);

  const content = useSanityForSingleTutorial({ slug });

  if (!content) {
    return (
      <div className="text-primary-9 container mx-auto p-4">
        <h1 className="text-3xl font-bold">Tutorial Not Found</h1>
        <p>The tutorial with slug &quot;{slug}&quot; could not be found or is still loading.</p>
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col">
      <header className="text-primary-9 mb-4 w-full">
        <div className="text-base font-normal tracking-wider uppercase">Tutorial</div>
        <h1 className="text-3xl font-bold">{content.title}</h1>
      </header>
      <div className="mb-4 w-full">
        <TutorialVideo url={content.url} videoRef={videoRef} onTime={setVideoTime} />
      </div>
      {(content.steps?.length ?? 0) > 0 && (
        <SliderTimestamps
          content={content.steps ?? []}
          videoTime={videoTime}
          setVideoTime={setVideoTime}
          videoRef={videoRef}
        />
      )}
      <TextContentBloc content={content} />
    </div>
  );
}
