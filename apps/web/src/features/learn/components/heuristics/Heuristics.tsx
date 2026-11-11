'use client';

/**
 * Ten takes on the brain-modeling path's opening slides — a mouse brain; the
 * cells it is made of; one of them, a neuron; the ten neurons together, side
 * by side, in the brain and in a mouse; one region's own kinds of neuron, each at its
 * depth in the cortex; the one neuron's dendrites, axon and
 * soma; the neuron as a dendrogram; and the signals it takes in and passes on
 * — each on a different real neuron, floating on white. ↑ and ↓ switch between them, as do
 * the arrows under the neuron's name and credit once it is named — on every slide but the
 * first, which has no one neuron to switch, and those close in on a piece of one. The choice carries from
 * slide to slide, and each slide's figure starts where the last one's left off.
 */

import { useCallback, useContext, useEffect, useState } from 'react';

import { Embedded } from '../embedded';
import { FLOAT_3D } from './real3d/Wet3D';
import { FIXED, type Stage } from './shared';

const VARIANTS = FLOAT_3D;

/** Which variant is showing. Outlives each slide, so moving between them keeps the choice. */
const chosen = { variant: 0 };

export default function Heuristics({
  stage,
  back = false,
}: {
  stage: Stage;
  /** Whether its slide was arrived at by going back: then its figure starts finished. */
  back?: boolean;
}) {
  const [v, setV] = useState(() => chosen.variant % VARIANTS.length);
  // The slide a neuron was switched on: its new figure starts that slide finished, rather than playing it again.
  const [switchedOn, setSwitchedOn] = useState<Stage | null>(null);
  const step = useCallback(
    (d: number) => {
      // the first slide shows no one neuron, and those close in on a piece of one show none whole: nothing to switch
      // there — and the first's brains turn on undisturbed
      if (FIXED.includes(stage)) return;
      setV((cur) => (cur + d + VARIANTS.length) % VARIANTS.length);
      setSwitchedOn(stage);
    },
    [stage]
  );

  useEffect(() => {
    chosen.variant = v;
  }, [v]);

  // outside a course, the arrow keys are the page's: there the arrows by the neuron's name switch it
  const embedded = useContext(Embedded);
  useEffect(() => {
    if (embedded) return;
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        step(-1);
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        step(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, embedded]);

  const { Figure } = VARIANTS[v];
  const button =
    'grid h-5 w-5 place-items-center rounded-[4px] border border-current text-[11px] leading-none opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100';

  return (
    <Figure
      key={v}
      stage={stage}
      back={back || switchedOn === stage}
      controls={
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous neuron"
            title="Previous neuron (↑)"
            className={button}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next neuron"
            title="Next neuron (↓)"
            className={button}
          >
            ↓
          </button>
        </>
      }
    />
  );
}
