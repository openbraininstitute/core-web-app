'use client';

import { useState } from 'react';

import { Skeleton } from '@/ui/molecules/skeleton';

export function VideoPlayer({ url }: { url?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);

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
        playsInline
        autoPlay
        controls
        className="h-full w-full rounded-xl border border-solid  object-contain"
        src={url}
        onLoadedData={() => setIsLoaded(true)}
      >
        <track kind="captions" srcLang="en" label="English captions" />
      </video>
    </>
  );
}
