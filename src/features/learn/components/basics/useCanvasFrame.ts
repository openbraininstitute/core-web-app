'use client';

import { useEffect, useRef } from 'react';

type FrameDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, now: number) => void;

/**
 * Attaches a device-pixel-ratio aware requestAnimationFrame loop to a canvas.
 * The draw callback is kept in a ref so it always sees the latest props without
 * restarting the loop.
 */
export function useCanvasFrame(draw: FrameDraw) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const c = canvasRef.current;
      if (!c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      // its laid-out size, not its size on screen: the same but where it is scaled, as the Learn
      // page's small pictures scale a figure down, and it should still be drawn at the size laid out
      const w = Math.max(1, c.offsetWidth);
      const h = Math.max(1, c.offsetHeight);
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h, now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return canvasRef;
}
