'use client';

/**
 * The skeletonization course's figure: one real neuron from mouse visual cortex in 3D, drawn by the
 * platform's own viewer engine, with its EM mesh read as the EM viewer reads it and its skeleton as
 * the morphology viewer reads it, and beside it, or instead of it, panels on how it was made and
 * what its files hold.
 *
 * First the cell: its membrane, traced in electron microscopy, turning slowly, then glass over its
 * skeleton and spines, then them on their own, and back; the membrane alone; the skeleton, coloured
 * by type; the spines along a stretch of dendrite, each its own colour; one spine close up, coloured
 * by distance from its dendrite, with its own small skeleton, its root, its centre and its
 * direction; and the membrane wiped away across that dendrite, to compare.
 *
 * Then the workflow, in panels: from an EM mesh to a registered morphology, in the platform's and
 * obi-one's names; the campaign's form; the REST calls that launch
 * it; the files a run writes, beside the whole cell; and the entities that come of it.
 *
 * Then inside the files: the skeleton's first lines as SWC beside its soma; the skeleton's sections,
 * each its colour and labelled with its id in the spine table, each spine in its section's colour;
 * the spiny H5's tree beside the cell, a part pointed at lighting what it draws; the spine table
 * beside the spine of the row picked; one spine turning and moving from its own frame onto its
 * dendrite; the parts the format has room for and this file lacks, beside the spines coloured by
 * distance from their dendrite; and the spines coloured by length.
 *
 * Then in Python: fetching a spiny morphology with entitysdk, as code; the cells that read it with
 * morph-spines, NeuroM, MorphIO and morph-tool, as they ran on this cell, each beside the part of
 * the cell it reads; what in obi-one reads these files; and the things to remember.
 *
 * One viewer stays mounted from slide to slide, hidden where a panel stands alone, and glides
 * between views; three.js loads only with it.
 */

import dynamic from 'next/dynamic';
import { useContext, useEffect, useMemo, useState } from 'react';

import { Embedded } from '@/features/learn/components/embedded';
import { cn } from '@/utils/css-class';

import { CELL } from './files';
import { frameClass } from './frame';
import {
  FrameCaption,
  H5Tree,
  LengthCaption,
  Parts,
  SectionsCaption,
  SpineTable,
  SwcPanel,
} from './Inside';
import { Downstream, Fetch, Gotchas, Ran } from './Python';
import { isCodeStep, LABELS, LAYOUTS, SKELETON_STEPS, type SkeletonStep, STATES } from './views';
import { CampaignForm, Launch, Outputs, Registered, Workflow } from './Workflow';

import type { ReactNode } from 'react';
import type { H5Part } from './engine/view';

export { SKELETON_STEPS, type SkeletonStep };

function Placeholder() {
  const embedded = useContext(Embedded);
  return <div className={frameClass(embedded)} />;
}

const Scene = dynamic(() => import('./Scene'), { ssr: false, loading: () => <Placeholder /> });

/** What is said under the 3D view on the steps it has to itself. */
const CAPTIONS: Partial<Record<SkeletonStep, ReactNode>> = {
  sections: <SectionsCaption />,
  frame: <FrameCaption />,
  length: <LengthCaption />,
};

export default function SkeletonFigure({
  step,
  back = false,
}: {
  step: SkeletonStep;
  back?: boolean;
}) {
  const embedded = useContext(Embedded);
  const layout = embedded ? 'full' : LAYOUTS[step];
  const [pick, setPick] = useState<number>(CELL.chosen.spine);
  const [focus, setFocus] = useState<H5Part | null>(null);
  // a part lit on one slide is not lit on the next
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the step changes
  useEffect(() => setFocus(null), [step]);
  const tableState = useMemo(() => ({ ...STATES.table, pick }), [pick]);
  const state = step === 'table' ? tableState : STATES[step];

  let panel: ReactNode = null;
  if (step === 'workflow') panel = <Workflow />;
  else if (step === 'params') panel = <CampaignForm />;
  else if (step === 'launch') panel = <Launch />;
  else if (step === 'outputs') panel = <Outputs />;
  else if (step === 'registered') panel = <Registered />;
  else if (step === 'swc') panel = <SwcPanel />;
  else if (step === 'h5') panel = <H5Tree focus={focus} onFocus={setFocus} />;
  else if (step === 'table') panel = <SpineTable pick={pick} onPick={setPick} />;
  else if (step === 'parts') panel = <Parts />;
  else if (step === 'fetch') panel = <Fetch />;
  else if (isCodeStep(step)) panel = <Ran step={step} />;
  else if (step === 'downstream') panel = <Downstream />;
  else if (step === 'gotchas') panel = <Gotchas />;

  return (
    <div
      className={cn(
        'grid w-full items-start gap-4',
        layout === 'side' && 'md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'
      )}
    >
      {/* the same Scene on every slide, told only its new view: one WebGL context for the course */}
      <div
        className={cn('min-w-0', layout === 'panel' && 'hidden', layout === 'side' && 'md:order-2')}
      >
        <Scene
          state={state}
          label={LABELS[step]}
          size={layout === 'side' ? 'side' : 'full'}
          focus={step === 'h5' ? focus : null}
          caption={CAPTIONS[step]}
        />
      </div>
      {layout !== 'full' && panel && (
        <div
          key={step}
          className={cn('min-w-0', back ? 'animate-slide-in-left' : 'animate-slide-in-right')}
        >
          {panel}
        </div>
      )}
    </div>
  );
}
