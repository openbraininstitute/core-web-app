'use client';

import { RiPlayMiniFill } from '@remixicon/react';
import { useState } from 'react';

import { cn } from '@/utils/css-class';
import { parseYouTubeId, youTubeEmbedUrl } from '@/utils/youtube';

export default function VideoBlocks({
  title,
  value,
}: {
  title: string;
  value: {
    url: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const youTubeId = parseYouTubeId(value.url);

  return (
    <div className="my-4 w-full overflow-hidden rounded-lg border border-neutral-200">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 bg-neutral-50 px-4 py-3 text-left transition-colors hover:bg-neutral-100"
        aria-expanded={isOpen}
      >
        <div className="min-w-0 flex-1 truncate font-bold text-xl">{title}</div>
        <RiPlayMiniFill
          className={cn('shrink-0 text-lg text-red-500', isOpen && 'rotate-90')}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div className="border-t border-neutral-200 bg-neutral-50 p-4">
          {youTubeId ? (
            // mounted only once opened, so closed blocks load nothing from YouTube
            <iframe
              className="aspect-video w-full rounded-lg"
              src={youTubeEmbedUrl(youTubeId)}
              title={title}
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <p>Video URL not available.</p>
          )}
        </div>
      )}
    </div>
  );
}
