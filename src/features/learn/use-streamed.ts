'use client';

import { useEffect, useState } from 'react';

/**
 * What the server streams in after the page: the promise's value once it has come, and `initial`
 * until then, with `pending` saying which. Nothing waits on it, so the rest of the page is there at
 * once; `initial` stands in for a promise that fails.
 */
export function useStreamed<T>(promise: Promise<T>, initial: T): { value: T; pending: boolean } {
  const [settled, setSettled] = useState<{ from: Promise<T>; value: T | undefined }>();
  useEffect(() => {
    let live = true;
    const done = (value?: T) => {
      if (live) setSettled({ from: promise, value });
    };
    promise.then(done, () => done());
    return () => {
      live = false;
    };
  }, [promise]);
  if (settled?.from !== promise) return { value: initial, pending: true };
  return { value: settled.value ?? initial, pending: false };
}
