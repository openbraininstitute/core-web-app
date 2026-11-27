'use client';

import { useEffect, useState } from 'react';

import type { RefObject } from 'react';

function luminance(red: number, green: number, blue: number) {
  const linear = [red, green, blue].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Sample only the visual behind the menu, updating as the page or a background movie moves. */
export function useHeaderContrast(trigger: RefObject<HTMLElement | null>) {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const update = () => {
      const button = trigger.current;
      if (!button || document.visibilityState === 'hidden') return;
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const visual = document
        .elementsFromPoint(x, y)
        .map((element) => element.closest('[data-header-media]'))
        .find(Boolean);
      const media =
        visual &&
        Array.from(visual.querySelectorAll<HTMLImageElement | HTMLVideoElement>('img, video'))
          .reverse()
          .find(
            (element) =>
              Number(getComputedStyle(element).opacity) > 0.1 &&
              (element instanceof HTMLVideoElement
                ? element.readyState >= 2
                : element.complete && element.naturalWidth > 0)
          );
      if (!media) {
        setLight(false);
        return;
      }
      const bounds = media.getBoundingClientRect();
      const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
      const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
      if (!width || !height || !bounds.width || !bounds.height) return;
      const scale = Math.max(bounds.width / width, bounds.height / height);
      const sourceX = (x - bounds.left - (bounds.width - width * scale) / 2) / scale;
      const sourceY = (y - bounds.top - (bounds.height - height * scale) / 2) / scale;
      try {
        canvas.width = 12;
        canvas.height = 6;
        context.fillStyle = 'white';
        context.fillRect(0, 0, 12, 6);
        context.drawImage(
          media,
          sourceX - rect.width / scale / 2,
          sourceY - rect.height / scale / 2,
          rect.width / scale,
          rect.height / scale,
          0,
          0,
          12,
          6
        );
        const pixels = context.getImageData(0, 0, 12, 6).data;
        let brightness = 0;
        for (let i = 0; i < pixels.length; i += 4)
          brightness += luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
        brightness /= pixels.length / 4;
        const navy = luminance(0, 39, 102);
        const navyContrast =
          (Math.max(brightness, navy) + 0.05) / (Math.min(brightness, navy) + 0.05);
        setLight(1.05 / (brightness + 0.05) > navyContrast);
      } catch {
        setLight(false);
      }
    };
    update();
    const timer = window.setInterval(update, 400);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [trigger]);
  return light;
}
