import { saveAs } from 'file-saver';
import { useSetAtom } from 'jotai';
import React from 'react';

import { centroidOf } from '@/features/circuit-nodes/geometry-utils';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import { useCircuitViewerDebugMode } from '@/features/circuit-viewer/debug-mode';
import { LazyCircuitCells } from '@/features/circuit-viewer/morphologies/lazy-circuit-cells';
import { MorphologiesStatus } from '@/features/circuit-viewer/morphologies/load-status';
import { useCircuitMorphologies } from '@/features/circuit-viewer/morphologies/use-circuit-morphologies';
import { themeFromBackground } from '@/features/scan-config/components/color-by/contrast';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import {
  DEFAULT_ELECTRODE_RADIUS,
  DEFAULT_SOMA_SIZE_SCALE,
} from '@/features/scan-config/components/color-by/use-viewer-config';
import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { useSomaRadius } from './hooks';

import type { ICircuit } from '@/api/entitycore/types';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type {
  CellColors,
  CircuitSomas,
  ElectrodeTransform,
} from '@/features/circuit-viewer/morphologies/types';
import type { CircuitViewerSignals } from '@/features/circuit-viewer/signals';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type {
  CircuitRepresentation,
  NodeColors,
} from '@/features/scan-config/components/color-by/types';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';

import styles from './large-circuit-preview.module.css';

/** Somas per JSON part of the debug download (see its `handleDownload`). */
const DOWNLOAD_CHUNK = 65_536;

/**
 * An empty palette: no cell has a colour of its own, so each soma runs along the somas' blue ramp by how crowded it
 * is, and each morphology is in the default colour.
 */
const VIEWER_DEFAULT_PALETTE: CellColors = {
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
   * in `positions` and take a palette column that draws nothing. That array is
   * what the viewer reads as the scene, and rebuilding it would refit the
   * camera.
   */
  hiddenPopulations?: readonly string[];
  /** the colour-by mapping's palette + palette column per node; undefined → viewer default */
  nodeColors?: NodeColors;
  /**
   * Colour for a morphology with none of its own. The somas have the viewer's
   * depth-shaded blue instead.
   */
  defaultColor?: string;
  /** Colour for the cells of the populations that are not on show. */
  recededColor?: string;
  /** Called with the population name when one of those cells is clicked. */
  onPopulationClick?: (populationName: string) => void;
  backgroundColor: string;
  /** Draw the scalebar down the side of the canvas. */
  showScalebar?: boolean;
  /** The viewer's bus: camera reset, snapshot and zoom. */
  signals: CircuitViewerSignals;
  /** Told the view's zoom whenever it changes, the user's own scrolling included. */
  onZoomChange?: (zoom: number) => void;
  /**
   * World-coordinate electrode overlays (same pipeline as CircuitViz), drawn
   * and moved alike over the somas and over the morphologies.
   */
  overlays?: ICircuitOverlayGroup[];
  /** Enable left-drag / right-drag on electrode overlays when form can write back. */
  overlaysInteractive?: boolean;
  /** Gesture-end transform → host `applyElectrodeOverlayTransform`. */
  onOverlayTransform?: (event: ElectrodeTransform) => void;
  /** Form-selected electrode block name → highlight in the 3D view. */
  highlightedOverlayId?: string | null;
  /** Soma paint opacity (0–1); electrodes stay fully opaque independently. */
  neuronOpacity?: number;
  /** Multiplier on the per-species soma radius. */
  somaSizeScale?: number;
  /**
   * What each cell is drawn as. The morphologies are loaded first, with the
   * somas on show until they are in.
   */
  representation?: CircuitRepresentation;
  /**
   * Called with `somas` when the morphologies asked for cannot be shown, and
   * with `morphologies` to try them again. Absent where the circuit is not
   * offered as morphologies.
   */
  onRepresentationChange?: (representation: CircuitRepresentation) => void;
  /** Where the morphologies' status goes, clear of the host's chrome. Top-centre when omitted. */
  statusPlace?: React.CSSProperties;
  /** Electrode marker radius (world units). */
  electrodeRadius?: number;
  /**
   * Viewer feature flags from domain `viewer` (via host). With `cellHover`
   * the soma or morphology under the pointer is highlighted.
   */
  features?: Partial<Pick<IEntityViewerFeatures, 'cellHover'>>;
  /**
   * Spikes to replay over the cells, somas or morphologies, and the transport
   * driving them. One viewer draws both, so a switch between the two keeps the
   * replay's moment and whether it plays.
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
  defaultColor = DEFAULT_NEURON_COLOR,
  recededColor,
  onPopulationClick,
  backgroundColor,
  showScalebar = true,
  signals,
  onZoomChange,
  overlays,
  overlaysInteractive = false,
  onOverlayTransform,
  highlightedOverlayId = null,
  neuronOpacity,
  somaSizeScale = DEFAULT_SOMA_SIZE_SCALE,
  representation = 'somas',
  onRepresentationChange,
  statusPlace,
  electrodeRadius = DEFAULT_ELECTRODE_RADIUS,
  features,
  spikes,
}: LargeCircuitPreviewProps) {
  const debugMode = useCircuitViewerDebugMode();
  const speciesRadius = useSomaRadius(circuit);
  const somaRadius = speciesRadius * somaSizeScale;
  const { config, error: configError } = useCircuitConfig(circuit);
  // Somas only: positions are all that is read, for every population at once,
  // and they are kept across selection changes, so selecting a population
  // recolours the somas in place and the camera stays where the user left it.
  // Nothing is reported placed until everything is, so anything placed at all
  // means the whole scene can be built.
  const { placed, failures, settled, download } = usePopulationsPlacement({
    circuit,
    populations,
  });
  const subjectName = population?.name;
  const subject = placed.find((entry) => entry.population.name === subjectName)?.geometry ?? null;
  const hidden = React.useMemo(() => new Set(hiddenPopulations), [hiddenPopulations]);
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
  // A population that could not be placed is context that goes undrawn, the one
  // on show included: an input population carries no positions, and picking it
  // out of the checklist should not take the circuit off the screen. Only a
  // scene with nothing in it at all is worth covering the canvas for, and then
  // the reason is whichever population failed.
  const noPlacement =
    !settled || placed.length > 0 ? null : (failures.values().next().value ?? null);
  const error = configError ?? noPopulation ?? noPlacement;

  const setCircuitSceneAnchor = useSetAtom(circuitSceneAnchorAtom);
  React.useEffect(() => {
    const anchor = subject && centroidOf(subject);
    if (anchor) setCircuitSceneAnchor(anchor);
  }, [subject, setCircuitSceneAnchor]);
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
  // from the placement alone: other somas are another scene to the viewer, whose
  // crowding it works out again, so this must not change when the selection
  // does. Colours are passed separately, below. The positions are straight
  // typed-array copies, since the geometries already hold the flat triples the
  // viewer reads.
  const cells = React.useMemo((): CircuitSomas => {
    const populations = placed.map(({ population: candidate, geometry }) => ({
      name: candidate.name,
      cells: geometry.count,
    }));
    // With a single population, reuse the placement's own array: the hook
    // keeps it alive anyway, so copying would double region-scale residency.
    if (placed.length === 1) return { positions: placed[0].geometry.positions, populations };
    let length = 0;
    for (const { geometry } of placed) length += geometry.positions.length;
    const all = new Float32Array(length);
    let offset = 0;
    for (const { geometry } of placed) {
      all.set(geometry.positions, offset);
      offset += geometry.positions.length;
    }
    return { positions: all, populations };
  }, [placed]);
  const { positions } = cells;

  // Only where something recedes: this colour follows the background, and a
  // single-population scene should not repaint when the background changes.
  // Hiding the population on show is not that exception it looks like:
  // nothing on screen is the selection then either, and the viewer's own ramp
  // would say the opposite, lighting the whole rest of the circuit up the
  // moment the user takes the selection out of it.
  // With the population on show unplaceable there is no selection on screen to
  // recede behind, and receding everything would grey the whole circuit out.
  const recede = hasContext && subject ? recededColor : undefined;

  // The mapping already arrives as a palette and a column per soma. This memo
  // writes the subject's columns at its offset in the scene and appends a
  // column for everything else, so at region scale a selection change costs one
  // typed-array copy, small enough to run inside a single frame.
  const cellColors = React.useMemo(() => {
    // Nothing to colour by, nothing receding and nothing hidden, so leave the
    // somas to the viewer's own ramp.
    if (!nodeColors && !recede && hidden.size === 0) return VIEWER_DEFAULT_PALETTE;

    const palette: (string | null | false)[] = nodeColors ? [...nodeColors.palette] : [];
    // Three entries are added here beyond the mapping's own colours: the
    // receded colour; `null`, which leaves a soma to the viewer's own ramp,
    // rather than a colour of our own, which would flatten an uncoloured cloud
    // to a single hue; and `false`, which the viewer reads as a cell to skip
    // entirely, so it is undrawn, unpickable and has no hover of its own. Each
    // takes a palette column on first use.
    // Spelt out rather than `??=`, which React Compiler 1.0.0 cannot lower,
    // leaving this recolour path uncompiled.
    let ownRampColumn: number | undefined;
    let recededColumn: number | undefined;
    let hiddenColumn: number | undefined;

    const columnByCell = new Uint16Array(positions.length / 3);
    let index = 0;
    for (const { population: candidate, geometry } of placed) {
      if (hidden.has(candidate.name)) {
        if (hiddenColumn === undefined) hiddenColumn = palette.push(false) - 1;
        columnByCell.fill(hiddenColumn, index, index + geometry.count);
      } else if (candidate.name === subjectName && nodeColors) {
        // The mapping's palette sits at the same indices here, so its columns
        // land as they are.
        columnByCell.set(nodeColors.columnByNode.subarray(0, geometry.count), index);
      } else if (candidate.name !== subjectName && recede !== undefined) {
        // One colour for a whole population: allocate the column once, then fill.
        if (recededColumn === undefined) recededColumn = palette.push(recede) - 1;
        columnByCell.fill(recededColumn, index, index + geometry.count);
      } else {
        if (ownRampColumn === undefined) ownRampColumn = palette.push(null) - 1;
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
  // Only offered when there is something to select.
  const canPickPopulation = onPopulationClick !== undefined && hasContext;

  const wantsMorphologies = representation === 'morphologies';
  const drawable = placed.length > 0 && !error;
  // The cells are numbered through `placed`, as `positions` and `cellColors`
  // are, so a morphology's cell is the soma of the same index.
  const morphologiesSource = React.useMemo(
    () =>
      wantsMorphologies && drawable
        ? {
            circuitId: circuit.id,
            populations: cells.populations,
            positions: cells.positions,
            somaRadius: speciesRadius,
          }
        : null,
    [wantsMorphologies, drawable, circuit.id, cells, speciesRadius]
  );
  const morphologies = useCircuitMorphologies(morphologiesSource, () =>
    onRepresentationChange?.('somas')
  );
  const shown = morphologies.load.status === 'ready' ? morphologies.load.data : null;

  return (
    <div className={cn(className, 'relative h-full w-full', styles.largeCircuitPreview)}>
      {placed.length === 0 && !error && <VisualizationLoadingIndicator download={download} />}
      {error && (
        <div className={styles.error}>
          <h2>
            Unable to load circuit <strong>{circuit.name}</strong>!
          </h2>
          <p>{error.message}</p>
        </div>
      )}
      {drawable && (
        <LazyCircuitCells
          somas={cells}
          somaRadius={somaRadius}
          somaOpacity={neuronOpacity}
          data={shown}
          cellColors={cellColors}
          defaultColor={defaultColor}
          cellHover={features?.cellHover ?? true}
          onCellClick={canPickPopulation ? handleCellClick : undefined}
          electrodes={overlays}
          electrodeRadius={electrodeRadius}
          selectedElectrode={highlightedOverlayId}
          onElectrodeTransform={overlaysInteractive ? onOverlayTransform : undefined}
          spikes={spikes}
          backgroundColor={backgroundColor}
          showScalebar={showScalebar}
          signals={signals}
          onZoomChange={onZoomChange}
        />
      )}
      {drawable && debugMode && subject && (
        <div className="absolute left-0 top-0 z-3">
          <Button onClick={handleDownload} className={styles.downloadButton}>
            Download {subject.count} nodes
          </Button>
        </div>
      )}
      <MorphologiesStatus
        load={morphologies.load}
        // Why they could not be shown is nothing to say where they are no longer offered.
        stopped={onRepresentationChange ? morphologies.stopped : null}
        theme={themeFromBackground(backgroundColor)}
        place={statusPlace}
        onRetry={() => onRepresentationChange?.('morphologies')}
        onDismiss={morphologies.dismiss}
      />
    </div>
  );
}
