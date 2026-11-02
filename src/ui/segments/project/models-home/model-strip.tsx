'use client';

import { useState } from 'react';

import {
  isModelCircuit,
  isModelMesh,
  MODEL_CIRCUITS,
  MODEL_MESHES,
  MODEL_MINIS,
} from '@/ui/segments/project/models/models';
import { cn } from '@/utils/css-class';

import type { TModel } from '@/ui/segments/project/models/models';

/** A still of a model, where it has one, for while its clip cannot be played. */
function stillOf(model: TModel): string | undefined {
  if (isModelCircuit(model)) return MODEL_CIRCUITS[model].art;
  if (isModelMesh(model)) return MODEL_MESHES[model].art;
  return undefined;
}

/** The models along the foot of the page: the circuits and the mouse's neuron, not the single cell nor the human's. */
const SHOWN = MODEL_MINIS.filter(({ model }) => model !== 'cell' && model !== 'human');

/** A model turning, on the page's white: its clip, or its still where the clip will not play. */
function Mini({ model, clip }: { model: TModel; clip: string }) {
  const [broken, setBroken] = useState(false);
  const still = stillOf(model);
  // Multiplied over the page: the clips' white falls away on the app's grey.
  const box =
    'h-[clamp(130px,22vh,230px)] w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105';
  if (broken) return still ? <img src={still} alt="" className={box} /> : <span className={box} />;
  return (
    <video
      src={clip}
      poster={still}
      autoPlay
      muted
      loop
      playsInline
      onError={() => setBroken(true)}
      className={box}
    />
  );
}

/**
 * The models along the foot of the page, each turning, with nothing round them, each named under
 * it, small and bold; the one on show named in full colour.
 */
export function ModelStrip({
  selected,
  onSelect,
}: {
  selected: TModel | null;
  onSelect: (model: TModel) => void;
}) {
  return (
    <nav aria-label="Models" className="grid w-full shrink-0 grid-cols-4 gap-[clamp(12px,3vw,48px)]">
      {SHOWN.map(({ model, label, clip }) => {
        const on = selected === model;
        return (
          <button
            key={model}
            type="button"
            onClick={() => onSelect(model)}
            aria-pressed={on}
            aria-label={label}
            className="group flex min-w-0 flex-col items-center gap-[4px] outline-none"
          >
            <Mini model={model} clip={clip} />
            <span
              className={cn(
                'text-primary-9 text-[13px] leading-[16px] font-bold whitespace-nowrap transition-opacity duration-200',
                on ? 'opacity-100' : 'opacity-70 group-hover:opacity-100 group-focus-visible:opacity-100'
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
