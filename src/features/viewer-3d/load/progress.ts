/** Progress at most this often, ms: a message to the page per network chunk would be hundreds. */
const PROGRESS_MS = 100;

export type OnProgress = (received: number, total: number) => void;

/** Progress of a download of `total` bytes told `onProgress` at most every `PROGRESS_MS`, and once more at the end. */
export function throttledProgress(total: number, onProgress?: OnProgress) {
  let reportedAt = 0;
  let reported = 0;
  return {
    report(received: number) {
      const now = performance.now();
      if (now - reportedAt < PROGRESS_MS) return;
      reportedAt = now;
      reported = received;
      onProgress?.(received, total);
    },
    last(received: number) {
      if (reported !== received) onProgress?.(received, total);
    },
  };
}

export type ThrottledProgress = ReturnType<typeof throttledProgress>;
