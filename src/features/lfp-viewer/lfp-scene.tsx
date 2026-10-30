'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { hexAt, levelOf, SCALE_GRADIENT, SCENE_LEVELS } from '@/features/lfp-viewer/colour-scale';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import { circuitDrawsMorphologies } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { ColourScale } from '@/features/lfp-viewer/colour-scale';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';

const SCENE_FEATURES: Partial<IEntityViewerFeatures> = { nodesTable: false, colorBy: false };
/** Colours change at most this often while playing. */
const RECOLOR_MS = 50;
const SELECTED_COLOR = '#000000';
const LEVEL_COLORS = Array.from({ length: SCENE_LEVELS }, (_, i) =>
  hexAt((i / (SCENE_LEVELS - 1)) * 2 - 1)
);

type Props = {
  circuit: ICircuit;
  populationName: string | undefined;
  field: LfpField;
  scale: ColourScale;
  /** xyz per contact, in the report's order; null where the array's are not known. */
  positions: Float32Array | null;
  selectedContact: number | null;
  timeCursor: TimeCursor;
  active: boolean;
};

/**
 * The circuit with the report's contacts over it, each coloured by the field
 * there at the player's time, on the scale the map uses.
 */
export function LfpScene({
  circuit,
  populationName,
  field,
  scale,
  positions,
  selectedContact,
  timeCursor,
  active,
}: Props) {
  const [bin, setBin] = useState(0);
  const recoloredAt = useRef(0);
  const pending = useRef<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = timeCursor.subscribe((t) => {
      if (t === null) return;
      pending.current = binAt(field, t);
      const wait = RECOLOR_MS - (performance.now() - recoloredAt.current);
      if (timer) return;
      timer = setTimeout(
        () => {
          timer = null;
          recoloredAt.current = performance.now();
          if (pending.current !== null) setBin(pending.current);
        },
        Math.max(0, wait)
      );
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [timeCursor, field]);

  const drawn = useMemo<ICircuitOverlayGroup[] | undefined>(() => {
    if (!positions) return undefined;
    const byLevel: number[][] = LEVEL_COLORS.map(() => []);
    const selected: number[] = [];
    for (let c = 0; c < field.contacts; c++) {
      const xyz = [positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]];
      if (c === selectedContact) selected.push(...xyz);
      else byLevel[levelOf(scale.position(fieldValue(field, c, bin)))].push(...xyz);
    }
    const groups = byLevel.flatMap((coordinates, level) =>
      coordinates.length === 0
        ? []
        : [
            {
              name: `level ${level}`,
              id: `lfp-level-${level}`,
              color: LEVEL_COLORS[level],
              coordinates: Float32Array.from(coordinates),
            },
          ]
    );
    if (selected.length > 0) {
      groups.push({
        name: 'selected',
        id: 'lfp-selected',
        color: SELECTED_COLOR,
        coordinates: Float32Array.from(selected),
      });
    }
    return groups;
  }, [positions, field, scale, bin, selectedContact]);
  const electrodes = useMemo(() => ({ drawn }), [drawn]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-2xl">
      <CircuitScene
        circuit={circuit}
        largeCircuit={!circuitDrawsMorphologies(circuit.scale)}
        features={SCENE_FEATURES}
        populationName={populationName}
        showUnselectedPopulations={false}
        electrodes={electrodes}
        active={active}
      />
      <div className="pointer-events-none absolute top-3 right-3 rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] text-neutral-500 shadow-sm">
        <div className="h-2 w-40 rounded-full" style={{ background: SCALE_GRADIENT }} />
        <div className="mt-0.5 flex justify-between tabular-nums">
          <span>−{scale.limit.toFixed(0)}</span>
          <span>0</span>
          <span>+{scale.limit.toFixed(0)} µV</span>
        </div>
      </div>
      {!positions && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500">
          Where this report&apos;s contacts are is not stored with its recording array
        </div>
      )}
    </div>
  );
}
