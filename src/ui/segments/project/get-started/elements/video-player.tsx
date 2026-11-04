'use client';

import { useState } from 'react';

import { Skeleton } from '@/ui/molecules/skeleton';
import { parseYouTubeId, youTubeEmbedUrl } from '@/utils/youtube';

export function VideoPlayer({ url, title }: { url?: string; title?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const id = parseYouTubeId(url);

  if (!id) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary-9">
        <p className="text-white text-lg">No video selected</p>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && <Skeleton className="absolute inset-0 rounded-xl bg-primary-9" />}
      <iframe
        key={id}
        className="h-full w-full rounded-xl"
        src={youTubeEmbedUrl(id, true)}
        title={title ?? 'Tutorial video'}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        onLoad={() => setIsLoaded(true)}
      />
    </>
  );
}
