'use client';

import { useEffect } from 'react';

import type { RefObject } from 'react';

const SAMPLE_WIDTH = 160;

function luminance(red: number, green: number, blue: number) {
  const linear = [red, green, blue].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Sample the displayed media and its readability overlay, without reading a full-size video frame. */
export function useArrowContrast(
  rootRef: RefObject<HTMLElement | null>,
  index: number,
  suspended: boolean
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || suspended) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    function update() {
      if (!root || !context) return;
      const media = root.querySelector<HTMLImageElement | HTMLVideoElement>(
        `[data-tour-slide="${index}"] video, [data-tour-slide="${index}"] img`
      );
      if (!media) return;
      const sourceWidth = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
      const sourceHeight =
        media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
      if (!sourceWidth || !sourceHeight) return;

      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const scale = SAMPLE_WIDTH / bounds.width;
      canvas.width = SAMPLE_WIDTH;
      canvas.height = Math.max(1, Math.round(bounds.height * scale));
      context.fillStyle = '#f8fafc';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const mediaBounds = media.getBoundingClientRect();
      const mediaStyle = getComputedStyle(media);
      let width = mediaBounds.width;
      let height = mediaBounds.height;
      if (mediaStyle.objectFit === 'cover' || mediaStyle.objectFit === 'contain') {
        const ratio = (mediaStyle.objectFit === 'cover' ? Math.max : Math.min)(
          width / sourceWidth,
          height / sourceHeight
        );
        width = sourceWidth * ratio;
        height = sourceHeight * ratio;
      }
      const position = mediaStyle.objectPosition.split(' ').map((value) => parseFloat(value) / 100);
      const left = mediaBounds.left - bounds.left + (mediaBounds.width - width) * position[0];
      const top = mediaBounds.top - bounds.top + (mediaBounds.height - height) * position[1];

      try {
        context.drawImage(media, left * scale, top * scale, width * scale, height * scale);

        const style = getComputedStyle(root);
        const fraction = (name: string) => parseFloat(style.getPropertyValue(name)) / 100;
        const centerX = fraction('--overlay-center-x') * canvas.width;
        const centerY = fraction('--overlay-center-y') * canvas.height;
        const radiusX = fraction('--overlay-radius-x') * canvas.width;
        const radiusY = fraction('--overlay-radius-y') * canvas.height;
        context.save();
        context.translate(centerX, centerY);
        context.scale(radiusX, radiusY);
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
        const overlay = getComputedStyle(root, '::after').backgroundImage;
        for (const match of overlay.matchAll(/(rgba?\([^)]+\))\s+([\d.]+)%/g)) {
          gradient.addColorStop(Number(match[2]) / 100, match[1]);
        }
        context.fillStyle = gradient;
        context.fillRect(
          -centerX / radiusX,
          -centerY / radiusY,
          canvas.width / radiusX,
          canvas.height / radiusY
        );
        context.restore();

        const blue = style.getPropertyValue('--blue').trim() || '#183f8b';
        context.fillStyle = blue;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blueChannel] = context.getImageData(0, 0, 1, 1).data;
        const darkLuminance = luminance(red, green, blueChannel);
        for (const arrow of root.querySelectorAll<HTMLElement>('[data-tour-arrow]')) {
          const rect = arrow.getBoundingClientRect();
          const x = Math.max(
            0,
            Math.min(
              canvas.width - 1,
              Math.round((rect.left + rect.width / 2 - bounds.left) * scale)
            )
          );
          const y = Math.max(
            0,
            Math.min(
              canvas.height - 1,
              Math.round((rect.top + rect.height / 2 - bounds.top) * scale)
            )
          );
          const [r, g, b] = context.getImageData(x, y, 1, 1).data;
          const background = luminance(r, g, b);
          const darkContrast =
            (Math.max(background, darkLuminance) + 0.05) /
            (Math.min(background, darkLuminance) + 0.05);
          const lightContrast = 1.05 / (background + 0.05);
          arrow.dataset.tone = lightContrast > darkContrast ? 'light' : 'dark';
        }
      } catch {
        // Keep the CSS fallback when media cannot be sampled (for example, cross-origin assets).
      }
    }

    update();
    const timer = window.setInterval(update, 400);
    return () => window.clearInterval(timer);
  }, [rootRef, index, suspended]);
}
