import { saveAs } from 'file-saver';
import { useSetAtom } from 'jotai';
import React from 'react';

import { useCircuitViewerDebugMode } from '@/features/circuit-viewer/debug-mode';
import { cellColorsOf, populationRanges } from '@/features/circuit-viewer/morphologies/cell-colors';
import { LazyCircuitCells } from '@/features/circuit-viewer/morphologies/lazy-circuit-cells';
import { MorphologiesStatus } from '@/features/circuit-viewer/morphologies/load-status';
import {
  storedPackOf,
  useCircuitMorphologies,
} from '@/features/circuit-viewer/morphologies/use-circuit-morphologies';
import { themeFromBackground } from '@/features/scan-config/components/color-by/contrast';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import {
  DEFAULT_ELECTRODE_RADIUS,
  DEFAULT_SOMA_SIZE_SCALE,
} from '@/features/scan-config/components/color-by/use-viewer-config';
import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { usePlacedScene } from '@/features/scan-config/components/model-preview/use-placed-scene';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { useSomaRadius } from './hooks';

import type { ICircuit } from '@/api/entitycore/types';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { Fallback } from '@/features/circuit-viewer/morphologies/engine/create-view';
import type { ElectrodeTransform } from '@/features/circuit-viewer/morphologies/types';
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

/** What the rest of the population fades to while one of its somas is pointed out. */
const FADED = '#d4d4d4';

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
  /** One flag per cell of the population on show; a 0 takes that soma out the same way. */
  shownCells?: Uint8Array;
  /** A soma of the population on show to point out, by node index: every other one of it fades. */
  highlightedCell?: number;
  /** Told the node index of a clicked soma of the population on show. */
  onSubjectCellClick?: (index: number) => void;
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
  /** @see CircuitVizProps.onPositionlessPopulationsChange */
  onPositionlessPopulationsChange?: (names: ReadonlySet<string>) => void;
  backgroundColor: string;
  /** Draw the scalebar down the side of the canvas. */
  showScalebar?: boolean;
  spin?: boolean;
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
  /** Draw the morphologies' axons; drawn when omitted. */
  showAxons?: boolean;
  /** Frame the view on the morphologies as they come, until the user moves it. */
  followMorphologies?: boolean;
  /**
   * What each cell is drawn as. The morphologies are loaded first, with the
   * somas on show until they are in.
   */
  representation?: CircuitRepresentation;
  /**
   * Called with `morphologies` to try them again once they could not be shown.
   * Absent where the circuit is not offered as morphologies.
   */
  onRepresentationChange?: (representation: CircuitRepresentation) => void;
  /** Called where the morphologies asked for cannot be shown, none of them drawn. */
  onMorphologiesStopped?: () => void;
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
  shownCells,
  highlightedCell,
  onSubjectCellClick,
  nodeColors,
  defaultColor = DEFAULT_NEURON_COLOR,
  recededColor,
  onPopulationClick,
  onPositionlessPopulationsChange,
  backgroundColor,
  showScalebar = true,
  spin,
  signals,
  onZoomChange,
  overlays,
  overlaysInteractive = false,
  onOverlayTransform,
  highlightedOverlayId = null,
  neuronOpacity,
  somaSizeScale = DEFAULT_SOMA_SIZE_SCALE,
  showAxons,
  followMorphologies = false,
  representation = 'somas',
  onRepresentationChange,
  onMorphologiesStopped,
  statusPlace,
  electrodeRadius = DEFAULT_ELECTRODE_RADIUS,
  features,
  spikes,
}: LargeCircuitPreviewProps) {
  const debugMode = useCircuitViewerDebugMode();
  const speciesRadius = useSomaRadius(circuit);
  const somaRadius = speciesRadius * somaSizeScale;
  // Somas only: positions are all that is read, for every population at once,
  // and they are kept across selection changes, so selecting a population
  // recolours the somas in place and the camera stays where the user left it.
  const {
    placed,
    positionless,
    download,
    subject,
    anchor,
    hidden,
    hasContext,
    error,
    somas,
    receded,
  } = usePlacedScene({ circuit, population, populations, hiddenPopulations, recededColor });
  const subjectName = population?.name;
  // Before paint: see CircuitVisualization.
  React.useLayoutEffect(() => {
    onPositionlessPopulationsChange?.(positionless);
  }, [positionless, onPositionlessPopulationsChange]);

  const setCircuitSceneAnchor = useSetAtom(circuitSceneAnchorAtom);
  React.useEffect(() => {
    if (anchor) setCircuitSceneAnchor(anchor);
  }, [anchor, setCircuitSceneAnchor]);
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

  // `null`, the soma's own colour, leaves it to the viewer's ramp, where a
  // colour of ours would flatten an uncoloured cloud to a single hue.
  const cellColors = React.useMemo(
    () =>
      cellColorsOf({
        populations: somas.populations,
        subject: subjectName,
        nodeColors,
        receded,
        hidden,
        shownCells,
        highlightedCell,
        fadedColor: recededColor ?? FADED,
      }),
    [
      somas.populations,
      subjectName,
      nodeColors,
      receded,
      hidden,
      shownCells,
      highlightedCell,
      recededColor,
    ]
  );

  const handleCellClick = React.useCallback(
    (index: number) => {
      const range = populationRanges(somas.populations).find(({ end }) => index < end);
      if (!range) return;
      if (range.name !== subjectName) onPopulationClick?.(range.name);
      else onSubjectCellClick?.(index - range.first);
    },
    [somas.populations, subjectName, onPopulationClick, onSubjectCellClick]
  );
  // Only offered when there is something to select.
  const canPickPopulation =
    (onPopulationClick !== undefined && hasContext) || onSubjectCellClick !== undefined;

  const wantsMorphologies = representation === 'morphologies';
  const drawable = placed.length > 0 && !error;
  // The cells are numbered through `placed`, as `positions` and `cellColors`
  // are, so a morphology's cell is the soma of the same index.
  const stored = storedPackOf(circuit.assets);
  // By its fields: the circuit fetched again is the same pack.
  const { id: storedId, size: storedSize = 0, sha256: storedSha256 = null } = stored ?? {};
  // A circuit without a stored pack stays somas.
  const morphologiesSource = React.useMemo(
    () =>
      wantsMorphologies && drawable && storedId !== undefined
        ? {
            circuitId: circuit.id,
            ...somas,
            somaRadius: speciesRadius,
            stored: { id: storedId, size: storedSize, sha256: storedSha256 },
          }
        : null,
    [
      wantsMorphologies,
      drawable,
      circuit.id,
      somas,
      speciesRadius,
      storedId,
      storedSize,
      storedSha256,
    ]
  );
  const morphologies = useCircuitMorphologies(morphologiesSource, () => onMorphologiesStopped?.());
  const shown = morphologies.load.status === 'ready' ? morphologies.load.data : null;
  const [leftOut, setLeftOut] = React.useState(false);
  const [fallback, setFallback] = React.useState<Fallback | null>(null);

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
          somas={somas}
          somaRadius={somaRadius}
          somaOpacity={neuronOpacity}
          data={shown}
          follow={followMorphologies}
          axons={showAxons}
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
          spin={spin}
          signals={signals}
          onZoomChange={onZoomChange}
          onLeftOut={setLeftOut}
          onFallback={setFallback}
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
        leftOut={leftOut}
        fallback={fallback}
        theme={themeFromBackground(backgroundColor)}
        place={statusPlace}
        // Loaded again where the morphologies are still asked for; asked for again where the host went back to somas.
        onRetry={() =>
          wantsMorphologies ? morphologies.retry() : onRepresentationChange?.('morphologies')
        }
        onDismiss={morphologies.dismiss}
        onFallbackDismiss={() => setFallback(null)}
      />
    </div>
  );
}
