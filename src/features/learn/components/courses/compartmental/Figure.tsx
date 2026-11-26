'use client';

/**
 * The compartmental modelling course's figure, for its part on NEURON: a cell built step by step, each step's code as
 * it ran in NEURON and what it printed — its sections and their compartments, their membranes and channels, an
 * electrode and the voltages it makes, the Hodgkin–Huxley gates through the spike, and a synapse, its potential at the
 * synapse and at the soma.
 */

import { Highlighted, INK, OutputView, Panel, parseOutput } from '../ui/Code';
import { CELLS, NEURON_VERSION } from './cells';
import Diagram, { DIAGRAM_STEPS, isDiagramStep } from './Diagrams';

export const COMPARTMENTAL_STEPS = [
  ...DIAGRAM_STEPS,
  'sections',
  'biophysics',
  'inject',
  'gates',
  'synapse',
] as const;
export type CompartmentalStep = (typeof COMPARTMENTAL_STEPS)[number];

export default function CompartmentalFigure({
  step,
  back = false,
}: {
  step: CompartmentalStep;
  back?: boolean;
}) {
  if (isDiagramStep(step))
    return (
      <div
        key={step}
        className={`flex w-full flex-1 items-start justify-center pt-1 ${back ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}
      >
        <div className="w-full max-w-4xl">
          <Diagram step={step} />
        </div>
      </div>
    );
  const cell = CELLS[step];
  const out = parseOutput(cell.output);
  return (
    <div
      key={step}
      className={`flex w-full flex-1 items-start justify-center pt-1 ${back ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}
    >
      <div className="w-full max-w-5xl">
        <Panel
          label={cell.label}
          right={<span style={{ color: INK.faint }}>ran with NEURON {NEURON_VERSION}</span>}
          small
        >
          <div className={cell.side ? 'md:grid md:grid-cols-[1.3fr_1fr]' : ''}>
            <pre className="overflow-x-auto px-4 py-3">
              <Highlighted code={cell.code} lit={cell.lit} />
            </pre>
            <OutputView text={out.text} plots={out.plots} beside={cell.side} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
