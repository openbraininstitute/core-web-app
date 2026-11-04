'use client';

import Link from 'next/link';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { WorkspaceMainPages } from '@/constants';
import { learnFlag, useFlag } from '@/features/feature-flags';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';
import { useSessionAtomValue } from '@/hooks/hooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ModelActions, PillLink } from '@/ui/segments/project/models/actions';
import { MODEL_CIRCUITS } from '@/ui/segments/project/models/models';
import { useModelCircuit } from '@/ui/segments/project/models/use-model-circuit';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { THomeDesign } from '@/ui/segments/project/home-designs';
import type { TModel, TModelCircuit } from '@/ui/segments/project/models/models';

/** A large light number with what it counts under it. */
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="text-[30px] leading-[36px] font-light tracking-[-0.01em]">{value}</span>
      <span className="text-[11px] leading-[14px] text-neutral-500">{label}</span>
    </div>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-[40px] gap-y-[12px] border-t border-neutral-200 pt-[16px]">
      {children}
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-[8px]">{children}</div>;
}

/** How to move through the walkthrough, as everyneuron says it. */
export function ScrollHint() {
  const key =
    'inline-flex size-[16px] items-center justify-center rounded-[3px] border border-neutral-300 text-[10px]';
  return (
    <p className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
      Use the arrow keys <span className={key}>←</span>
      <span className={key}>→</span> or scroll
    </p>
  );
}

/**
 * Words that hold only where the circuit itself is on show, to colour and to click on: otherwise, signed out or in
 * another project, its pack in the repo stands in, only to be turned, and `otherwise` is said in their place.
 */
export function WhereReadable({
  scene,
  otherwise = null,
  children,
}: {
  scene: TModelCircuit;
  otherwise?: ReactNode;
  children: ReactNode;
}) {
  const { readable } = useModelCircuit(MODEL_CIRCUITS[scene]);
  return readable ? children : otherwise;
}

/**
 * A circuit's size, and Data and Simulate for it (Data alone, for one with no models to `simulate`);
 * in another project, where it can be opened, in the walkthrough of that `design`; signed out, nothing, as there is no
 * project to open it in.
 */
export function CircuitFacts({
  scene,
  design = 'walkthrough',
  simulate = true,
}: {
  scene: TModelCircuit;
  design?: THomeDesign;
  simulate?: boolean;
}) {
  const example = MODEL_CIRCUITS[scene];
  const { circuit, readable } = useModelCircuit(example);
  const session = useSessionAtomValue();
  const home = example.workspace;
  if (!readable && home) {
    if (!session) return null;
    return (
      <p className="text-[12px] leading-[18px] text-neutral-500">
        This circuit lives in the Shared results + tests project.{' '}
        <Link
          href={`${config.ROOT_ROUTE}/${home.virtualLabId}/${home.projectId}?design=${design}`}
          className="text-primary-9 underline underline-offset-2"
        >
          Open the walkthrough there
        </Link>{' '}
        to explore it in full.
      </p>
    );
  }
  if (!circuit) return null;
  return (
    <>
      <Stats>
        <Stat value={circuit.number_neurons.toLocaleString('en')} label="neurons" />
        {circuit.number_synapses ? (
          <Stat value={circuit.number_synapses.toLocaleString('en')} label="synapses" />
        ) : null}
      </Stats>
      <Row>
        <ModelActions model={scene} simulate={simulate} />
      </Row>
    </>
  );
}

/** What can be done with a model, as a row of pills. */
export function Actions({ model }: { model: TModel }) {
  return (
    <Row>
      <ModelActions model={model} />
    </Row>
  );
}

/** The colours the cell's parts are drawn in. */
export function SectionKey({ className }: { className?: string }) {
  const parts = [
    ['Basal dendrites', SECTION_TYPE_COLORS.basalDendrite],
    ['Apical dendrite', SECTION_TYPE_COLORS.apicalDendrite],
    ['Soma', SECTION_TYPE_COLORS.soma],
    ['Axon', SECTION_TYPE_COLORS.axon],
  ] as const;
  return (
    <ul
      className={cn(
        'flex flex-wrap gap-x-[16px] gap-y-[4px] text-[12px] leading-[16px] text-neutral-500',
        className
      )}
    >
      {parts.map(([label, color]) => (
        <li key={label} className="flex items-center gap-[6px]">
          <span className="size-[8px] rounded-full" style={{ background: color }} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** The course the chapter's words come from, where Learn is on, coming back to the walkthrough of that `design`. */
export function CourseLink({ design = 'walkthrough' }: { design?: THomeDesign }) {
  const learn = useFlag(learnFlag.key) === true;
  const { virtualLabId, projectId } = useWorkspace();
  if (!learn) return null;
  const from = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}?design=${design}`;
  return (
    <Row>
      <PillLink primary href={`/app/learn/brain-modeling?from=${encodeURIComponent(from)}`}>
        Take the course
      </PillLink>
    </Row>
  );
}

const SECTIONS = {
  data: { label: 'Explore the data', path: WorkspaceMainPages.Data },
  workflows: { label: 'Open Workflows', path: WorkspaceMainPages.Workflows },
  notebooks: {
    label: 'Browse notebooks',
    path: `${WorkspaceMainPages.Notebooks}/browse/${ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}`,
  },
} as const;

/** A section of the platform, by its pill. */
export function SectionLink({
  section,
  primary = false,
}: {
  section: keyof typeof SECTIONS;
  primary?: boolean;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const { label, path } = SECTIONS[section];
  return (
    <PillLink primary={primary} href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/${path}`}>
      {label}
    </PillLink>
  );
}

/** The scales a model comes in, one after another, as everyneuron's timeline. */
export function Scales() {
  const scales = [
    ['1 neuron', 'ME-model'],
    ['+ synapses', 'Synaptome'],
    ['2 neurons', 'Pair'],
    ['Thousands', 'Microcircuit'],
    ['140,000', 'Whole brain'],
    ['Next', 'Yours'],
  ];
  return (
    <ol className="grid grid-cols-6 gap-[8px]">
      {scales.map(([size, name], i) => {
        const last = i === scales.length - 1;
        return (
          <li key={name} className="flex flex-col gap-[6px]">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase">{size}</span>
            <span className="relative flex h-[9px] items-center">
              <span
                className={cn(
                  'z-1 size-[7px] rounded-full',
                  last ? 'border-primary-9 border bg-white' : 'bg-primary-9'
                )}
              />
              {!last && <span className="absolute inset-x-0 h-px bg-neutral-200" />}
            </span>
            <span className="text-[11px] leading-[14px] text-neutral-500">{name}</span>
          </li>
        );
      })}
    </ol>
  );
}
