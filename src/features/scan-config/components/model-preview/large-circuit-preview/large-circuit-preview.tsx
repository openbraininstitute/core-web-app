import { saveAs } from 'file-saver';
import { useSetAtom } from 'jotai';
import React from 'react';

import { centroidOf } from '@/features/circuit-nodes/geometry-utils';
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
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type {
  MorphoViewerCellColors,
  MorphoViewerOverlayTransformEvent,
  MorphoViewerSignals,
} from '@/morpho-viewer';

import styles from './large-circuit-preview.module.css';

/** Somas per JSON part of the debug download (see its `handleDownload`). */
const DOWNLOAD_CHUNK = 65_536;

/** An empty palette: the viewer falls back to its own depth-shaded blue. */
const VIEWER_DEFAULT_PALETTE: MorphoViewerCellColors = {
  palette: [],
  columnByCell: new Uint16Array(0),
};

export interface LargeCircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
  /**
   * Host-owned, so `nodeColors` is indexed against the cells it colours.
   *
   * Required but nullable: undefined is the honest value while
   * `circuit_config.json` is still loading, but a caller that leaves it out
   * altogether would land on "this circuit declares no node populations" — a
   * message blaming the data for a bug in the call.
   */
  population: NodePopulation | undefined;
  /** @see CircuitVizProps.populations */
  populations: readonly NodePopulation[];
  /**
   * Populations taken out of the scene, by name. Their somas keep their place
   * in `positions` — that array is what the viewer reads as the scene, and
   * rebuilding it would refit the camera — and take a palette column that draws
   * nothing.
   */
  hiddenPopulations?: readonly string[];
  /** the colour-by mapping's palette + palette column per node; undefined → viewer default */
  nodeColors?: NodeColors;
  /** Colour for the somas of the populations that are not on show. */
  recededColor?: string;
  /** Called with the population name when one of those somas is clicked. */
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

export function LargeCircuitPreview({
  className,
  circuit,
  population,
  populations,
  hiddenPopulations,
  nodeColors,
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
  // and they are kept across selection changes, so selecting a population
  // recolours the somas in place and the camera stays where the user left it.
  // Nothing is reported placed until everything is, so having the subject means
  // the whole scene can be built.
  const { placed, failures } = usePopulationsPlacement({ circuit, populations });
  const subjectName = population?.name;
  const subject = placed.find((entry) => entry.population.name === subjectName)?.geometry ?? null;
  const hidden = React.useMemo(() => new Set(hiddenPopulations), [hiddenPopulations]);
  const subjectHidden = subjectName !== undefined && hidden.has(subjectName);
  // Context is what is on screen beside the subject, so a hidden population is
  // not it: there is nothing to recede behind the subject and nothing a click
  // could land on.
  const hasContext = placed.some(
    (entry) => entry.population.name !== subjectName && !hidden.has(entry.population.name)
  );

  // A config that loads but names no node population would otherwise leave the
  // viewer on its spinner for good: nothing is asked for, so nothing ever fails.
  const noPopulation =
    config && !population
      ? new Error('This circuit’s circuit_config.json declares no node populations')
      : null;
  // A failure of the population on show fails the viewer; a failure of any
  // other population is context that simply goes undrawn.
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
    const { count, positions: coords } = subject;
    // One JSON part per chunk of somas, concatenated by the Blob itself: no
    // tuple object per node, and no single region-sized string on the main
    // thread.
    const parts: string[] = ['['];
    for (let start = 0; start < count; start += DOWNLOAD_CHUNK) {
      let part = '';
      for (let node = start; node < Math.min(count, start + DOWNLOAD_CHUNK); node++) {
        part += `${node === 0 ? '' : ','}[${coords[node * 3]},${coords[node * 3 + 1]},${coords[node * 3 + 2]}]`;
      }
      parts.push(part);
    }
    parts.push(']');
    saveAs(new Blob(parts, { type: 'application/json' }), `${circuit.id}.json`);
  };

  // In declared order, with the population on show in its own place, so a soma
  // keeps its index and position whichever population is selected. Built once,
  // from the placement alone: the viewer treats a new `positions` array as a
  // new scene and resets the camera, so this must not change when the selection
  // does. Colours are passed separately, below. These are straight typed-array
  // copies, since the geometries already hold the flat triples the viewer
  // reads.
  const positions = React.useMemo(() => {
    // With a single population, reuse the placement's own array: the hook
    // keeps it alive anyway, so copying would double region-scale residency.
    if (placed.length === 1) return placed[0].geometry.positions;
    let length = 0;
    for (const { geometry } of placed) length += geometry.positions.length;
    const all = new Float32Array(length);
    let offset = 0;
    for (const { geometry } of placed) {
      all.set(geometry.positions, offset);
      offset += geometry.positions.length;
    }
    return all;
  }, [placed]);

  // Only when something actually recedes: this colour follows the background,
  // and a single-population scene should not repaint when the background
  // changes. Nor when the subject is itself hidden — nothing is left to recede
  // behind, so what is on screen takes the viewer's own ramp instead.
  const recede = hasContext && !subjectHidden ? recededColor : undefined;

  // The mapping already arrives as a palette and a column per soma. This memo
  // writes the subject's columns at its offset in the scene and appends a
  // column for everything else, so at region scale a selection change costs one
  // typed-array copy, small enough to run inside a single frame.
  const cellColors = React.useMemo(() => {
    // Nothing to colour by, nothing receding and nothing hidden, so leave the
    // viewer to its own depth-shaded blue, as it draws today.
    if (!nodeColors && !recede && hidden.size === 0) return VIEWER_DEFAULT_PALETTE;

    const palette: (string | null | false)[] = nodeColors ? [...nodeColors.palette] : [];
    // Three entries are added here beyond the mapping's own colours: the
    // receded colour; `null`, which leaves a soma to the viewer's own ramp,
    // rather than a colour of our own, which would flatten an uncoloured cloud
    // to a single hue; and `false`, which the viewer reads as a soma to skip
    // entirely — undrawn, unpickable, and with no hover of its own. Each takes
    // a palette column on first use.
    let ownRampColumn: number | undefined;
    let recededColumn: number | undefined;
    let hiddenColumn: number | undefined;

    const columnByCell = new Uint16Array(positions.length / 3);
    let index = 0;
    for (const { population: candidate, geometry } of placed) {
      if (hidden.has(candidate.name)) {
        hiddenColumn ??= palette.push(false) - 1;
        columnByCell.fill(hiddenColumn, index, index + geometry.count);
      } else if (candidate.name === subjectName && nodeColors) {
        // The mapping's palette sits at the same indices here, so its columns
        // land as they are.
        columnByCell.set(nodeColors.columnByNode.subarray(0, geometry.count), index);
      } else if (candidate.name !== subjectName && recede !== undefined) {
        // One colour for a whole population: allocate the column once, then fill.
        recededColumn ??= palette.push(recede) - 1;
        columnByCell.fill(recededColumn, index, index + geometry.count);
      } else {
        ownRampColumn ??= palette.push(null) - 1;
        columnByCell.fill(ownRampColumn, index, index + geometry.count);
      }
      index += geometry.count;
    }
    return { palette, columnByCell };
  }, [placed, subjectName, positions.length, nodeColors, recede, hidden]);

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
  // Only offered when there is something to select: the viewer builds its pick
  // buffer on the first click, which at region scale is a second copy of every
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
          positions={positions}
          cellColors={cellColors}
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
