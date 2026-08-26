import { saveAs } from 'file-saver';
import { useSetAtom } from 'jotai';
import React from 'react';

import { centroidOf, positionAt } from '@/features/circuit-nodes/geometry-utils';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { resolveScalebar } from '@/features/scan-config/components/shared/3d-viewer';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';
import {
  MorphoViewerCircuitMultipleNeuronsSomaOnly,
  useMorphoViewerDebugMode,
} from '@/morpho-viewer';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { useSomaRadius } from './hooks';

import type { ICircuit } from '@/api/entitycore/types';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { MorphoViewerOverlayTransformEvent, MorphoViewerSignals } from '@/morpho-viewer';

import styles from './large-circuit-preview.module.css';

/**
 * Stands in for a per-cell morphology id, which somas-only has no use for.
 *
 * The viewer reads `morphologyId` in exactly one place — `sameGeometry`, to
 * decide whether a new `cellInfos` array is a recolour or a rebuild — and it
 * compares the position alongside it in the same loop. The position is what
 * actually discriminates, so one shared string behaves identically to a
 * distinct one per node and allocates nothing at region scale.
 */
const SHARED_MORPHOLOGY_ID = '';

export interface LargeCircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
  /**
   * Host-owned, so `colorsByNode` is indexed against the cells it colours.
   *
   * Required but nullable: undefined is the honest value while
   * `circuit_config.json` is still loading, but a caller that leaves it out
   * altogether would land on "this circuit declares no node populations" — a
   * message blaming the data for a bug in the call.
   */
  population: NodePopulation | undefined;
  /** @see CircuitVizProps.populations */
  populations: readonly NodePopulation[];
  /** per-node colors aligned by node index; undefined → viewer default  */
  colorsByNode?: string[];
  /** Paint for the somas of the populations not on show. */
  recededColor?: string;
  /** A click on one of those somas, naming its population. */
  onPopulationClick?: (populationName: string) => void;
  backgroundColor: string;
  /** scalebar pin/label color (adaptive mode); undefined → package default  */
  scalebarColor?: string;
  /** Draw the scalebar down the side of the canvas. */
  showScalebar?: boolean;
  /** signal bus: dispatch camera reset / snapshot; `snapshotReady` returns the image */
  signals: MorphoViewerSignals;
  /**
   * World-coordinate electrode overlays (same pipeline as CircuitViz).
   * Large circuits draw somas only; overlay interaction is identical.
   */
  overlays?: ICircuitOverlayGroup[];
  /** Enable left-drag / right-drag on electrode overlays when form can write back. */
  overlaysInteractive?: boolean;
  /** Gesture-end transform → host `applyElectrodeOverlayTransform`. */
  onOverlayTransform?: (event: MorphoViewerOverlayTransformEvent) => void;
  /** Form-selected electrode block name → highlight in the 3D view. */
  highlightedOverlayId?: string | null;
  /** Soma paint opacity (0–1); electrodes stay fully opaque independently. */
  neuronOpacity?: number;
  /** Electrode marker radius (world units). */
  electrodeRadius?: number;
  /**
   * Viewer feature flags from domain `viewer` (via host).
   * Reserved for parity with {@link CircuitViz}; soma-only path has no cell hover.
   */
  features?: Partial<Pick<IEntityViewerFeatures, 'cellHover'>>;
  /**
   * Spikes to replay over the somas, and the transport driving them.
   *
   * A soma lights up the same way a morphology does — the viewer takes a
   * brightness per cell either way — so this is the identical binding
   * {@link CircuitViz} gets, spread across the same props.
   */
  spikes?: ISpikeReplayBinding;
}

interface CellInfo {
  /**
   * Required by morphoviewer, but never rendered: it feeds one
   * change-detection diff (`sameGeometry`) that gates the cheap recolour path,
   * and that diff compares positions in the same loop. The node index is
   * therefore as good as a real morphology name here, and reading the
   * `morphology` column to fill it would cost a JS string per node.
   */
  morphologyId: string;
  position: [number, number, number];
  color?: string;
}

export function LargeCircuitPreview({
  className,
  circuit,
  population,
  populations,
  colorsByNode,
  recededColor,
  onPopulationClick,
  backgroundColor,
  scalebarColor,
  showScalebar = true,
  signals,
  overlays,
  overlaysInteractive = false,
  onOverlayTransform,
  highlightedOverlayId = null,
  neuronOpacity,
  electrodeRadius = DEFAULT_ELECTRODE_RADIUS,
  spikes,
}: LargeCircuitPreviewProps) {
  const debugMode = useMorphoViewerDebugMode();
  const somaRadius = useSomaRadius(circuit);
  const { config, error: configError } = useCircuitConfig(circuit);
  // Somas only: positions are all that is read, for every population at once,
  // and they are kept across selection changes — so selecting a population
  // recolours the somas in place, and the camera stays where the user left it.
  // Nothing is placed until everything is, so a subject in hand means the
  // scene can be built.
  const { placed, failures } = usePopulationsPlacement({ circuit, populations });
  const subjectName = population?.name;
  const subject = placed.find((entry) => entry.population.name === subjectName)?.geometry ?? null;
  const hasContext = placed.some((entry) => entry.population.name !== subjectName);

  // A config that loads but names no node population would otherwise leave the
  // viewer on its spinner for good: nothing is asked for, so nothing ever fails.
  const noPopulation =
    config && !population
      ? new Error('This circuit’s circuit_config.json declares no node populations')
      : null;
  // The population on show failing is the viewer failing; another population
  // failing is context that goes undrawn.
  const error =
    configError ??
    noPopulation ??
    (subjectName === undefined ? null : (failures.get(subjectName) ?? null));

  const setCircuitSceneAnchor = useSetAtom(circuitSceneAnchorAtom);
  React.useEffect(() => {
    const anchor = subject && centroidOf(subject);
    if (anchor) setCircuitSceneAnchor(anchor);
  }, [subject, setCircuitSceneAnchor]);
  const scalebar = React.useMemo(
    () => resolveScalebar(showScalebar, scalebarColor),
    [scalebarColor, showScalebar]
  );
  const handleDownload = () => {
    if (!subject) return;
    const { count } = subject;
    const triples = Array.from({ length: count }, (_, i) => positionAt(subject, i));
    const blob = new Blob([JSON.stringify(triples)], { type: 'application/json' });
    saveAs(blob, `${circuit.id}.json`);
  };

  // In declared order, the population on show at its own place in it, so a
  // soma keeps its index and position whichever population is selected. The
  // viewer takes a same-shaped `cellInfos` as a recolour and anything else as
  // a new scene, camera reset included — selecting a population has to be the
  // former. Split from the recolour below so a selection change rebuilds only
  // the `CellInfo` wrappers, not a position tuple per node as well.
  const positions = React.useMemo(
    () =>
      placed.flatMap(({ geometry }) =>
        Array.from({ length: geometry.count }, (_, i) => positionAt(geometry, i))
      ),
    [placed]
  );

  // Only where something recedes: the colour follows the background, and a
  // scene of one population has no reason to rebuild on a background change.
  const recede = hasContext ? recededColor : undefined;
  const cellInfos = React.useMemo(() => {
    const infos = new Array<CellInfo>(positions.length);
    let index = 0;
    for (const { population: candidate, geometry } of placed) {
      const onShow = candidate.name === subjectName;
      for (let local = 0; local < geometry.count; local++, index++) {
        infos[index] = {
          morphologyId: SHARED_MORPHOLOGY_ID,
          position: positions[index],
          color: onShow ? colorsByNode?.[local] : recede,
        };
      }
    }
    return infos;
  }, [placed, subjectName, positions, colorsByNode, recede]);

  const handleCellClick = React.useCallback(
    (index: number) => {
      let end = 0;
      for (const { population: candidate, geometry } of placed) {
        end += geometry.count;
        if (index < end) {
          if (candidate.name !== subjectName) onPopulationClick?.(candidate.name);
          return;
        }
      }
    },
    [placed, subjectName, onPopulationClick]
  );
  // Offered only with something to select: the viewer builds its pick buffer
  // on the first click, which at region scale is a second copy of every
  // position.
  const canPickPopulation = onPopulationClick !== undefined && hasContext;

  const morphoOverlays = React.useMemo(
    () =>
      overlays?.map(({ color, coordinates, id, kind, origin, rotation }) => ({
        color,
        coordinates,
        id,
        kind,
        origin,
        rotation,
      })),
    [overlays]
  );

  return (
    <div className={cn(className, 'relative h-full w-full', styles.largeCircuitPreview)}>
      {!subject && !error && <VisualizationLoadingIndicator />}
      {error && (
        <div className={styles.error}>
          <h2>
            Unable to load circuit <strong>{circuit.name}</strong>!
          </h2>
          <p>{error.message}</p>
        </div>
      )}
      {subject && !error && (
        <MorphoViewerCircuitMultipleNeuronsSomaOnly
          somaRadius={somaRadius}
          gizmo
          scalebar={scalebar}
          cellInfos={cellInfos}
          backgroundColor={backgroundColor}
          signals={signals}
          overlays={morphoOverlays}
          overlaysRadius={electrodeRadius}
          overlaysMinRadiusInPixels={Math.max(2, Math.round(electrodeRadius * 0.32))}
          overlaysInteractive={overlaysInteractive}
          onOverlayTransform={onOverlayTransform}
          highlightedOverlayId={highlightedOverlayId}
          neuronOpacity={neuronOpacity}
          onCellClick={canPickPopulation ? handleCellClick : undefined}
          spikes={spikes?.data}
          spikeTime={spikes?.timeInMs}
          onSpikeTimeChange={spikes?.onTimeChange}
          spikePlaying={spikes?.playing}
          onSpikePlayingChange={spikes?.onPlayingChange}
          spikeSpeed={spikes?.speed}
          spikeAfterglowInSeconds={spikes?.afterglowInSeconds}
          controls={[
            debugMode
              ? [
                  <Button key="download" onClick={handleDownload} className={styles.downloadButton}>
                    Download {subject.count} nodes
                  </Button>,
                ]
              : [],
          ]}
        />
      )}
    </div>
  );
}
