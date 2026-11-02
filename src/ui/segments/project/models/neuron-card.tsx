'use client';

import { RiArrowRightLine, RiCloseLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Fragment } from 'react';

import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { getMEModel } from '@/api/entitycore/queries/model/me-model';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { nodesWorkerRegistry } from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import { MODEL_CELL } from './models';

import type { ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { IMeshExample } from '@/ui/segments/project/start/items';

type TRows = Array<[label: string, value: ReactNode]>;

/** What was clicked, over the view's corner: in the walkthrough's type, a figure's caption more than a panel. */
function Card({
  title,
  subtitle,
  rows,
  href,
  onClose,
}: {
  title: string;
  subtitle?: string;
  /** Null while they are read. */
  rows: TRows | null;
  /** Its page in Data. */
  href?: string;
  onClose: () => void;
}) {
  return (
    <aside className="animate-fade-in text-primary-9 pointer-events-auto absolute right-[28px] bottom-[28px] z-10 w-[min(320px,calc(100%-56px))] rounded-[14px] bg-white/95 p-[20px] shadow-[0_10px_40px_rgba(0,39,102,0.14)] ring-1 ring-black/5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-[12px]">
        <p className="text-[10px] leading-[14px] font-semibold tracking-[0.16em] text-neutral-500 uppercase">
          Selected neuron
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the details"
          className="-mt-[4px] -mr-[6px] rounded-full p-[4px] text-neutral-400 hover:text-primary-9"
        >
          <RiCloseLine className="size-[16px]" />
        </button>
      </div>
      <h3 className="mt-[6px] text-[24px] leading-[28px] font-light break-words">{title}</h3>
      {subtitle && (
        <p className="mt-[2px] text-[12px] leading-[16px] break-all text-neutral-500">{subtitle}</p>
      )}
      <dl className="mt-[14px] grid grid-cols-[auto_1fr] gap-x-[14px] gap-y-[6px] border-t border-neutral-200 pt-[12px] text-[12px] leading-[16px]">
        {rows === null ? (
          <dd className="col-span-2 text-neutral-500">Reading its properties…</dd>
        ) : (
          rows.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="text-neutral-500">{label}</dt>
              <dd className="font-medium break-words">{value}</dd>
            </Fragment>
          ))
        )}
      </dl>
      {href && (
        <Link
          href={href}
          className="mt-[14px] inline-flex items-center gap-[6px] text-[12px] font-semibold hover:underline"
        >
          View in Data
          <RiArrowRightLine className="size-[13px]" />
        </Link>
      )}
    </aside>
  );
}

/** The properties that name a cell, the first found titling its card. */
const TITLE_KEYS = ['mtype', 'cell_type', 'type', 'hemibrain_type', 'instance'];
/** Then these, where the population has them, ahead of the rest. */
const FIRST_KEYS = [
  'etype',
  'layer',
  'region',
  'synapse_class',
  'morph_class',
  'super_class',
  'superclass',
  'class',
  'sub_class',
  'subclass',
  'nt_type',
  'predicted_nt',
  'neurotransmitter',
  'side',
  'morphology',
];
/** Not worth a row: where the cell is goes on one line, and how it is modelled is in Data. */
const SKIPPED =
  /^(x|y|z|orientation_[wxyz]|rotation_angle_[xyz]axis|model_template|model_type|dynamics_params|@.*)$/;
const LABELS: Record<string, string> = {
  mtype: 'M-type',
  etype: 'E-type',
  synapse_class: 'Synapse class',
  morph_class: 'Morphology class',
  super_class: 'Super class',
  superclass: 'Super class',
  sub_class: 'Sub class',
  nt_type: 'Neurotransmitter',
  predicted_nt: 'Neurotransmitter',
  cell_type: 'Cell type',
  hemibrain_type: 'Hemibrain type',
  root_id: 'FlyWire id',
};
const MOST_ROWS = 8;

const labelOf = (key: string) =>
  LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase());

function valueOf(value: string | number): string {
  if (typeof value === 'string') return value;
  return Number.isInteger(value) ? String(value) : String(Number.parseFloat(value.toFixed(2)));
}

/** A row of the nodes file as a card's rows: what names it, then what describes it, then where it is. */
function describeNode(row: Record<string, string | number>): { title: string | null; rows: TRows } {
  const present = (key: string) => key in row && row[key] !== '' && row[key] !== undefined;
  const titleKey = TITLE_KEYS.find(present) ?? null;
  const keys = [
    ...FIRST_KEYS.filter(present),
    ...Object.keys(row).filter((key) => !FIRST_KEYS.includes(key) && !SKIPPED.test(key)),
  ].filter((key) => key !== titleKey);
  const rows: TRows = keys.slice(0, MOST_ROWS).map((key) => [labelOf(key), valueOf(row[key])]);
  if (['x', 'y', 'z'].every(present)) {
    const position = ['x', 'y', 'z'].map((axis) => Math.round(Number(row[axis]))).join(', ');
    rows.push(['Position', `${position} µm`]);
  }
  return { title: titleKey ? valueOf(row[titleKey]) : null, rows };
}

/** A cell of a circuit, read from its population's nodes file in the worker the viewer opened. */
export function NodeCard({
  circuit,
  population,
  index,
  onClose,
}: {
  circuit: ICircuit;
  population: NodePopulation;
  index: number;
  onClose: () => void;
}) {
  const { config } = useCircuitConfig(circuit);
  const circuitAssetId = config?.circuitAssetId ?? '';
  const { columns, status } = useNodesWorker({
    enabled: true,
    circuitId: circuit.id,
    circuitAssetId,
    population,
  });
  const { data: row } = useQuery({
    queryKey: ['model-node', circuit.id, population.name, index],
    enabled: status === 'ready' && !!columns && !!circuitAssetId,
    queryFn: async () => {
      const key = nodesSessionKey(circuit.id, circuitAssetId, population.name);
      const { rows } = await nodesWorkerRegistry.getRows(key, {
        start: index,
        end: index + 1,
        columns: (columns ?? []).map(({ name }) => name),
      });
      return rows[0] ?? null;
    },
  });
  const described = row ? describeNode(row) : null;
  return (
    <Card
      title={described?.title ?? `Neuron ${index.toLocaleString('en')}`}
      subtitle={`Node ${index.toLocaleString('en')} of ${population.name}`}
      rows={described?.rows ?? null}
      onClose={onClose}
    />
  );
}

/** The homes' ME-model: what kind of cell it is, where from, and how it is modelled. */
export function MemodelCard({ onClose }: { onClose: () => void }) {
  const workspace = useWorkspace();
  const { data: memodel } = useQuery({
    queryKey: keyBuilder.entity({
      id: MODEL_CELL.id,
      context: workspace,
      type: EntityTypeDict.Memodel,
    }),
    queryFn: () => getMEModel({ id: MODEL_CELL.id, context: workspace }),
  });
  const mtype = memodel?.mtypes?.[0];
  const etype = memodel?.etypes?.[0];
  // The calibration carries the currents too, though the type names only the input resistance.
  const calibration = memodel?.calibration_result as
    | { threshold_current?: number | null; holding_current?: number | null }
    | undefined;
  const nanoamps = (value: number | null | undefined) =>
    typeof value === 'number' ? `${value.toFixed(2)} nA` : null;
  const rows: TRows | null = memodel
    ? (
        [
          ['M-type', mtype?.pref_label],
          ['E-type', etype ? `${etype.pref_label}, ${etype.alt_label.toLowerCase()}` : null],
          ['Species', memodel.species?.name],
          ['Brain region', memodel.brain_region?.name],
          ['Morphology', memodel.morphology?.name],
          ['E-model', memodel.emodel?.name],
          ['Threshold current', nanoamps(calibration?.threshold_current)],
          ['Holding current', nanoamps(calibration?.holding_current)],
        ] satisfies Array<[string, ReactNode]>
      ).filter(([, value]) => value)
    : null;
  return (
    <Card
      title={mtype?.alt_label ?? MODEL_CELL.name}
      subtitle={memodel?.name}
      rows={rows}
      href={`${resolveExploreDetailsPageUrl({ ctx: workspace, entityId: MODEL_CELL.id, dataType: ExtendedEntitiesTypeDict.Memodel })}/overview`}
      onClose={onClose}
    />
  );
}

/** One of the homes' EM meshes: which reconstruction it is from, and where in the brain. */
export function MeshCard({ example, onClose }: { example: IMeshExample; onClose: () => void }) {
  const workspace = useWorkspace();
  const { data: mesh } = useQuery({
    queryKey: keyBuilder.entity({
      id: example.meshId,
      context: workspace,
      type: EntityTypeDict.EMCellMesh,
    }),
    queryFn: () => getEmCellMesh({ id: example.meshId, context: workspace }),
  });
  const rows: TRows | null = mesh
    ? (
        [
          ['Reconstruction', example.source],
          ['Cell id', String(mesh.dense_reconstruction_cell_id)],
          ['Species', mesh.subject?.species?.name],
          ['Brain region', mesh.brain_region?.name],
          ['M-type', mesh.mtypes?.[0]?.pref_label],
          ['Release', mesh.release_version ? `v${mesh.release_version}` : null],
          ['Level of detail', mesh.level_of_detail],
        ] satisfies Array<[string, ReactNode]>
      ).filter(([, value]) => value !== null && value !== undefined && value !== '')
    : null;
  return (
    <Card
      title={example.title}
      subtitle={mesh?.name}
      rows={rows}
      href={`${resolveExploreDetailsPageUrl({ ctx: workspace, entityId: example.meshId, dataType: ExtendedEntitiesTypeDict.EMCellMesh })}/overview`}
      onClose={onClose}
    />
  );
}
