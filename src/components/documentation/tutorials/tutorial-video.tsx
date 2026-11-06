'use client';

import YouTubePlayer from '@/components/documentation/tutorials/youtube-player';
import { parseYouTubeId } from '@/utils/youtube';

import type { RefObject } from 'react';
import type { VideoHandle } from '@/util/play-video-at-time';

/** YouTube link → seekable embed; any other URL → the file player, until Sanity holds only YouTube links. */
export default function TutorialVideo({
  url,
  videoRef,
  onTime,
}: {
  url?: string | null;
  videoRef: RefObject<VideoHandle>;
  onTime: (seconds: number) => void;
}) {
  const youTubeId = parseYouTubeId(url);

  if (youTubeId) {
    return (
      <YouTubePlayer
        id={youTubeId}
        handleRef={videoRef}
        onTime={onTime}
        className="border-primary-7 aspect-video w-full overflow-hidden rounded-lg border border-solid"
      />
    );
  }

  if (!url) return <p className="text-primary-9">Video URL not available.</p>;

  return (
    <video
      playsInline
      loop
      controls
      className="border-primary-7 h-auto w-full rounded-lg border border-solid"
      src={url}
      ref={(el) => {
        if (el) videoRef.current = el;
      }}
      onTimeUpdate={(e) => onTime(Math.floor(e.currentTarget.currentTime))}
    >
      <track kind="captions" srcLang="en" label="English captions" />
    </video>
  );
}
