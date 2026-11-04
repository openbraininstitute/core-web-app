'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useSanityForSingleTutorial } from '@/components/documentation/tutorials/fetch-single-tutorial';
import SliderTimestamps from '@/components/documentation/tutorials/slider-timestamps';
import TextContentBloc from '@/components/documentation/tutorials/TextContentBloc';
import YouTubePlayer from '@/components/documentation/tutorials/youtube-player';
import { useSanityContentForTutorialsList } from '@/components/tutorials-carrousel/hooks';
import TutorialCard from '@/ui/segments/help/tutorials/tutorial-card';
import { parseYouTubeId } from '@/utils/youtube';

import type { TutorialProps } from '@/components/documentation/type';
import type { VideoHandle } from '@/util/play-video-at-time';

export default function TutorialContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tutorialSlug = searchParams.get('tutorial');

  const tutorials = useSanityContentForTutorialsList();

  const content =
    tutorials && !Array.isArray(tutorials) && 'tutorialOrder' in tutorials
      ? tutorials.tutorialOrder
      : [];

  const effectiveTutorialSlug = tutorialSlug || (content.length > 0 ? content[0].slug : '');

  useEffect(() => {
    if (!tutorialSlug && content.length > 0) {
      const firstTutorial = content[0];
      const params = new URLSearchParams(searchParams.toString());
      params.set('tutorial', firstTutorial.slug);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialSlug, content.length]);

  const singleTutorial = useSanityForSingleTutorial({ slug: effectiveTutorialSlug });

  const videoRef = useRef<VideoHandle>(null!);
  const [videoTime, setVideoTime] = useState<number>(0);

  if (effectiveTutorialSlug && singleTutorial) {
    const youTubeId = parseYouTubeId(singleTutorial.url);
    return (
      <div className="text-primary-9 no-scrollbar col-span-3 flex max-h-[82vh] w-full flex-col items-start gap-y-4 overflow-y-scroll">
        <div className="relative flex w-full flex-col">
          <header className="mb-4 w-full">
            <div className="text-base font-normal tracking-wider uppercase">Tutorial</div>
            <h1 className="text-3xl font-bold">{singleTutorial.title}</h1>
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
              <p>Video URL not available.</p>
            )}
          </div>
          {(singleTutorial.steps?.length ?? 0) > 0 && (
            <div className="mb-4 w-full">
              <SliderTimestamps
                content={singleTutorial.steps ?? []}
                videoTime={videoTime}
                setVideoTime={setVideoTime}
                videoRef={videoRef}
              />
            </div>
          )}
          {singleTutorial.transcript && (
            <div className="w-full">
              <TextContentBloc content={singleTutorial} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary-9 no-scrollbar col-span-3 flex max-h-[82vh] w-full flex-col items-start gap-y-4 overflow-y-scroll">
      {content.map((value: TutorialProps) => (
        <TutorialCard key={value.url || value.slug} content={value} />
      ))}
    </div>
  );
}
