'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  makeColor,
  usePainter,
  usePainterLoadingListener,
} from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/hooks';
import { useAccessToken } from '@/hooks/useAccessToken';
import { classNames } from '@/util/utils';

import type { VisibleRegion } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/types';

import styles from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/brain-atlas-viewer-gltf.module.css';

export type MiniBrainAtlasViewerGltfProps = {
  atlasId: string;
  regionId: string;
  regionName?: string;
  className?: string;
  onLoading?: (loading: boolean) => void;
};

export function MiniBrainAtlasViewerGltf({
  atlasId,
  regionId,
  regionName = 'Brain',
  className,
  onLoading,
}: MiniBrainAtlasViewerGltfProps) {
  const accessToken = useAccessToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const painter = usePainter({ loading: false, atlasId });

  const regions = useMemo<VisibleRegion[]>(
    () => [
      {
        id: regionId,
        name: regionName,
        color: makeColor('#FFFFFF'),
      },
    ],
    [regionId, regionName]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!painter || !canvas) return;

    painter.start(canvas);

    return () => {
      painter.start(null);
    };
  }, [painter]);

  usePainterLoadingListener(painter, onLoading);

  useEffect(() => {
    if (!painter || !accessToken) return;

    void painter.setRegions(regions, accessToken);
  }, [accessToken, painter, regions]);

  return (
    <div
      ref={containerRef}
      className={classNames(className, styles.brainAtlasViewerGltf, 'h-full w-full')}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
