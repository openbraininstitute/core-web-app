'use client';

import { type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import type { VideoHandle } from '@/util/play-video-at-time';

type YTPlayer = {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          host: string;
          width: string;
          height: string;
          playerVars: Record<string, number>;
          events: {
            onReady: () => void;
            onStateChange: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;

let apiReady: Promise<void> | null = null;

/** Loads the IFrame API once per page; every player shares the same promise. */
function loadYouTubeApi() {
  apiReady ??= new Promise<void>((resolve) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.append(script);
  });
  return apiReady;
}

/** IFrame-API player (not a bare iframe) so tutorial steps can read and seek the time. */
export default function YouTubePlayer({
  id,
  handleRef,
  onTime,
  className,
}: {
  id: string;
  handleRef: Ref<VideoHandle>;
  onTime: (seconds: number) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);

  useImperativeHandle(
    handleRef,
    () => ({
      get currentTime() {
        return player.current?.getCurrentTime() ?? 0;
      },
      set currentTime(seconds: number) {
        player.current?.seekTo(seconds, true);
      },
      play: () => player.current?.playVideo(),
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let yt: YTPlayer | undefined;
    // the API swaps this node for an iframe, so React must not own it
    const mount = document.createElement('div');
    container.current?.append(mount);

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      yt = new window.YT.Player(mount, {
        videoId: id,
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            player.current = yt ?? null;
          },
          // the API has no timeupdate event: poll only while playing
          onStateChange: (e) => {
            window.clearInterval(timer);
            if (e.data === PLAYING) {
              timer = window.setInterval(() => onTime(Math.floor(yt?.getCurrentTime() ?? 0)), 500);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      yt?.destroy();
      player.current = null;
      mount.remove();
    };
  }, [id, onTime]);

  return <div ref={container} className={className} />;
}
