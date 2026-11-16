'use client';

import { useMemo } from 'react';

import { NO_CELL_COLORS } from '@/features/circuit-viewer/morphologies/cell-colors';
import { LazyCircuitCells } from '@/features/circuit-viewer/morphologies/lazy-circuit-cells';
import { useCircuitMorphologies } from '@/features/circuit-viewer/morphologies/use-circuit-morphologies';
import { useCircuitViewerSignals } from '@/features/circuit-viewer/signals';
import { CANVAS_WHITE } from '@/features/scan-config/components/color-by/contrast';
import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';

import type {
  CircuitMorphologyData,
  CircuitSomas,
} from '@/features/circuit-viewer/morphologies/types';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { RepoPack } from './repo-packs';

const NO_POSITIONS = new Float32Array(0);
const NOTHING = () => {};
/** The size of the somas drawn before the morphologies are in: never, here, as these come together. */
const SOMA_RADIUS = 10;

/** The cells' places, in the circuit's frame, from the pack's own somas. */
function somasOf({ somas, centre, populations }: CircuitMorphologyData): CircuitSomas {
  const cells = somas.length / 4;
  const positions = new Float32Array(3 * cells);
  for (let cell = 0; cell < cells; cell++) {
    for (let axis = 0; axis < 3; axis++) {
      positions[3 * cell + axis] = somas[4 * cell + axis] + centre[axis];
    }
  }
  return { positions, populations };
}

/**
 * A pack in the repo in a 3D view of its own, in one colour, on white, its axons hidden. Nothing is read from the
 * platform, no circuit nor nodes file, so this needs no project and no sign-in, as the public landing has neither.
 * Framed, told what it is drawn over and told it is built through `ViewOverlay`, as any other view.
 */
export function PackView({
  pack,
  color,
  frameZoom,
  spin,
  aoMoving = false,
  spikes,
  onCellPick,
}: {
  pack: RepoPack;
  color: string;
  frameZoom?: number;
  spin: boolean;
  /** Shaded as it turns as when still, whatever that costs. */
  aoMoving?: boolean;
  spikes?: ISpikeReplayBinding;
  /** Told of a click on a cell, or null on a click beside them; without it, the view is only turned. */
  onCellPick?: (cell: number | null) => void;
}) {
  const signals = useCircuitViewerSignals();
  const source = useMemo(
    () => ({
      circuitId: pack.id,
      populations: [pack.population],
      positions: NO_POSITIONS,
      somaRadius: SOMA_RADIUS,
      pack,
    }),
    [pack]
  );
  const { load, stopped } = useCircuitMorphologies(source, NOTHING);
  const data = load.status === 'ready' ? load.data : null;
  const somas = useMemo(() => data && somasOf(data), [data]);
  return (
    <div className="relative size-full">
      {data && somas ? (
        <LazyCircuitCells
          somas={somas}
          somaRadius={SOMA_RADIUS}
          data={data}
          crowding={false}
          axons={false}
          cellColors={NO_CELL_COLORS}
          defaultColor={color}
          cellHover
          onCellClick={onCellPick}
          onEmptyClick={onCellPick && (() => onCellPick(null))}
          electrodeRadius={DEFAULT_ELECTRODE_RADIUS}
          spikes={spikes}
          backgroundColor={CANVAS_WHITE}
          showScalebar={false}
          spin={spin}
          aoMoving={aoMoving}
          frameZoom={frameZoom}
          signals={signals}
        />
      ) : (
        !stopped && <VisualizationLoadingIndicator />
      )}
    </div>
  );
}
