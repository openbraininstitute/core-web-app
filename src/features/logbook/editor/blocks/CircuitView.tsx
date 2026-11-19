// The circuit's 3D view: 240 points from a seeded generator in four layers,
// turned by dragging, spinning by itself otherwise. A design stand-in until the platform's
// circuit viewer can be embedded; its own chunk, loaded on "View in 3D" only.
import { isNil, range } from 'es-toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TValueOf } from '@/api/logbook/types';

const LAYERS = [
  { name: 'Stratum oriens', colour: '#5cdbd3', share: 0.16, y: [-1, -0.6] },
  { name: 'Stratum pyramidale', colour: '#69b1ff', share: 0.46, y: [-0.48, -0.28] },
  { name: 'Stratum radiatum', colour: '#b37feb', share: 0.25, y: [-0.18, 0.5] },
  { name: 'Stratum lacunosum-moleculare', colour: '#ffc069', share: 0.13, y: [0.6, 1] },
] as const;
const MTYPES = [
  { name: 'PC', colour: '#ff7875' },
  { name: 'BC', colour: '#95de64' },
  { name: 'OLM', colour: '#69b1ff' },
  { name: 'BS', colour: '#ffd666' },
  { name: 'IS', colour: '#b37feb' },
] as const;

const ColourBy = { Layer: 'layer', Type: 'type' } as const;
type TColourBy = TValueOf<typeof ColourBy>;

interface IPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly layer: string;
  readonly mtype: string;
}

// Lehmer generator, seed 1234567 (the design's): the same cloud on every screen.
function cloud(): IPoint[] {
  let seed = 1_234_567;
  const next = (): number => {
    seed = (seed * 16_807) % 2_147_483_647;
    return (seed - 1) / 2_147_483_646;
  };
  return LAYERS.flatMap((layer) =>
    range(Math.round(240 * layer.share)).map(() => {
      const angle = next() * 2 * Math.PI;
      const radius = Math.sqrt(next());
      const [low, high] = layer.y;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        y: low + next() * (high - low),
        layer: layer.colour,
        mtype: MTYPES[Math.floor(next() * MTYPES.length)]?.colour ?? '#ff7875',
      };
    })
  );
}

const SEGMENT =
  'h-[26px] rounded-full border-0 bg-transparent px-[10px] text-[12px] font-semibold text-[#d9e2ef] aria-pressed:bg-[rgba(255,255,255,0.92)] aria-pressed:text-[#0b1220]';

const TILT = 0.35;
const SPIN_MS = 50;

export default function CircuitView({ name }: { readonly name: string }) {
  const points = useMemo(cloud, []);
  const [rot, setRot] = useState(0.6);
  const [colourBy, setColourBy] = useState<TColourBy>(ColourBy.Layer);
  const dragging = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isNil(dragging.current)) setRot((r) => r + 0.012);
    }, SPIN_MS);
    return () => clearInterval(timer);
  }, []);

  const projected = useMemo(() => {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    return points
      .map((p) => {
        const x1 = p.x * cos - p.z * sin;
        const z1 = p.x * sin + p.z * cos;
        const y2 = p.y * Math.cos(TILT) - z1 * Math.sin(TILT);
        const depth = p.y * Math.sin(TILT) + z1 * Math.cos(TILT);
        return { ...p, sx: 320 + x1 * 190, sy: 150 + y2 * 118, depth };
      })
      .toSorted((a, b) => a.depth - b.depth);
  }, [points, rot]);

  const down = (event: ReactPointerEvent<SVGSVGElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = event.clientX;
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (isNil(dragging.current)) return;
    const dx = event.clientX - dragging.current;
    dragging.current = event.clientX;
    setRot((r) => r + dx * 0.012);
  };
  const up = (): void => {
    dragging.current = null;
  };

  const legend = colourBy === ColourBy.Layer ? LAYERS : MTYPES;
  return (
    <div className="relative bg-[#0b1220] text-[#d9e2ef]">
      <svg
        className="block w-full cursor-grab touch-none"
        viewBox="0 0 640 300"
        role="img"
        aria-label={`3D view of ${name}. Drag to rotate.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {projected.map((p, index) => (
          <circle
            key={index}
            cx={p.sx}
            cy={p.sy}
            r={1.6 + (p.depth + 1) * 1.1}
            fill={colourBy === ColourBy.Layer ? p.layer : p.mtype}
            opacity={0.45 + (p.depth + 1) * 0.25}
          />
        ))}
      </svg>
      {/* Margin and left padding come from the editor's list rule (content.css), as before. */}
      <ul className="absolute top-3 left-[14px] list-none text-[11px]">
        {legend.map((item) => (
          <li key={item.name} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: item.colour }} />
            {item.name}
          </li>
        ))}
      </ul>
      {/* biome-ignore lint/a11y/useSemanticElements: a segmented button group, not a form fieldset */}
      <div
        className="absolute top-[10px] right-3 flex rounded-full bg-[rgba(255,255,255,0.1)] p-0.5"
        role="group"
        aria-label="Colour by"
      >
        <button
          type="button"
          className={SEGMENT}
          aria-pressed={colourBy === ColourBy.Layer}
          onClick={() => setColourBy(ColourBy.Layer)}
        >
          Layer
        </button>
        <button
          type="button"
          className={SEGMENT}
          aria-pressed={colourBy === ColourBy.Type}
          onClick={() => setColourBy(ColourBy.Type)}
        >
          M-type
        </button>
      </div>
      <div className="absolute bottom-[10px] left-[14px] text-[12px] text-[#aebbd0]">
        Drag to rotate
      </div>
    </div>
  );
}
