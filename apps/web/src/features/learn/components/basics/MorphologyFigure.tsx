'use client';

/**
 * Figure: three very different neuron shapes, and a focus view of the axon
 * initial segment. Non-interactive on purpose — it is a picture, not a model.
 */

import { useMemo } from 'react';

import {
  buildMorphology,
  drawMorphology,
  fitMorphology,
  type MorphKind,
} from '@/features/learn/lib/basics/morphologies';
import { FONT, fillPanel, MONO } from '@/features/learn/lib/basics/soma';

import { useCanvasFrame } from './useCanvasFrame';

const GALLERY: MorphKind[] = ['pyramidal', 'interneuron', 'purkinje'];

export default function MorphologyFigure({ mode = 'gallery' }: { mode?: 'gallery' | 'ais' }) {
  const morphs = useMemo(() => GALLERY.map((k) => buildMorphology(k)), []);

  const canvasRef = useCanvasFrame((ctx, w, h) => {
    fillPanel(ctx, w, h);

    if (mode === 'gallery') {
      const colW = w / 3;
      morphs.forEach((m, i) => {
        const box = { x: colW * i, y: 6, w: colW, h: h - 46 };
        const f = fitMorphology(m, box, 12);
        drawMorphology(ctx, m, f);

        ctx.font = `500 12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(m.label, colW * (i + 0.5), h - 34);
        ctx.font = `10px ${MONO}`;
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.fillText(m.region, colW * (i + 0.5), h - 18);

        if (i > 0) {
          ctx.strokeStyle = 'rgba(148,163,184,0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(colW * i, 10);
          ctx.lineTo(colW * i, h - 40);
          ctx.stroke();
        }
      });
      return;
    }

    // --- AIS focus: whole cell on the left, zoom on the right ---
    const m = morphs[0];
    const leftW = Math.min(w * 0.42, 260);
    const f = fitMorphology(m, { x: 0, y: 6, w: leftW, h: h - 30 }, 14);
    drawMorphology(ctx, m, f, { dim: true, highlightAis: true });

    // marker box around the initial segment
    const ax = f.tx(m.ais.x);
    const ay = f.ty(m.ais.y);
    ctx.strokeStyle = 'rgba(251,146,60,0.8)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(ax, ay, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // zoomed panel
    const zx = leftW + 24;
    const zw = Math.max(60, w - zx - 12);
    const zoom = Math.min(3.4, zw / 90);
    ctx.save();
    ctx.beginPath();
    ctx.rect(zx, 10, zw, h - 40);
    ctx.clip();
    const zf = {
      s: f.s * zoom,
      ox: 0,
      oy: 0,
      tx: (x: number) => zx + zw * 0.35 + (x - m.ais.x) * f.s * zoom,
      ty: (y: number) => (h - 30) * 0.5 + (y - m.ais.y) * f.s * zoom,
    };
    drawMorphology(ctx, m, zf, { highlightAis: true });
    ctx.restore();

    // annotation
    ctx.strokeStyle = 'rgba(251,146,60,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax + 16, ay);
    ctx.lineTo(zx - 6, (h - 30) * 0.5);
    ctx.stroke();

    ctx.font = `600 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fdba74';
    ctx.fillText('axon initial segment', zx, h - 44);
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.fillText('where the spike is triggered and sent on', zx, h - 26);
  });

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-xl border border-slate-800 ${mode === 'gallery' ? 'h-[300px]' : 'h-[260px]'}`}
    />
  );
}
