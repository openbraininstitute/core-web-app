'use client';

import { useEffect, useState } from 'react';

import { fromPost, type Post, transmitterUrl } from '@/features/learn/transmitter-api';

import type { FeedItem } from '@/features/learn/feed-item';

/** The Transmitter's articles matching what was typed, searched across its archive; the latest
 * (`initial`, from the server) when nothing is. */
export function useTransmitter(initial: FeedItem[], words: string) {
  const [found, setFound] = useState<FeedItem[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  useEffect(() => {
    const q = words.trim();
    if (!q) {
      setFound(null);
      setState('idle');
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      setState('loading');
      fetch(transmitterUrl(60, q), { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((posts: Post[]) => {
          setFound(posts.map(fromPost));
          setState('idle');
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setState('failed');
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [words]);
  return { items: found ?? initial, state };
}
