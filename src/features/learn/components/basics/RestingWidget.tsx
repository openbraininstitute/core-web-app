'use client';

/**
 * Widget 3 — the membrane potential is a tug-of-war between open channels.
 *
 * Three channel types sit in the soma membrane (K⁺, Na⁺, Cl⁻). The user opens
 * and closes them; the resting potential follows the conductance-weighted
 * average of the reversal potentials.
 */

import { useState } from 'react';

import Slider from '@/features/learn/components/ui/Slider';
import {
  drawSoma,
  drawVoltageScale,
  FONT,
  fillPanel,
  ION_COLORS,
  MONO,
} from '@/features/learn/lib/basics/soma';
import { nernst, restingPotential } from '@/features/learn/lib/biophysics/membrane';
import { screen } from '@/features/learn/lib/theme';

import { useCanvasFrame } from './useCanvasFrame';

const E_K = nernst({ z: 1, out: 5, in: 140 }, 37);
const E_NA = nernst({ z: 1, out: 145, in: 12 }, 37);
const E_CL = nernst({ z: -1, out: 110, in: 10 }, 37);

type Key = 'K' | 'Na' | 'Cl';

const CHANNELS: { key: Key; label: string; E: number; color: string }[] = [
  { key: 'K', label: 'K⁺ channels', E: E_K, color: ION_COLORS.K },
  { key: 'Na', label: 'Na⁺ channels', E: E_NA, color: ION_COLORS.Na },
  { key: 'Cl', label: 'Cl⁻ channels', E: E_CL, color: ION_COLORS.Cl },
];

/** Relative conductances. Resting membrane: mostly K⁺ with a little leak. */
const PRESETS: Record<string, { K: number; Na: number; Cl: number; note: string }> = {
  rest: { K: 100, Na: 4, Cl: 45, note: 'resting soma — K⁺ dominates' },
  depolarised: { K: 100, Na: 900, Cl: 45, note: 'Na⁺ channels thrown open' },
  ahp: { K: 400, Na: 2, Cl: 45, note: 'extra K⁺ open — hyperpolarised' },
  balanced: { K: 100, Na: 100, Cl: 45, note: 'equal K⁺ and Na⁺' },
};

export default function RestingWidget() {
  const [g, setG] = useState({ K: 100, Na: 4, Cl: 45 });
  const [note, setNote] = useState(PRESETS.rest.note);

  const vm = restingPotential([
    { g: g.K, E: E_K },
    { g: g.Na, E: E_NA },
    { g: g.Cl, E: E_CL },
  ]);
  const total = g.K + g.Na + g.Cl;

  const canvasRef = useCanvasFrame((ctx, w, h, now) => {
    fillPanel(ctx, w, h);
    const L = { cx: w * 0.36, cy: h / 2, r: Math.min(h / 2 - 34, w * 0.24) };
    drawSoma(ctx, L, vm, { labels: false });

    // channels embedded in the membrane, grouped by type
    CHANNELS.forEach((ch, ci) => {
      const share = g[ch.key] / total;
      const count = 5;
      // at least one pore stays open while any conductance remains, so a small
      // but important leak (the resting Na⁺ leak) is still visible
      const openCount = share > 0.005 ? Math.max(1, Math.round(share * count)) : 0;
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + (ci - 1) * 2.1 + (i - (count - 1) / 2) * 0.22;
        const x = L.cx + Math.cos(a) * (L.r - 3.5);
        const y = L.cy + Math.sin(a) * (L.r - 3.5);
        const open = i < openCount;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        // pore
        ctx.fillStyle = open ? ch.color : 'rgba(71,85,105,0.8)';
        ctx.globalAlpha = open ? 1 : 0.65;
        ctx.fillRect(-4.5, -7, 9, 14);
        if (open) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = screen();
          ctx.fillRect(-1.6, -7, 3.2, 14);
          // ions trickling through in the direction the gradient pushes them
          const inward = ch.E > vm ? 1 : -1;
          const phase = ((now / 700) % 1) * 14;
          const oy = inward > 0 ? -7 + phase : 7 - phase;
          ctx.fillStyle = ch.color;
          ctx.beginPath();
          ctx.arc(0, oy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // label with the group's share
      const a = -Math.PI / 2 + (ci - 1) * 2.1;
      const lx = L.cx + Math.cos(a) * (L.r + 30);
      const ly = L.cy + Math.sin(a) * (L.r + 30);
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = ch.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${ch.label.slice(0, 3)} ${(share * 100).toFixed(0)}%`, lx, ly);
    });

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(note, L.cx, h - 16);

    drawVoltageScale(ctx, w - 86, 26, h - 52, {
      vLo: -100,
      vHi: 70,
      marks: [
        { v: E_K, label: 'E K⁺', color: ION_COLORS.K },
        { v: E_CL, label: 'E Cl⁻', color: ION_COLORS.Cl },
        { v: E_NA, label: 'E Na⁺', color: ION_COLORS.Na },
      ],
      value: vm,
      valueLabel: `Vm ${vm >= 0 ? '+' : ''}${vm.toFixed(1)}`,
    });
  });

  const apply = (name: keyof typeof PRESETS) => {
    const p = PRESETS[name];
    setG({ K: p.K, Na: p.Na, Cl: p.Cl });
    setNote(p.note);
  };

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
      <canvas ref={canvasRef} className="h-[320px] w-full rounded-xl border border-slate-800" />
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          {CHANNELS.map((ch) => (
            <Slider
              key={ch.key}
              label={`${ch.label} open  (E = ${ch.E.toFixed(0)} mV)`}
              value={g[ch.key]}
              min={0}
              max={1000}
              step={1}
              display={`${((g[ch.key] / total) * 100).toFixed(0)} %`}
              onChange={(v) => {
                setG((prev) => ({ ...prev, [ch.key]: v }));
                setNote('custom mix');
              }}
              accent={
                ch.key === 'K'
                  ? 'accent-blue-400'
                  : ch.key === 'Na'
                    ? 'accent-orange-400'
                    : 'accent-emerald-400'
              }
            />
          ))}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => apply(k)}
                className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-sky-500/60 hover:bg-sky-500/10 hover:text-sky-200"
              >
                {k === 'ahp' ? 'extra K⁺' : k}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 font-mono text-[11px]">
          <div className="flex items-baseline justify-between py-0.5">
            <span className="text-slate-500">Vm</span>
            <span className="text-sky-300">
              {vm >= 0 ? '+' : ''}
              {vm.toFixed(1)} mV
            </span>
          </div>
          <div className="flex items-baseline justify-between py-0.5">
            <span className="text-slate-500">closest to</span>
            <span className="text-slate-200">
              {
                [
                  { l: 'E K⁺', v: E_K },
                  { l: 'E Cl⁻', v: E_CL },
                  { l: 'E Na⁺', v: E_NA },
                ].sort((a, b) => Math.abs(a.v - vm) - Math.abs(b.v - vm))[0].l
              }
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Vm = Σ gᵢEᵢ / Σ gᵢ — every open channel drags the voltage towards its own reversal
            potential, in proportion to how much it is open.
          </p>
        </div>
      </div>
    </div>
  );
}
