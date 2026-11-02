'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { EmCellMeshViewer } from '@/features/entities/em-cell-mesh/viewer/em-mesh-viewer';
import { meshAsset } from '@/features/entities/em-cell-mesh/viewer/mesh-asset';
import { circuitMorphologiesFlag, FlagsProvider, useFlags } from '@/features/feature-flags';
import { CANVAS_WHITE } from '@/features/scan-config/components/color-by/contrast';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import {
  CELL_VIEWER,
  FLAT_VIEWER,
  isModelCircuit,
  isModelMesh,
  MODEL_CELL,
  MODEL_CIRCUITS,
  MODEL_MESHES,
} from './models';
import { MemodelCard, MeshCard, NodeCard } from './neuron-card';
import { useModelCircuit } from './use-model-circuit';

import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ICircuitExample, IMeshExample } from '@/ui/segments/project/start/items';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { TModel } from './models';

// The viewer brings workers, WebGPU and h5wasm, none of which can be rendered on the server.
const CircuitScene = dynamic(
  () => import('@/features/circuit-viewer/circuit-scene').then((m) => m.CircuitScene),
  { ssr: false }
);

const NO_TABLE = { nodesTable: false, electrodes: false };
const CELL_MEMODEL = { id: MODEL_CELL.id, name: MODEL_CELL.name };

const viewerFallback = withErrorConfig({
  cls: { container: 'bg-white' },
  showButtons: false,
  customError: 'Error while loading the viewer',
});

/**
 * One of the platform's models in its 3D view, drawn bare inside `BareViewers`: a click on a
 * neuron tells what it is, a click beside it puts that away. Colour-by goes in `colorSlot`, for
 * a circuit, while there is one.
 */
export function ModelView({
  model,
  flat = false,
  colorSlot = null,
  frameZoom,
  color,
  colorBy,
  aoMoving = false,
  spin,
  pickable = true,
  onReady,
  spikes,
  highlightedCell,
  onCellPick,
}: {
  model: TModel;
  /** The cell laid flat, as its dendrogram. */
  flat?: boolean;
  colorSlot?: HTMLElement | null;
  /** A circuit framed at this zoom rather than its own. */
  frameZoom?: number;
  /** A circuit's neurons all in this one colour to begin with, rather than coloured by a property. */
  color?: string;
  /** A circuit's neurons coloured by this property of theirs, `node_id` among them, rather than as its example has it. */
  colorBy?: string;
  /** A circuit shaded as it turns as when still, whatever that costs. */
  aoMoving?: boolean;
  /** A circuit turning or not, rather than as its example has it. */
  spin?: boolean;
  /** A click on a neuron of a circuit, or on a mesh, tells what it is; off, the view is only turned. */
  pickable?: boolean;
  /** Told once a mesh is drawn whole. */
  onReady?: () => void;
  /** Spikes to light a circuit's cells by, replayed. */
  spikes?: ISpikeReplayBinding;
  /** A circuit's cell picked by the host, who is told of each pick with `onCellPick`, rather than its card shown. */
  highlightedCell?: number | null;
  onCellPick?: (cell: number | null) => void;
}) {
  if (isModelCircuit(model)) {
    const example = MODEL_CIRCUITS[model];
    const byProperty = example.viewerDefaults?.colorByProperty ?? {};
    return (
      <CircuitModelView
        example={{
          ...example,
          ...(frameZoom !== undefined && { frameZoom }),
          ...((color || colorBy || aoMoving || spin !== undefined) && {
            viewerDefaults: {
              ...example.viewerDefaults,
              ...(color && {
                colorByProperty: Object.fromEntries(Object.keys(byProperty).map((pop) => [pop, null])),
                neuronColor: color,
              }),
              ...(colorBy && {
                colorByProperty: Object.fromEntries(
                  Object.keys(byProperty).map((pop) => [pop, colorBy])
                ),
              }),
              ...(aoMoving && { aoMoving }),
              ...(spin !== undefined && { spin }),
            },
          }),
        }}
        colorSlot={colorSlot}
        pickable={pickable}
        spikes={spikes}
        highlightedCell={highlightedCell}
        onCellPick={onCellPick}
      />
    );
  }
  if (isModelMesh(model)) {
    return <MeshModelView example={MODEL_MESHES[model]} pickable={pickable} onReady={onReady} />;
  }
  return <CellModelView flat={flat} />;
}

/** A circuit's cells, its morphologies where it has them; in another project, its picture. */
function CircuitModelView({
  example,
  colorSlot,
  pickable,
  spikes,
  highlightedCell,
  onCellPick,
}: {
  example: ICircuitExample;
  colorSlot: HTMLElement | null;
  pickable: boolean;
  spikes?: ISpikeReplayBinding;
  highlightedCell?: number | null;
  onCellPick?: (cell: number | null) => void;
}) {
  const { circuit, isError, readable } = useModelCircuit(example);
  const flags = useFlags();
  // Drawn as morphologies whatever the user's own setting of the flag.
  const withMorphologies = useMemo(
    () => ({ ...flags, [circuitMorphologiesFlag.key]: true }),
    [flags]
  );
  const [population, setPopulation] = useState<NodePopulation | undefined>();
  const [own, setOwn] = useState<number | null>(null);
  // Picked by the host, or here, with its card.
  const hosted = onCellPick !== undefined;
  const picked = hosted ? (highlightedCell ?? null) : own;
  const setPicked = onCellPick ?? setOwn;

  if (!readable) return <Poster src={example.art} />;
  if (isError) return <Note>The circuit could not be loaded.</Note>;
  if (!circuit) return null;
  return (
    <>
      <ErrorBoundary FallbackComponent={viewerFallback}>
        <FlagsProvider flags={withMorphologies}>
          <CircuitScene
            circuit={circuit}
            largeCircuit
            viewerDefaults={example.viewerDefaults}
            frameZoom={example.frameZoom}
            spikes={spikes}
            features={NO_TABLE}
            colorByTarget={colorSlot}
            onCellClick={pickable ? setPicked : undefined}
            onEmptyClick={pickable ? () => setPicked(null) : undefined}
            highlightedCell={picked ?? undefined}
            onPopulationChange={setPopulation}
            populationName={example.population}
            showUnselectedPopulations={example.population === undefined}
          />
        </FlagsProvider>
      </ErrorBoundary>
      {!hosted && picked !== null && population && (
        <NodeCard
          circuit={circuit}
          population={population}
          index={picked}
          onClose={() => setPicked(null)}
        />
      )}
    </>
  );
}

/** The ME-model's one cell, turning; laid flat, its dendrogram. */
function CellModelView({ flat }: { flat: boolean }) {
  const [picked, setPicked] = useState(false);
  return (
    <>
      <ErrorBoundary FallbackComponent={viewerFallback}>
        <CircuitScene
          memodel={CELL_MEMODEL}
          viewerDefaults={flat ? FLAT_VIEWER : CELL_VIEWER}
          dendrogram={flat}
          onCellClick={() => setPicked(true)}
          onEmptyClick={() => setPicked(false)}
        />
      </ErrorBoundary>
      {picked && <MemodelCard onClose={() => setPicked(false)} />}
    </>
  );
}

/** An EM mesh, turning on white; a click on it tells which cell it is. */
function MeshModelView({
  example,
  pickable,
  onReady,
}: {
  example: IMeshExample;
  pickable: boolean;
  onReady?: () => void;
}) {
  const context = useWorkspace();
  const { data: mesh, isError } = useQuery({
    queryKey: keyBuilder.entity({ id: example.meshId, context, type: EntityTypeDict.EMCellMesh }),
    queryFn: () => getEmCellMesh({ id: example.meshId, context }),
  });
  const [picked, setPicked] = useState(false);
  const asset = meshAsset(mesh?.assets);
  if (isError) return <Note>The mesh could not be loaded.</Note>;
  if (!mesh || !asset) return null;
  return (
    <>
      <EmCellMeshViewer
        className="h-full"
        entity={{ id: mesh.id, name: example.title }}
        asset={asset}
        defaults={example.viewerDefaults}
        lightCanvas={CANVAS_WHITE}
        onSurfaceClick={pickable ? () => setPicked(true) : undefined}
        onEmptyClick={pickable ? () => setPicked(false) : undefined}
        onReady={onReady}
      />
      {picked && <MeshCard example={example} onClose={() => setPicked(false)} />}
    </>
  );
}

/** A picture of a circuit that cannot be read in this project. */
function Poster({ src }: { src?: string }) {
  if (!src) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center p-[48px]">
      <img src={src} alt="" className="max-h-full max-w-full object-contain" />
    </div>
  );
}

function Note({ children }: { children: string }) {
  return (
    <p className="absolute inset-0 flex items-center justify-center text-[13px] text-neutral-500">
      {children}
    </p>
  );
}
