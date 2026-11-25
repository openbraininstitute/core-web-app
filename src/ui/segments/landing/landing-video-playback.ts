/** A single decoder for the featured model. Thumbnails remain posters.
 * No media URL is assigned until idle; switching releases the preceding download. */
export function createLandingPlayback(
  models: readonly { video?: string; preview?: string }[],
  onReady: () => void
) {
  let enabled = false;
  let disposed = false;
  let currentIndex = -1;
  let source: string | undefined;
  let video: HTMLVideoElement | null = null;
  let pending = false;
  const enable = () => {
    if (disposed) return;
    enabled = true;
    onReady();
  };
  const idle = typeof window.requestIdleCallback === 'function';
  const timer = idle
    ? window.requestIdleCallback(enable, { timeout: 1500 })
    : window.setTimeout(enable, 800);
  const release = () => {
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    video = null;
    source = undefined;
    currentIndex = -1;
    pending = false;
  };
  return {
    get(index: number) {
      return index === currentIndex ? video : null;
    },
    update(index: number, visible: boolean, full = false) {
      const model = models[index];
      const url = full ? model?.video : (model?.preview ?? model?.video);
      if (!enabled || disposed || !visible || !url) {
        release();
        return null;
      }
      if (source !== url) {
        release();
        currentIndex = index;
        source = url;
        video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'none';
        video.src = url;
      }
      const playing = video;
      if (playing?.paused && !pending) {
        pending = true;
        void playing
          .play()
          .catch(() => {})
          .finally(() => {
            if (video === playing) pending = false;
          });
      }
      return video;
    },
    dispose() {
      disposed = true;
      if (idle) window.cancelIdleCallback(timer);
      else window.clearTimeout(timer);
      release();
    },
  };
}
