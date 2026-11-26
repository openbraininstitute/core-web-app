'use client';

import { RiAddLine, RiArrowRightLine } from '@remixicon/react';
import { useEffect, useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { cn } from '@/utils/css-class';

import type { IWorkflowExample } from './workflow-examples';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * What a workflow looks like, for its type's hexagon: its configuration, its results and its analysis, one fading
 * into the next. For the prototype every workflow shows the same three screenshots.
 */
const FRAMES = [
  { src: '/images/workflow-previews/configure.jpg', step: 'Configure' },
  { src: '/images/workflow-previews/results.jpg', step: 'Results' },
  { src: '/images/workflow-previews/analysis.jpg', step: 'Analyse' },
] as const;
/** The screenshots' width over their height. */
export const PREVIEW_ASPECT = 1800 / 1129;
/** How long each screenshot stays, and how long one takes to fade into the next. */
const HOLD_MS = 2200;
const FADE_MS = 700;
/** The card's height besides its picture, in stage px: the steps, what it is, and the examples beside it. */
export const PREVIEW_CHROME_H = 320;
const GREEN = '#008c05';

const D = ExtendedEntitiesTypeDict;
const DESCRIPTIONS: Partial<Record<TExtendedEntitiesTypeDict, string>> = {
  [D.IonChannelBuildCampaign]:
    'Fit a Hodgkin–Huxley model of an ion channel to voltage-clamp recordings, then compare its currents with the traces.',
  [D.MEModelBuildCampaign]:
    'Pair a morphology with an e-model to make a single neuron you can simulate, checking first that the two are compatible.',
  [D.BuildSynaptomeCampaign]:
    'Place afferent synapses on a neuron’s dendrites by the connectivity rules of each input pathway, ready to drive with synaptic input.',
  [D.EmSynapseMappingCampaign]:
    'Map synapses reconstructed from electron microscopy onto morphologies, and build a circuit from the EM data.',
  [D.ExtracellularRecordingArrayCampaign]:
    'Place a virtual electrode array in a circuit, to record local field potentials and extracellular spikes.',
  [D.CircuitSynapticPhysiologyCampaign]:
    'Give a circuit’s connections their synaptic physiology, from a model per pathway, and register the parameterised circuit.',
  [D.SingleNeuronSynaptome]:
    'Build a single neuron with its synapses placed, from an ME-model and the pathways that contact it.',
  [D.IonChannelModelSimulation]:
    'Run voltage-clamp protocols on an ion channel model and plot its currents, activation and inactivation.',
  [D.MemodelCircuitSimulation]:
    'Inject current into a single neuron and record its voltage at the soma and along its dendrites.',
  [D.SingleNeuronCircuitSimulation]:
    'Inject current into a single neuron and record its voltage at the soma and along its dendrites.',
  [D.PairedNeuronCircuitSimulation]:
    'Stimulate one neuron of a connected pair and record the postsynaptic response in the other.',
  [D.SmallMicrocircuitSimulation]:
    'Stimulate a small circuit of connected neurons and record the spikes and voltages of every cell.',
  [D.MicrocircuitSimulation]:
    'Simulate a cortical microcircuit with stimuli and recordings, then explore its spikes in the raster, the 3D player and the statistics.',
  [D.RegionCircuitSimulation]:
    'Simulate a whole brain region, drive its inputs and follow the activity through its layers and populations.',
  [D.WholeBrainCircuitSimulation]:
    'Simulate a whole-brain connectome: drive sensory neurons, record every spike, and follow activity through the brain in 3D.',
  [D.SingleNeuronSynaptomeSimulation]:
    'Drive a neuron’s placed synapses with spike trains and record how the cell responds.',
  [D.CircuitExtractionCampaign]:
    'Cut a smaller circuit out of a large one by neuron set, with everything needed to simulate it on its own.',
  [D.EFeatureExtractionCampaign]:
    'Compute e-features from intracellular recordings: spike counts, firing rates, action potential shape, sag and adaptation.',
  [D.SkeletonizationCampaign]:
    'Turn EM cell meshes into skeletonised morphologies, with their spines, ready to model.',
  [D.EModelOptimizationCampaign]:
    'Fit the ion channel densities of an e-model to e-features with an evolutionary optimiser.',
  [D.EModelValidationCampaign]:
    'Test an e-model against protocols it was not fitted to, and score how well it matches the recordings.',
};

export const workflowDescription = (
  type: TExtendedEntitiesTypeDict,
  fallback: string | undefined,
  activity: string,
  label: string
) => DESCRIPTIONS[type] ?? fallback ?? `${activity} a ${label.toLowerCase()}, then look through its results.`;

/**
 * A workflow type's preview, beside its tongue: the three screenshots fading in turn, the step each shows, what the
 * workflow does with a green button to start a new one, and a few public examples to start from instead, each with
 * its entity already chosen. `id` starts it again from the configuration whenever another type is shown.
 */
export function WorkflowPreview({
  id,
  activity,
  title,
  description,
  at,
  shown,
  examples,
  onStartNew,
  onExample,
  onHover,
}: {
  id: string;
  activity: string;
  title: string;
  description: string;
  at: { x: number; y: number; w: number };
  shown: boolean;
  examples: IWorkflowExample[];
  onStartNew: () => void;
  onExample: (example: IWorkflowExample) => void;
  /** The pointer on the card, which keeps its type shown. */
  onHover: (on: boolean) => void;
}) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    setFrame(0);
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), HOLD_MS + FADE_MS);
    return () => window.clearInterval(timer);
  }, [id]);
  const imgH = at.w / PREVIEW_ASPECT;

  return (
    <div
      aria-hidden={!shown}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      className={cn(
        'absolute flex flex-col gap-[16px] rounded-[20px] border border-[rgb(19_48_111/0.08)] bg-white p-[16px] shadow-[0_18px_44px_rgb(20_40_90/0.18),0_2px_6px_rgb(20_40_90/0.08)] transition-[opacity,translate] duration-300 ease-out',
        shown ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      style={{
        left: at.x,
        top: at.y,
        width: at.w + 32,
        opacity: shown ? 1 : 0,
        translate: shown ? '0 0' : '-14px 0',
      }}
    >
      <div
        className="border-neutral-2 relative overflow-hidden rounded-[12px] border bg-neutral-50"
        style={{ height: imgH }}
      >
        {FRAMES.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.src}
            src={f.src}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-top"
            style={{ opacity: frame === i ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-[8px] px-[6px] pb-[4px]">
        {/* the step on show, the bar under it filling while it stays */}
        <div className="flex gap-[18px]">
          {FRAMES.map((f, i) => (
            <span key={f.step} className="flex flex-col gap-[5px]">
              <span
                className={cn(
                  'text-[13px] leading-[16px] font-bold tracking-[0.08em] uppercase transition-colors duration-300',
                  frame === i ? 'text-[#008c05]' : 'text-neutral-400'
                )}
              >
                {i + 1} · {f.step}
              </span>
              <span className="h-[3px] w-full overflow-hidden rounded-full bg-neutral-200">
                <span
                  key={frame === i ? `${id}-${frame}` : 'idle'}
                  className="block h-full rounded-full bg-[#008c05]"
                  style={
                    frame === i
                      ? { animation: `preview-fill ${HOLD_MS + FADE_MS}ms linear both` }
                      : { width: 0 }
                  }
                />
              </span>
            </span>
          ))}
        </div>
        <div className="mt-[6px] flex gap-[28px]">
          {/* what it is, and a new one from scratch */}
          <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
            <div className="text-neutral-5 text-[13px] leading-[16px] font-semibold tracking-[0.08em] uppercase">
              {activity}
            </div>
            <h3 className="text-primary-9 m-0 text-[26px] leading-[31px] font-bold">{title}</h3>
            <p className="m-0 text-[16px] leading-[23px] text-neutral-700">{description}</p>
            <button
              type="button"
              onClick={onStartNew}
              className="mt-[8px] flex h-[46px] items-center gap-[8px] self-start rounded-full px-[24px] text-[16px] font-semibold text-white transition-[filter] hover:brightness-110"
              style={{ background: GREEN }}
            >
              <RiAddLine className="size-[20px]" />
              Start new
            </button>
          </div>
          {/* or one from an example, its entity already chosen */}
          <div className="flex w-[46%] shrink-0 flex-col gap-[8px]">
            <div className="text-neutral-5 text-[13px] leading-[16px] font-semibold tracking-[0.08em] uppercase">
              Start from an example
            </div>
            {examples.length === 0 && (
              <p className="m-0 text-[15px] leading-[21px] text-neutral-500">No examples yet.</p>
            )}
            {examples.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => onExample(example)}
                title={`Start a ${title.toLowerCase()} workflow with ${example.name}`}
                className="group border-neutral-2 hover:border-primary-9 flex h-[56px] items-center gap-[12px] rounded-[12px] border bg-white px-[14px] text-left transition-colors hover:bg-[#f4f7fc]"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-primary-9 truncate text-[15px] leading-[19px] font-semibold">
                    {example.name}
                  </span>
                  {example.about && (
                    <span className="truncate text-[13px] leading-[17px] text-neutral-500">{example.about}</span>
                  )}
                </span>
                <RiArrowRightLine className="text-primary-9 size-[18px] shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{'@keyframes preview-fill { from { width: 0 } to { width: 100% } }'}</style>
    </div>
  );
}
