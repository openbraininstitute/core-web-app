'use client';

/**
 * Widget 2 — one ion, one gradient, one equilibrium potential.
 *
 * The user changes the concentrations across the soma membrane and sees the
 * Nernst potential: the voltage at which the electrical pull on the ion exactly
 * balances its tendency to diffuse down the gradient.
 */

import { useMemo, useState } from 'react';

import Slider from '@/features/learn/components/ui/Slider';
import {
  drawIon,
  drawSoma,
  drawVoltageScale,
  FONT,
  fillPanel,
  ION_COLORS,
  mulberry32,
  roundRect,
} from '@/features/learn/lib/basics/soma';
import { nernst, thermalVoltageMv } from '@/features/learn/lib/biophysics/membrane';
import { screen } from '@/features/learn/lib/theme';

import { useCanvasFrame } from './useCanvasFrame';

type IonKey = 'K' | 'Na' | 'Cl' | 'Ca';

interface IonPreset {
  key: IonKey;
  label: string;
  sign: string;
  z: number;
  out: number;
  in: number;
  /** Slider ranges, mM. */
  maxOut: number;
  maxIn: number;
  step: number;
}

const IONS: Record<IonKey, IonPreset> = {
  K: { key: 'K', label: 'K⁺', sign: '+', z: 1, out: 5, in: 140, maxOut: 60, maxIn: 200, step: 1 },
  Na: {
    key: 'Na',
    label: 'Na⁺',
    sign: '+',
    z: 1,
    out: 145,
    in: 12,
    maxOut: 200,
    maxIn: 100,
    step: 1,
  },
  Cl: {
    key: 'Cl',
    label: 'Cl⁻',
    sign: '−',
    z: -1,
    out: 110,
    in: 10,
    maxOut: 200,
    maxIn: 100,
    step: 1,
  },
  Ca: {
    key: 'Ca',
    label: 'Ca²⁺',
    sign: '2+',
    z: 2,
    out: 2,
    in: 0.05,
    maxOut: 10,
    maxIn: 5,
    step: 0.05,
  },
};

export default function NernstWidget() {
  const [ionKey, setIonKey] = useState<IonKey>('K');
  const ion = IONS[ionKey];
  const [conc, setConc] = useState<Record<IonKey, { out: number; in: number }>>({
    K: { out: IONS.K.out, in: IONS.K.in },
    Na: { out: IONS.Na.out, in: IONS.Na.in },
    Cl: { out: IONS.Cl.out, in: IONS.Cl.in },
    Ca: { out: IONS.Ca.out, in: IONS.Ca.in },
  });
  const [tempC, setTempC] = useState(37);

  const { out, in: cIn } = conc[ionKey];
  const E = nernst({ z: ion.z, out, in: cIn }, tempC);
  const color = ION_COLORS[ionKey];

  const scatter = useMemo(() => {
    const rnd = mulberry32(11);
    return Array.from({ length: 260 }, () => ({ a: rnd() * Math.PI * 2, rr: rnd(), j: rnd() }));
  }, []);

  const canvasRef = useCanvasFrame((ctx, w, h) => {
    fillPanel(ctx, w, h);
    const L = { cx: w * 0.38, cy: h / 2, r: Math.min(h / 2 - 30, w * 0.26) };

    // outside ions first, then the cell on top of them
    const nOut = Math.round((out / ion.maxOut) * 90);
    const nIn = Math.round((cIn / ion.maxIn) * 90);
    let placedOut = 0;
    for (const s of scatter) {
      if (placedOut >= nOut) break;
      const rr = L.r + 12 + s.rr * (Math.min(w, h) * 0.42);
      const x = L.cx + Math.cos(s.a) * rr;
      const y = L.cy + Math.sin(s.a) * rr * 0.85;
      if (x < 8 || x > w - 120 || y < 12 || y > h - 12) continue;
      drawIon(ctx, x, y, 5.2, ion.sign, color, 0.9);
      placedOut++;
    }

    drawSoma(ctx, L, E, { labels: false });

    let placedIn = 0;
    for (const s of scatter) {
      if (placedIn >= nIn) break;
      const rr = Math.sqrt(s.j) * (L.r - 14);
      const x = L.cx + Math.cos(s.a * 2.3) * rr;
      const y = L.cy + Math.sin(s.a * 2.3) * rr;
      drawIon(ctx, x, y, 5.2, ion.sign, color, 0.95);
      placedIn++;
    }

    // net diffusion arrow, on the free side of the cell
    const dir = out > cIn ? 1 : -1; // 1 = inward
    if (Math.abs(Math.log(out / cIn)) > 0.05) {
      const ax = L.cx - L.r - 30;
      const ay = L.cy;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax - dir * 14, ay);
      ctx.lineTo(ax + dir * 10, ay);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax + dir * 17, ay);
      ctx.lineTo(ax + dir * 7, ay - 5);
      ctx.lineTo(ax + dir * 7, ay + 5);
      ctx.closePath();
      ctx.fill();
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(dir === 1 ? 'diffuses in' : 'diffuses out', ax, ay - 8);
      ctx.restore();
    }

    // concentration labels, with a backdrop so they stay readable over ions
    label(ctx, `${ion.label} outside  ${fmt(out)} mM`, L.cx, 14);
    label(ctx, `inside  ${fmt(cIn)} mM`, L.cx, L.cy + L.r + 16);

    drawVoltageScale(ctx, w - 78, 26, h - 52, {
      vLo: -140,
      vHi: 140,
      marks: [
        { v: 0, label: '0', color: 'rgba(148,163,184,0.7)' },
        { v: E, label: `E ${ion.label}`, color },
      ],
      value: E,
      valueLabel: `${E >= 0 ? '+' : ''}${E.toFixed(1)} mV`,
    });
  });

  const setOut = (v: number) => setConc((c) => ({ ...c, [ionKey]: { ...c[ionKey], out: v } }));
  const setIn = (v: number) => setConc((c) => ({ ...c, [ionKey]: { ...c[ionKey], in: v } }));

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
      <canvas ref={canvasRef} className="h-[320px] w-full rounded-xl border border-slate-800" />
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex gap-1.5">
            {(Object.keys(IONS) as IonKey[]).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setIonKey(k)}
                className={`flex-1 rounded border px-1.5 py-1 text-[11px] font-medium ${
                  ionKey === k
                    ? 'border-transparent text-slate-950'
                    : 'border-slate-700 text-slate-300'
                }`}
                style={ionKey === k ? { background: ION_COLORS[k] } : undefined}
              >
                {IONS[k].label}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <Slider
              label="outside concentration"
              value={conc[ionKey].out}
              min={ion.step}
              max={ion.maxOut}
              step={ion.step}
              unit=" mM"
              onChange={setOut}
            />
            <Slider
              label="inside concentration"
              value={conc[ionKey].in}
              min={ion.step}
              max={ion.maxIn}
              step={ion.step}
              unit=" mM"
              onChange={setIn}
            />
            <Slider
              label="temperature"
              value={tempC}
              min={4}
              max={42}
              step={1}
              unit=" °C"
              onChange={setTempC}
              accent="accent-rose-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setConc((c) => ({ ...c, [ionKey]: { out: ion.out, in: ion.in } }))}
            className="mt-2 w-full rounded border border-slate-700 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
          >
            physiological values for {ion.label}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 font-mono text-[11px]">
          <div className="flex items-baseline justify-between py-0.5">
            <span className="text-slate-500">valence z</span>
            <span className="text-slate-200">{ion.z > 0 ? `+${ion.z}` : ion.z}</span>
          </div>
          <div className="flex items-baseline justify-between py-0.5">
            <span className="text-slate-500">RT/F</span>
            <span className="text-slate-200">{thermalVoltageMv(tempC).toFixed(1)} mV</span>
          </div>
          <div className="flex items-baseline justify-between py-0.5">
            <span className="text-slate-500">out / in</span>
            <span className="text-slate-200">{(out / cIn).toFixed(2)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between border-t border-slate-800 pt-1.5">
            <span className="text-slate-500">E {ion.label}</span>
            <span style={{ color }}>
              {E >= 0 ? '+' : ''}
              {E.toFixed(1)} mV
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            E = (RT/zF) · ln([out]/[in])
          </p>
        </div>
      </div>
    </div>
  );
}

const fmt = (v: number) => (v < 1 ? v.toFixed(2) : v.toFixed(0));

/** Small centred caption with a dark backdrop so it survives over ions. */
function label(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number) {
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = screen(0.82);
  roundRect(ctx, cx - w / 2, cy - 9, w, 18, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(203,213,225,0.95)';
  ctx.fillText(text, cx, cy + 0.5);
}
