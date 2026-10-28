import { backgroundIsDark } from '@/features/scan-config/components/color-by/contrast';

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
 * Download the viewer's frame, a 2D canvas of its own, as a PNG with the "Open Brain Institute" watermark drawn on
 * it; the object URL is revoked after the download starts.
 */
export function downloadCircuitImage(
  frame: HTMLCanvasElement,
  name: string,
  backgroundColor: string
): void {
  const filename = `${(name || 'circuit').replace(/[^\w.-]+/g, '_')}.png`;
  const ctx = frame.getContext('2d');
  if (ctx) drawWatermark(ctx, frame.width, frame.height, watermarkColor(backgroundColor));
  frame.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, 'image/png');
}
