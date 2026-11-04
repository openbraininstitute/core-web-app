'use client';

import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { useSanityForSingleTutorial } from '@/components/documentation/tutorials/fetch-single-tutorial';
import SliderTimestamps from '@/components/documentation/tutorials/slider-timestamps';
import TextContentBloc from '@/components/documentation/tutorials/TextContentBloc';
import YouTubePlayer from '@/components/documentation/tutorials/youtube-player';
import { parseYouTubeId } from '@/utils/youtube';

import type { VideoHandle } from '@/util/play-video-at-time';

export default function SingleTutorialContent() {
  const params = useParams();
  const slug = params.slug as string;

  const videoRef = useRef<VideoHandle>(null!);
  const [videoTime, setVideoTime] = useState<number>(0);

  const content = useSanityForSingleTutorial({ slug });
  const youTubeId = parseYouTubeId(content?.url);

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
        {youTubeId ? (
          <YouTubePlayer
            id={youTubeId}
            handleRef={videoRef}
            onTime={setVideoTime}
            className="border-primary-7 aspect-video w-full overflow-hidden rounded-lg border border-solid"
          />
        ) : (
          <p className="text-primary-9">Video URL not available.</p>
        )}
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
