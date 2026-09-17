'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { MorphologyCanvas, MorphoViewerScalebar } from '@/morpho-viewer';
import { cn } from '@/utils/css-class';
import { logError } from '@/utils/logger';

import { ColorRamp } from './ColorRamp';
import { DARK_BACKGROUND, LIGHT_BACKGROUND, NEURITES } from './constants';

import type { MorphologySettings, Neurite } from './constants';

import styles from './morpho-viewer.module.css';

type Status = 'loading' | 'ready' | 'failed';

interface MorphoViewerProps {
  className?: string;
  /**
   * Text content of a SWC file.
   */
  swc?: string;
  swcError?: boolean;
  mode: MorphologyCanvas['mode'];
  mesh?: ArrayBuffer;
  meshError?: boolean;
  settings: MorphologySettings;
  onNeurites: (neurites: Neurite[]) => void;
}

const SCALEBAR_LIGHT = { hiDPI: true, color: '#000' };
const SCALEBAR_DARK = { hiDPI: true, color: '#fff' };

function neuritesOf(morphoCanvas: MorphologyCanvas): Neurite[] {
  const present: Record<Neurite, boolean> = {
    soma: morphoCanvas.hasSoma(),
    basalDendrite: morphoCanvas.hasBasalDendrite(),
    apicalDendrite: morphoCanvas.hasApicalDendrite(),
    axon: morphoCanvas.hasAxon(),
  };
  return NEURITES.filter((neurite) => present[neurite]);
}

function MorphoViewerComponent({
  className,
  swc,
  swcError,
  mode,
  mesh,
  meshError,
  settings,
  onNeurites,
}: MorphoViewerProps) {
  const [morphoCanvas] = useState(() => new MorphologyCanvas());
  const refCanvas = useRef<HTMLCanvasElement | null>(null);
  const refGizmo = useRef<HTMLCanvasElement | null>(null);
  const [skeletonStatus, setSkeletonStatus] = useState<Status>('loading');
  const [meshStatus, setMeshStatus] = useState<Status>('loading');

  useEffect(() => {
    const { darkMode, palettes, hidden } = settings;
    const palette = darkMode ? palettes.dark : palettes.light;
    const { colors } = morphoCanvas;
    colors.background = darkMode ? DARK_BACKGROUND : LIGHT_BACKGROUND;
    for (const neurite of NEURITES) {
      // The viewer hides a neurite whose alpha is below 1.
      colors[neurite] = hidden.includes(neurite) ? `${palette[neurite]}fc` : palette[neurite];
    }
    morphoCanvas.radiusMultiplier = settings.thickness;
    morphoCanvas.colorBy = settings.colorBy;
  }, [morphoCanvas, settings]);

  useEffect(() => {
    morphoCanvas.canvas = refCanvas.current;
    morphoCanvas.gizmoCanvas = refGizmo.current;
    return () => {
      morphoCanvas.gizmoCanvas = null;
      morphoCanvas.canvas = null;
    };
  }, [morphoCanvas]);

  useEffect(() => {
    morphoCanvas.mode = mode;
  }, [morphoCanvas, mode]);

  useEffect(() => {
    if (swc === undefined) return;

    try {
      morphoCanvas.swc = swc;
    } catch (error) {
      logError('Unable to parse the SWC file:', error);
      setSkeletonStatus('failed');
      return;
    }
    setSkeletonStatus('ready');
    onNeurites(neuritesOf(morphoCanvas));
  }, [morphoCanvas, swc, onNeurites]);

  useEffect(() => {
    if (!mesh) return;

    morphoCanvas.loadMesh(mesh).then(
      () => {
        setMeshStatus('ready');
        onNeurites(neuritesOf(morphoCanvas));
      },
      (error) => {
        logError('Unable to load the mesh:', error);
        setMeshStatus('failed');
      }
    );
  }, [morphoCanvas, mesh, onNeurites]);

  const [loaded, downloadFailed] =
    mode === 'mesh' ? [meshStatus, meshError] : [skeletonStatus, swcError];
  const status = downloadFailed ? 'failed' : loaded;
  return (
    <div
      className={cn(styles.main, className, settings.darkMode && styles.darkMode)}
      data-testid="morpho-viewer"
    >
      <canvas className={styles.morphoViewer} ref={refCanvas}>
        MorphologyViewer
      </canvas>
      {mode === 'skeleton' && status === 'ready' && settings.colorBy === 'distance' && (
        <div className={styles.rightPanel}>
          <ColorRamp painter={morphoCanvas} />
        </div>
      )}
      <canvas className={styles.gizmo} ref={refGizmo} />
      <MorphoViewerScalebar
        className={settings.darkMode ? SCALEBAR_DARK : SCALEBAR_LIGHT}
        spacePerPixelEvent={morphoCanvas.eventPixelScaleChange}
      />
      {status !== 'ready' && (
        <div className={styles.overlay}>
          {status === 'failed' ? (
            `We are having problems loading the ${mode}.`
          ) : (
            <>
              <Spin indicator={<LoadingOutlined />} size="large" />
              <h2 className={cn('font-light', !settings.darkMode && 'text-primary-9')}>
                Loading {mode}...
              </h2>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const MorphoViewer = dynamic(() => Promise.resolve(MorphoViewerComponent), {
  ssr: false,
});

export { MorphoViewer };
