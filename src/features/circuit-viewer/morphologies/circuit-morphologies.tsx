'use client';

import { useEffect, useRef, useState } from 'react';

import { themeFromBackground } from '@/features/scan-config/components/color-by/contrast';
import { AxesGizmo } from '@/features/viewer-3d/chrome/axes-gizmo';
import { Scalebar } from '@/features/viewer-3d/chrome/scalebar';
import { WheelHint } from '@/features/viewer-3d/chrome/status';
import { useWheelHint } from '@/features/viewer-3d/viewer-frame';
import { useLatest } from '@/ui/hooks/use-latest';

import { type ElectrodeTracker, trackElectrodes } from './electrodes';
import { CircuitMorphologyViewer } from './engine/circuit-morphology-viewer';
import { trackPointer } from './pointer';

import type { MorphoViewerSignals, MorphoViewerSnapshotOptions } from '@/morpho-viewer';
import type {
  CellColors,
  CircuitMorphologyData,
  ElectrodeGroup,
  ElectrodeTransform,
} from './types';

const NO_ELECTRODES: readonly ElectrodeGroup[] = [];

export interface CircuitMorphologiesProps {
  data: CircuitMorphologyData;
  /** As the somas view takes them: a palette and each cell's column of it. */
  cellColors: CellColors;
  /** What a cell with no colour of its own is drawn in. */
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
  backgroundColor: string;
  showScalebar: boolean;
  /** The circuit viewer's bus, on which this view answers the camera reset and the snapshot. */
  signals: MorphoViewerSignals;
}

/** The canvas as an image whose `src` is an object URL, which is what the snapshot signal hands on. */
function imageOf(
  canvas: HTMLCanvasElement,
  options?: MorphoViewerSnapshotOptions
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

export function CircuitMorphologies({
  data,
  cellColors,
  defaultColor,
  cellHover = false,
  onCellClick,
  electrodes = NO_ELECTRODES,
  electrodeRadius,
  selectedElectrode = null,
  onElectrodeTransform,
  backgroundColor,
  showScalebar,
  signals,
}: CircuitMorphologiesProps) {
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

  useEffect(() => viewer?.setDark(theme.isDark), [viewer, theme.isDark]);
  useEffect(() => viewer?.setData(data), [viewer, data]);
  useEffect(() => viewer?.setCellColors(cellColors), [viewer, cellColors]);
  useEffect(() => viewer?.setDefaultColor(defaultColor), [viewer, defaultColor]);
  useEffect(() => viewer?.setElectrodeRadius(electrodeRadius), [viewer, electrodeRadius]);

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

  const clicked = useLatest(onCellClick);
  const clickable = onCellClick !== undefined;
  useEffect(() => {
    const host = hostRef.current;
    if (!viewer || !host || !(cellHover || clickable)) return;
    return trackPointer(host, viewer, {
      hover: cellHover,
      onClick: clickable ? (cell) => clicked.current?.(cell) : undefined,
      // An electrode the pointer can take hold of is what it rests on, not the cell behind.
      taken: movable ? (x, y) => viewer.electrodeAt(x, y) !== null : undefined,
    });
  }, [viewer, cellHover, clickable, clicked, movable]);

  useEffect(() => {
    if (!viewer) return;
    const offReset = signals.cameraReset.register(() => viewer.resetView());
    const offSnapshot = signals.snapshot.register(async (options) => {
      const canvas = viewer.snapshot();
      return canvas && imageOf(canvas, options);
    });
    return () => {
      offReset();
      offSnapshot();
    };
  }, [viewer, signals]);

  return (
    <div className="absolute inset-0" data-testid="circuit-morphologies">
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
