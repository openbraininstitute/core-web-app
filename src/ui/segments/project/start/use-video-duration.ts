import { useEffect, useState } from 'react';

const durations = new Map<string, number>();

/** "mm:ss" for a duration in seconds. */
export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

/** How long the video at `url` lasts, read from its metadata once per page; null until known. */
export function useVideoDuration(url: string): number | null {
  const [duration, setDuration] = useState<number | null>(() => durations.get(url) ?? null);

  useEffect(() => {
    const known = durations.get(url);
    if (known !== undefined) {
      setDuration(known);
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration)) return;
      durations.set(url, video.duration);
      setDuration(video.duration);
    };
    video.src = url;
    return () => {
      video.onloadedmetadata = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [url]);

  return duration;
}
