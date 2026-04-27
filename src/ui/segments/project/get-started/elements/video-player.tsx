'use client';

import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/ui/molecules/skeleton';
import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';

export function VideoPlayer({ url }: { url?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const view = useAtomValue(leftPaneViewAtom);

  useEffect(() => {
    if (view !== null) {
      videoRef.current?.pause();
    }
  }, [view]);

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary-9">
        <p className="text-white text-lg">No video selected</p>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && <Skeleton className="absolute inset-0 rounded-xl bg-primary-9" />}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        controls
        className="h-full w-full rounded-xl object-contain"
        src={url}
        onLoadedData={() => setIsLoaded(true)}
      >
        <track kind="captions" srcLang="en" label="English captions" />
      </video>
    </>
  );
}
