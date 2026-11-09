'use client';

import { type Ref, useEffect, useEffectEvent, useImperativeHandle, useRef, useState } from 'react';

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
          playerVars: Record<string, number | string>;
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
  apiReady ??= new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      // dropped so the next player retries instead of reusing the failure
      apiReady = null;
      script.remove();
      reject(new Error('YouTube IFrame API failed to load'));
    };
    document.head.append(script);
  });
  return apiReady;
}

/** IFrame-API player (not a bare iframe) so tutorial steps can read and seek the time. */
export default function YouTubePlayer({
  id,
  handleRef,
  onTime,
  onPlay,
  className,
}: {
  id: string;
  handleRef?: Ref<VideoHandle>;
  onTime?: (seconds: number) => void;
  onPlay?: () => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  // a step clicked before onReady, applied once the player exists
  const pendingSeek = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  const emitTime = useEffectEvent((seconds: number) => onTime?.(Math.floor(seconds)));
  const emitPlay = useEffectEvent(() => onPlay?.());

  useImperativeHandle(
    handleRef,
    () => ({
      get currentTime() {
        return player.current?.getCurrentTime() ?? pendingSeek.current ?? 0;
      },
      set currentTime(seconds: number) {
        if (player.current) player.current.seekTo(seconds, true);
        else pendingSeek.current = seconds;
      },
      play: () => player.current?.playVideo(),
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let yt: YTPlayer | undefined;
    pendingSeek.current = null;
    // a new video starts at 0; the API reports nothing until it plays
    emitTime(0);
    // the API swaps this node for an iframe, so React must not own it
    const mount = document.createElement('div');
    container.current?.append(mount);

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !window.YT) return;
        setFailed(false);
        yt = new window.YT.Player(mount, {
          videoId: id,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          // loop needs the playlist set to the same video
          playerVars: { playsinline: 1, rel: 0, loop: 1, playlist: id },
          events: {
            onReady: () => {
              player.current = yt ?? null;
              if (pendingSeek.current !== null) {
                yt?.seekTo(pendingSeek.current, true);
                yt?.playVideo();
                pendingSeek.current = null;
              }
            },
            // no timeupdate event: emit on every state change (seek, pause, end), poll while playing
            onStateChange: (e) => {
              window.clearInterval(timer);
              emitTime(yt?.getCurrentTime() ?? 0);
              if (e.data === PLAYING) {
                emitPlay();
                timer = window.setInterval(() => emitTime(yt?.getCurrentTime() ?? 0), 500);
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      yt?.destroy();
      player.current = null;
      mount.remove();
    };
  }, [id]);

  return (
    <div ref={container} className={className}>
      {failed && <p className="p-4">Video could not be loaded.</p>}
    </div>
  );
}
