'use client';

/**
 * Widget 1 — charge separation across the soma membrane makes the voltage.
 *
 * The user moves a number of ions across the membrane; the widget shows the
 * resulting potential V = Q/C, and how absurdly small that charge is compared
 * with the ions already dissolved inside the cell.
 */

import { useState } from 'react';

import Slider from '@/features/learn/components/ui/Slider';
import {
  drawIon,
  drawSign,
  drawSoma,
  FONT,
  fillPanel,
  ION_COLORS,
  MONO,
  mulberry32,
  roundRect,
} from '@/features/learn/lib/basics/soma';
import {
  capacitance,
  chargeFromIons,
  ionCount,
  sphereAreaCm2,
  sphereVolumeL,
  voltageFromChargeMv,
} from '@/features/learn/lib/biophysics/membrane';
import { raised } from '@/features/learn/lib/theme';

import { useCanvasFrame } from './useCanvasFrame';

/** Scattered interior ions, fixed once so they do not jitter. */
const SCATTER = (() => {
  const rnd = mulberry32(7);
  return Array.from({ length: 90 }, () => {
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd());
    return { a, rr, kind: rnd() < 0.55 ? 'K' : rnd() < 0.6 ? 'Na' : 'A' };
  });
})();

export default function ChargeWidget() {
  const [millionIons, setMillionIons] = useState(-5);
  const [diamUm, setDiamUm] = useState(20);

  const area = sphereAreaCm2(diamUm);
  const cap = capacitance(area); // F
  const charge = chargeFromIons(millionIons * 1e6); // C
  const vm = voltageFromChargeMv(charge, cap);
  const kInside = ionCount(140, sphereVolumeL(diamUm));
  const fraction = Math.abs(millionIons * 1e6) / kInside;

  const canvasRef = useCanvasFrame((ctx, w, h) => {
    fillPanel(ctx, w, h);
    const L = { cx: w * 0.42, cy: h / 2, r: Math.min(h / 2 - 28, w * 0.3) };
    drawSoma(ctx, L, vm);

    // dissolved ions: the bulk solution stays electrically neutral
    const inner = L.r - 7;
    for (const s of SCATTER) {
      const rr = 0.18 + s.rr * 0.72;
      const x = L.cx + Math.cos(s.a) * inner * rr;
      const y = L.cy + Math.sin(s.a) * inner * rr;
      const label = s.kind === 'A' ? '−' : '+';
      const color = s.kind === 'K' ? ION_COLORS.K : s.kind === 'Na' ? ION_COLORS.Na : ION_COLORS.A;
      drawIon(ctx, x, y, 3.4, label, color, 0.5);
      void label;
    }

    // the charge layers hugging the two faces of the membrane, spread evenly
    const nSigns = Math.min(34, Math.round(Math.abs(vm) / 3.2));
    const insideNegative = vm < 0;
    for (let i = 0; i < nSigns; i++) {
      const a = -Math.PI / 2 + (i / nSigns) * Math.PI * 2;
      const inX = L.cx + Math.cos(a) * (L.r - 12);
      const inY = L.cy + Math.sin(a) * (L.r - 12);
      const outX = L.cx + Math.cos(a) * (L.r + 6);
      const outY = L.cy + Math.sin(a) * (L.r + 6);
      drawSign(ctx, inX, inY, 3.4, !insideNegative, insideNegative ? '#93c5fd' : '#fca5a5');
      drawSign(ctx, outX, outY, 3.4, insideNegative, insideNegative ? '#fca5a5' : '#93c5fd');
    }

    // voltmeter: one lead inside, one outside
    const mx = Math.min(w - 96, L.cx + L.r + 54);
    const my = L.cy - 30;
    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(L.cx + L.r * 0.5, L.cy - L.r * 0.45);
    ctx.lineTo(mx + 6, my + 14);
    ctx.moveTo(L.cx + L.r + 6, L.cy + L.r * 0.25);
    ctx.lineTo(mx + 6, my + 30);
    ctx.stroke();

    ctx.fillStyle = raised(0.95);
    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    roundRect(ctx, mx, my, 86, 46, 6);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 17px ${MONO}`;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`${vm >= 0 ? '+' : ''}${vm.toFixed(1)}`, mx + 43, my + 20);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = 'rgba(148,163,184,0.9)';
    ctx.fillText('mV  (in − out)', mx + 43, my + 36);

    ctx.font = `10px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.fillText(`soma Ø ${diamUm} µm · C = ${(cap * 1e12).toFixed(1)} pF`, 12, h - 14);
  });

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
      <canvas ref={canvasRef} className="h-[300px] w-full rounded-xl border border-slate-800" />
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <Slider
            label="ions moved out of the cell"
            value={-millionIons}
            min={-20}
            max={20}
            step={0.5}
            display={`${(-millionIons).toFixed(1)} M`}
            onChange={(v) => setMillionIons(-v)}
            accent="accent-sky-400"
          />
          <Slider
            label="soma diameter"
            value={diamUm}
            min={8}
            max={40}
            step={1}
            unit=" µm"
            onChange={setDiamUm}
            accent="accent-violet-400"
          />
          <button
            type="button"
            onClick={() => {
              setMillionIons(-5);
              setDiamUm(20);
            }}
            className="mt-2 w-full rounded border border-slate-700 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
          >
            reset to a resting soma
          </button>
        </div>

        <dl className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 font-mono text-[11px]">
          <Row label="charge separated" value={`${(charge * 1e15).toFixed(1)} fC`} />
          <Row label="capacitance" value={`${(cap * 1e12).toFixed(1)} pF`} />
          <Row label="V = Q / C" value={`${vm >= 0 ? '+' : ''}${vm.toFixed(1)} mV`} strong />
          <Row label="K⁺ inside" value={`${kInside.toExponential(1)}`} />
          <Row label="fraction moved" value={`${(fraction * 100).toExponential(1)} %`} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className={strong ? 'text-sky-300' : 'text-slate-200'}>{value}</dd>
    </div>
  );
}
