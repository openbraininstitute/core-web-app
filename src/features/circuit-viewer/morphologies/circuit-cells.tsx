'use client';

import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_SPIKE_AFTERGLOW_IN_SECONDS,
  DEFAULT_SPIKE_SPEED,
} from '@/features/circuit-viewer/spike-clock';
import { themeFromBackground } from '@/features/scan-config/components/color-by/contrast';
import { clampZoom } from '@/features/scan-config/components/zoom-slider/scale';
import { AxesGizmo } from '@/features/viewer-3d/chrome/axes-gizmo';
import { Scalebar } from '@/features/viewer-3d/chrome/scalebar';
import { WheelHint } from '@/features/viewer-3d/chrome/status';
import { useWheelHint } from '@/features/viewer-3d/viewer-frame';
import { useLatest } from '@/ui/hooks/use-latest';
import { logError } from '@/utils/logger';

import { type ElectrodeTracker, trackElectrodes } from './electrodes';
import { CircuitMorphologyViewer } from './engine/circuit-morphology-viewer';
import { loadCrowding } from './load/load-crowding';
import { trackPointer } from './pointer';

import type { CircuitViewerSignals, SnapshotOptions } from '@/features/circuit-viewer/signals';
import type { ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type {
  CellColors,
  CircuitMorphologyData,
  CircuitSomas,
  ElectrodeGroup,
  ElectrodeTransform,
  LocationMarker,
  SynapseGroup,
} from './types';
import type { ViewLocations } from './use-location-selection';

const NO_ELECTRODES: readonly ElectrodeGroup[] = [];
const NO_MARKERS: readonly LocationMarker[] = [];
const NO_SYNAPSES: readonly SynapseGroup[] = [];

export interface CircuitCellsProps {
  /** The cells as the page placed them. Memoise it: other somas are another scene, and their crowding worked out again. */
  somas: CircuitSomas;
  /** A soma's radius, µm. */
  somaRadius: number;
  /** How opaque the somas are, from 0 to 1. */
  somaOpacity?: number;
  /** The cells' morphologies, drawn in the somas' place; null draws the somas. */
  data: CircuitMorphologyData | null;
  /** Frame the view on every new `data`, as morphologies coming in one at a time want, until the user moves it. */
  follow?: boolean;
  /** Shade each soma by how crowded its neighbourhood is, as the somas view did. Off where the somas are never drawn alone. */
  crowding?: boolean;
  /** Morph the morphologies whose dendrograms were charted into those. */
  dendrogram?: boolean;
  /** As the somas view takes them: a palette and each cell's column of it. */
  cellColors: CellColors;
  /** What a morphology with no colour of its own is drawn in; such a soma runs along the somas view's ramp. */
  defaultColor: string;
  /** Highlight the cell the pointer rests on. */
  cellHover?: boolean;
  /** Called with the cell that is clicked. */
  onCellClick?: (cell: number) => void;
  /** Electrode arrays drawn in front of the cells, in the colours the host gives them. */
  electrodes?: readonly ElectrodeGroup[];
  /** A contact's radius, in µm. */
  electrodeRadius: number;
  /** The array the form has selected, drawn larger and lighter. */
  selectedElectrode?: string | null;
  /** Told where an array was moved or turned to with the pointer; without it the arrays stay put. */
  onElectrodeTransform?: (transform: ElectrodeTransform) => void;
  /** Morphology locations: their markers, and what the pointer rests on and clicks of them and of the sections. */
  locations?: ViewLocations;
  /** Synapses on the cells, a colour a group. Memoise them: other groups are drawn again. */
  synapses?: readonly SynapseGroup[];
  /** Spikes to replay over the cells, and the transport driving them, as the somas view takes them and with its defaults. */
  spikes?: ISpikeReplayBinding;
  backgroundColor: string;
  showScalebar: boolean;
  /** The circuit viewer's bus, on which this view answers the camera reset, the snapshot, the zoom and the nudge. */
  signals: CircuitViewerSignals;
  /** Told the view's zoom whenever it changes, 1 as a reset frames it. */
  onZoomChange?: (zoom: number) => void;
}

/** The canvas as an image whose `src` is an object URL, which is what the snapshot signal hands on. */
function imageOf(
  canvas: HTMLCanvasElement,
  options?: SnapshotOptions
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(null);
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
          URL.revokeObjectURL(image.src);
          resolve(null);
        };
        image.src = URL.createObjectURL(blob);
      },
      options?.type,
      options?.quality
    );
  });
}

/**
 * A circuit's cells in one three.js view: the somas as the page placed them, and their morphologies in their place
 * once they are in, the camera, the colours and the replay kept from one to the other.
 */
export function CircuitCells({
  somas,
  somaRadius,
  somaOpacity = 1,
  data,
  follow = false,
  crowding = true,
  dendrogram = false,
  cellColors,
  defaultColor,
  cellHover = false,
  onCellClick,
  electrodes = NO_ELECTRODES,
  electrodeRadius,
  selectedElectrode = null,
  onElectrodeTransform,
  locations,
  synapses = NO_SYNAPSES,
  spikes,
  backgroundColor,
  showScalebar,
  signals,
  onZoomChange,
}: CircuitCellsProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [viewer, setViewer] = useState<CircuitMorphologyViewer | null>(null);
  const theme = themeFromBackground(backgroundColor);
  const wheelHint = useWheelHint(viewer);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const created = new CircuitMorphologyViewer(host);
    setViewer(created);
    return () => {
      setViewer(null);
      created.dispose();
    };
  }, []);

  // In this order: the default colour and the radius before the somas, so that these are painted and bounded once; the
  // crowding's worker set going before the somas are drawn, half crowded until it is done; the somas with the colours
  // they come with, painted once where both change; the morphologies over them.
  const colors = useLatest(cellColors);
  useEffect(() => viewer?.setDark(theme.isDark), [viewer, theme.isDark]);
  useEffect(() => viewer?.setDefaultColor(defaultColor), [viewer, defaultColor]);
  useEffect(() => viewer?.setSomaRadius(somaRadius), [viewer, somaRadius]);
  useEffect(() => {
    if (!viewer || !crowding) return;
    const controller = new AbortController();
    loadCrowding(somas.positions, controller.signal).then(
      (crowding) => {
        if (!controller.signal.aborted) viewer.setCrowding(somas, crowding);
      },
      (e: unknown) => {
        // The somas stay half crowded.
        if (!controller.signal.aborted) logError('Could not work out how crowded the somas are', e);
      }
    );
    return () => controller.abort();
  }, [viewer, somas, crowding]);
  useEffect(() => viewer?.setSomas(somas, colors.current), [viewer, somas, colors]);
  useEffect(() => viewer?.setCellColors(cellColors), [viewer, cellColors]);
  const following = useLatest(follow);
  useEffect(() => viewer?.setData(data, following.current), [viewer, data, following]);
  useEffect(() => viewer?.setSomaOpacity(somaOpacity), [viewer, somaOpacity]);
  useEffect(() => viewer?.setElectrodeRadius(electrodeRadius), [viewer, electrodeRadius]);
  useEffect(() => viewer?.setSynapses(synapses), [viewer, synapses]);
  useEffect(() => viewer?.setDendrogram(dendrogram), [viewer, dendrogram]);

  // Heard before the spikes are handed over, so that the host learns of the replay starting again with them.
  const timeChanged = useLatest(spikes?.onTimeChange);
  const playingChanged = useLatest(spikes?.onPlayingChange);
  useEffect(
    () => viewer?.onSpikeTime((time) => timeChanged.current?.(time)),
    [viewer, timeChanged]
  );
  useEffect(
    () => viewer?.onSpikesPlaying((playing) => playingChanged.current?.(playing)),
    [viewer, playingChanged]
  );
  const {
    data: spikeData,
    timeInMs,
    playing = false,
    speed = DEFAULT_SPIKE_SPEED,
    afterglowInSeconds = DEFAULT_SPIKE_AFTERGLOW_IN_SECONDS,
  } = spikes ?? {};
  useEffect(() => viewer?.setSpikes(spikeData ?? null), [viewer, spikeData]);
  useEffect(() => viewer?.setSpikeSpeed(speed), [viewer, speed]);
  useEffect(() => viewer?.setSpikeAfterglow(afterglowInSeconds), [viewer, afterglowInSeconds]);
  useEffect(() => {
    if (timeInMs !== undefined) viewer?.seekSpikes(timeInMs);
  }, [viewer, timeInMs]);
  useEffect(() => viewer?.setSpikesPlaying(playing), [viewer, playing]);

  const [electrodeTracker, setElectrodeTracker] = useState<ElectrodeTracker | null>(null);
  const transformed = useLatest(onElectrodeTransform);
  const movable = onElectrodeTransform !== undefined;
  useEffect(() => {
    const host = hostRef.current;
    if (!viewer || !host) return;
    const tracker = trackElectrodes(
      host,
      viewer,
      movable ? (transform) => transformed.current?.(transform) : undefined
    );
    setElectrodeTracker(tracker);
    return () => {
      setElectrodeTracker(null);
      tracker.stop();
    };
  }, [viewer, movable, transformed]);
  useEffect(
    () => electrodeTracker?.show(electrodes, selectedElectrode),
    [electrodeTracker, electrodes, selectedElectrode]
  );

  const markers = locations?.markers ?? NO_MARKERS;
  const markerRadius = locations?.radius;
  useEffect(() => viewer?.setLocationMarkers(markers), [viewer, markers]);
  useEffect(() => {
    if (markerRadius !== undefined) viewer?.setLocationMarkerRadius(markerRadius);
  }, [viewer, markerRadius]);
  const markersOnScreen = useLatest(locations?.onMarkersOnScreen);
  const labelled = locations?.onMarkersOnScreen !== undefined;
  useEffect(() => {
    if (!viewer || !labelled) return;
    return viewer.onMarkersOnScreen((onScreen) => markersOnScreen.current?.(onScreen));
  }, [viewer, labelled, markersOnScreen]);

  const clicked = useLatest(onCellClick);
  const clickable = onCellClick !== undefined;
  const located = useLatest(locations);
  const previewing = locations?.onHover !== undefined;
  const picking = locations?.onPick !== undefined;
  useEffect(() => {
    const host = hostRef.current;
    if (!viewer || !host || !(cellHover || clickable || previewing || picking)) return;
    return trackPointer(host, viewer, {
      hover: cellHover,
      onClick: clickable ? (cell) => clicked.current?.(cell) : undefined,
      // An electrode the pointer can take hold of is what it rests on, not the cell behind.
      taken: movable ? (x, y) => viewer.electrodeAt(x, y) !== null : undefined,
      locations:
        previewing || picking
          ? {
              onHover: previewing ? (hit) => located.current?.onHover?.(hit) : undefined,
              onPick: picking ? (hit) => located.current?.onPick?.(hit) : undefined,
              pickable: (spot) => located.current?.pickable(spot) ?? false,
            }
          : undefined,
    });
  }, [viewer, cellHover, clickable, clicked, movable, previewing, picking, located]);

  const zoomChanged = useLatest(onZoomChange);
  const zoomHeard = onZoomChange !== undefined;
  useEffect(() => {
    if (!viewer || !zoomHeard) return;
    // At once too: the view may have been zoomed while nothing listened.
    zoomChanged.current?.(viewer.zoom);
    return viewer.onPixelScaleChange(() => zoomChanged.current?.(viewer.zoom));
  }, [viewer, zoomChanged, zoomHeard]);

  useEffect(() => {
    if (!viewer) return;
    const offReset = signals.cameraReset.register(() => viewer.resetView());
    const offSnapshot = signals.snapshot.register(async (options) => {
      const canvas = viewer.snapshot();
      return canvas && imageOf(canvas, options);
    });
    const offZoom = signals.setZoom.register((zoom) => viewer.setZoom(clampZoom(zoom)));
    const offNudge = signals.nudgeMorphology.register(() => viewer.nudge());
    return () => {
      offReset();
      offSnapshot();
      offZoom();
      offNudge();
    };
  }, [viewer, signals]);

  return (
    <div className="absolute inset-0" data-testid="circuit-cells">
      <div className="absolute inset-0" ref={hostRef} />
      {viewer && (
        <div className="pointer-events-none absolute inset-0">
          {showScalebar && <Scalebar viewer={viewer} color={theme.foreground} />}
          <AxesGizmo viewer={viewer} ring={theme.foreground} />
          <WheelHint visible={wheelHint} theme={theme} />
        </div>
      )}
    </div>
  );
}
