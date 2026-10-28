import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ElectrodeTransform } from '@/features/circuit-viewer/morphologies/types';
import type { CircuitViewerSignals } from '@/features/circuit-viewer/signals';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';

/** How every viewer `CircuitScene` hosts is drawn, whatever it draws. */
export interface CircuitViewerHostProps {
  /** Draw the morphologies' axons; drawn when omitted. */
  showAxons?: boolean;
  backgroundColor: string;
  /** Draw the scalebar down the side of the canvas. */
  showScalebar?: boolean;
  spin?: boolean;
  /** The viewer's bus: camera reset, snapshot, zoom and the form hint's nudge. */
  signals: CircuitViewerSignals;
  /** Told the view's zoom whenever it changes, the user's own scrolling included. */
  onZoomChange?: (zoom: number) => void;
  /** World-coordinate electrode overlays, drawn and moved alike over the somas and over the morphologies. */
  overlays?: ICircuitOverlayGroup[];
  /**
   * Enable left-drag (translate) / right-drag or Alt/Shift (rotate) on overlays.
   * Why gated: only when `setConfig` exists so 3D edits can write the form.
   */
  overlaysInteractive?: boolean;
  /** Told on gesture end with absolute origin + rotation; the host applies it with `applyElectrodeOverlayTransform`. */
  onOverlayTransform?: (event: ElectrodeTransform) => void;
  /** Form-selected electrode block name → highlight in the 3D view. */
  highlightedOverlayId?: string | null;
  /**
   * How opaque the somas drawn alone are (0–1). The morphologies are drawn
   * opaque whatever this is, with the electrodes in front of them.
   */
  neuronOpacity?: number;
  /** Electrode marker radius in world units. */
  electrodeRadius?: number;
  /**
   * Viewer feature flags from domain `viewer` (via host). With `cellHover`
   * the soma or morphology under the pointer is highlighted.
   */
  features?: Partial<Pick<IEntityViewerFeatures, 'cellHover'>>;
  /** Spikes to replay over the cells, and the transport driving them. */
  spikes?: ISpikeReplayBinding;
  /** Told of a click on the scene's empty space. */
  onEmptyClick?: () => void;
  /** Told whether spiking cells can give off light, whenever that changes. */
  onGlowAvailableChange?: (available: boolean) => void;
}

/** The cells of a circuit both circuit hosts draw, and what is told of clicks on them. */
export interface CircuitCellsHostProps {
  circuit: ICircuit;
  /**
   * The SONATA node population on show. Host-owned and shared with colour-by,
   * so `nodeColors` stays indexed against the cells it colours.
   *
   * Required but nullable: undefined is the honest value while
   * `circuit_config.json` is still loading, but a caller that leaves it out
   * altogether would land on "this circuit declares no node populations" — a
   * message blaming the data for a bug in the call.
   */
  population: NodePopulation | undefined;
  /**
   * Every population to draw, in declared order, including `population`. The
   * others are drawn receded, or not at all when their nodes carry no positions.
   */
  populations: readonly NodePopulation[];
  /** Populations taken out of the scene, by name: their cells are not drawn, nor their morphologies read. */
  hiddenPopulations?: readonly string[];
  /** One flag per cell of the population on show; a 0 takes that cell out. */
  shownCells?: Uint8Array;
  /**
   * A cell of the population on show to point out, by node index: drawn in its
   * own colour, the rest of the population faded where somas are drawn and
   * hidden where morphologies are.
   */
  highlightedCell?: number;
  /** The colour-by mapping's palette + palette column per node; undefined → viewer default. */
  nodeColors?: NodeColors;
  /** Colour for a cell with no colour of its own. */
  defaultColor?: string;
  /** Colour for the cells of the populations that are not on show. */
  recededColor?: string;
  /** Called with the population name when a cell of another population is clicked. */
  onPopulationClick?: (populationName: string) => void;
  /** Called with the node index when a cell of the population on show is clicked. */
  onSubjectCellClick?: (index: number) => void;
  /** Called with the populations whose nodes carry no x/y/z, whenever that set changes. */
  onPositionlessPopulationsChange?: (names: ReadonlySet<string>) => void;
}
