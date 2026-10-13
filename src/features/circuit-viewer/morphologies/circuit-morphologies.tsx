'use client';

import { useEffect, useRef, useState } from 'react';

import { themeFromBackground } from '@/features/scan-config/components/color-by/contrast';
import { AxesGizmo } from '@/features/viewer-3d/chrome/axes-gizmo';
import { Scalebar } from '@/features/viewer-3d/chrome/scalebar';
import { WheelHint } from '@/features/viewer-3d/chrome/status';
import { useWheelHint } from '@/features/viewer-3d/viewer-frame';

import { CircuitMorphologyViewer } from './engine/circuit-morphology-viewer';

import type { MorphoViewerSignals, MorphoViewerSnapshotOptions } from '@/morpho-viewer';
import type { CellColors, CircuitMorphologyData } from './types';

export interface CircuitMorphologiesProps {
  data: CircuitMorphologyData;
  /** As the somas view takes them: a palette and each cell's column of it. */
  cellColors: CellColors;
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
