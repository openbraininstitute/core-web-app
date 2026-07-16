import {
  ScalebarOrientation,
  ScalebarSide,
  ScalebarWhen,
} from '@openbraininstitute/morphoviewer/dist/components/types';

import { backgroundIsDark } from '@/features/scan-config/components/color-by/contrast';

import type { ScalebarConfig } from '@openbraininstitute/morphoviewer/dist/components/types';

/** Scalebar defaults for circuit viewers: right pins + labels always visible. */
export const VERTICAL_SCALEBAR: ScalebarConfig = {
  orientation: ScalebarOrientation.Vertical,
  hiDPI: true,
  margin: { x: 0, y: 10 },
  pins: { left: ScalebarWhen.Never, right: ScalebarWhen.Always },
  labels: { show: ScalebarWhen.Always, side: ScalebarSide.Right },
} as const;

const WATERMARK_TITLE = 'Open Brain Institute';
const WATERMARK_URL = 'www.openbraininstitute.org';
/** primary-8 on light canvas backgrounds */
const WATERMARK_COLOR_LIGHT = '#003a8c';
const WATERMARK_COLOR_DARK = '#ffffff';

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function watermarkColor(backgroundColor: string): string {
  return backgroundIsDark(backgroundColor) ? WATERMARK_COLOR_DARK : WATERMARK_COLOR_LIGHT;
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void {
  const titleSize = Math.max(12, Math.round(height * 0.026));
  const urlSize = Math.max(10, Math.round(titleSize * 0.74));
  const margin = Math.round(titleSize);
  const gap = Math.round(titleSize * 0.3);
  const x = width - margin;

  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = color;

  const drawLine = (text: string, y: number, size: number, weight: number) => {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    ctx.fillText(text, x, y);
  };

  const urlY = height - margin;
  drawLine(WATERMARK_URL, urlY, urlSize, 400);
  drawLine(WATERMARK_TITLE, urlY - urlSize - gap, titleSize, 600);
  ctx.restore();
}

function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * download a viewer-captured image (from `onCapture`) as a watermarked PNG. The
 * captured image is redrawn onto a 2D canvas so the "Open Brain Institute"
 * watermark can be composited on top; object URLs we create are revoked after
 * the download starts.
 */
export function downloadCircuitImage(
  image: HTMLImageElement,
  name: string,
  backgroundColor: string
): void {
  const filename = `${(name || 'circuit').replace(/[^\w.-]+/g, '_')}.png`;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const ctx = width && height ? document.createElement('canvas').getContext('2d') : null;
  if (!ctx) {
    // fall back to the raw capture if a 2D context isn't available
    triggerDownload(image.src, filename);
    setTimeout(() => URL.revokeObjectURL(image.src), 10_000);
    return;
  }

  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  drawWatermark(ctx, width, height, watermarkColor(backgroundColor));
  URL.revokeObjectURL(image.src);

  ctx.canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, 'image/png');
}
