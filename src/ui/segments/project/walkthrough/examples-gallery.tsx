'use client';

import { useState } from 'react';

import { ModelView } from '@/ui/segments/project/models/model-views';
import { MODEL_MINIS } from '@/ui/segments/project/models/models';
import { cn } from '@/utils/css-class';

import type { TModel } from '@/ui/segments/project/models/models';

/** The one colour an example is drawn in here: the microcircuit's pink and the fly brain's green. */
const L6_COLOR = '#e64980';
const FLY_COLOR = '#2f9e44';

/** What each example is, said in a line or two, and where it is from. */
const ABOUT: Record<TModel, { from: string; text: string }> = {
  l6: {
    from: 'Rat · somatosensory cortex',
    text: 'Layer 6 of a column of cortex, 11,032 neurons, each reconstructed and set in its place, and wired to the others by synapses: a microcircuit ready to simulate.',
  },
  cell: {
    from: 'Rat · somatosensory cortex',
    text: 'A layer 5 tufted pyramidal cell: its reconstructed morphology with an electrical model fitted to recordings, simulated on its own or with synapses onto it.',
  },
  human: {
    from: 'Human · temporal cortex',
    text: 'A pyramidal cell from H01, a cubic millimetre of human cortex imaged by electron microscopy and traced cell by cell; skeletonized, it becomes a morphology to model.',
  },
  mouse: {
    from: 'Mouse · visual cortex',
    text: 'A pyramidal cell from MICrONS, a cubic millimetre of mouse visual cortex reconstructed at nanometre resolution, with every synapse onto it.',
  },
  fly: {
    from: 'Fruit fly · whole brain',
    text: 'A 1% sample of the FlyWire connectome, some 1,400 neurons of the adult fly brain built from their reconstructions into a simulatable model, wired by their synapses.',
  },
  cns: {
    from: 'Fruit fly · brain and nerve cord',
    text: 'The male fly’s whole central nervous system, 164,606 neurons from the Male CNS connectome, as a network of point neurons to simulate in seconds.',
  },
  microns: {
    from: 'Mouse · visual cortex',
    text: 'MICrONS as a circuit: 50,948 neurons through the depth of the cortex, wired by the synapses traced between them, 877 of them proofread and reconstructed whole.',
  },
};

/** The examples drawn in one colour of their own here, rather than coloured by a property. */
const COLOR: Partial<Record<TModel, string>> = { l6: L6_COLOR, fly: FLY_COLOR };

/**
 * A model's turning clip, on the page as ink; one with a colour of its own here is drawn in it: the
 * clip in grey, and its colour laid over it as a hue, so that the white stays white.
 */
export function ModelClip({
  model,
  clip,
  className,
}: {
  model: TModel;
  clip: string;
  className?: string;
}) {
  const color = COLOR[model];
  return (
    <span className={cn('relative isolate block bg-white mix-blend-multiply', className)}>
      <video
        src={clip}
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full object-contain"
        style={color ? { filter: 'grayscale(1) contrast(1.15)' } : undefined}
      />
      {color && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: color, mixBlendMode: 'color' }}
        />
      )}
    </span>
  );
}

/**
 * The examples the platform holds, each turning on its own, not set in a brain: a grid of them. A
 * click brings one up large, in its own 3D view, the others small in a row under it, and beside it
 * what it is, a light title and a line or two.
 */
export function ExamplesGallery() {
  const [picked, setPicked] = useState<TModel | null>(null);
  const shown = MODEL_MINIS.find((mini) => mini.model === picked);
  return (
    <div className="absolute inset-x-[clamp(16px,4vw,72px)] top-[-9vh] bottom-[76px]">
      <div className="absolute inset-y-0 left-0 flex w-[58%] flex-col gap-[10px]">
        {shown && (
          <div key={shown.model} className="animate-fade-in relative min-h-0 flex-1">
            <ModelView model={shown.model} color={COLOR[shown.model]} />
          </div>
        )}
        <ul
          className={cn(
            'grid gap-[clamp(8px,1.5vw,22px)] transition-[height] duration-500',
            shown ? 'h-[22%] shrink-0 grid-cols-6' : 'h-full grid-cols-3 grid-rows-2'
          )}
        >
          {MODEL_MINIS.map(({ model, label, clip }, i) => {
            const on = model === picked;
            return (
              <li key={model} className="min-h-0">
                <button
                  type="button"
                  onClick={() => setPicked(model)}
                  aria-pressed={on}
                  className={cn(
                    'group flex h-full w-full flex-col items-center gap-[6px] rounded-[18px] p-[8px] transition-colors duration-300',
                    on ? 'bg-[#f2f5fa]' : 'hover:bg-[#f7f9fc]'
                  )}
                  style={{ animation: `fade-in 600ms ease-out ${i * 90}ms both` }}
                >
                  <ModelClip
                    model={model}
                    clip={clip}
                    className="min-h-0 w-full flex-1 transition-transform duration-300 group-hover:scale-105"
                  />
                  <span
                    className={cn(
                      'leading-[16px] font-semibold whitespace-nowrap transition-colors',
                      shown ? 'text-[11px]' : 'text-[13px]',
                      on ? 'text-primary-9' : 'group-hover:text-primary-9 text-neutral-500'
                    )}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="absolute inset-y-0 left-[61%] flex w-[27%] flex-col justify-center">
        {shown ? (
          <div key={shown.model} className="animate-fade-in flex flex-col gap-[14px]">
            <span className="text-[11px] leading-[16px] font-semibold tracking-[0.14em] text-neutral-400 uppercase">
              {ABOUT[shown.model].from}
            </span>
            <h3 className="text-primary-9 text-[clamp(28px,2.6vw,40px)] leading-[1.1] font-light tracking-[-0.02em]">
              {shown.label}
            </h3>
            <p className="text-[clamp(14px,1.1vw,16px)] leading-[1.6] font-light text-neutral-600">
              {ABOUT[shown.model].text}
            </p>
          </div>
        ) : (
          <p className="text-[clamp(18px,1.6vw,24px)] leading-[1.3] font-light text-neutral-400">
            Pick a model to see what it is.
          </p>
        )}
      </div>
    </div>
  );
}
