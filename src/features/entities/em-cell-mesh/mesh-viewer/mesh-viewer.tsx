'use client';

import React from 'react';

import { IconSpinner } from '@/components/icons/spinner';
import { MorphoViewerOctree, useMorphoViewerDebugMode } from '@/morpho-viewer';
import { cn } from '@/utils/css-class';

import AssetsDownloader from './assets-downloader';
import { useLoaders } from './loader';

import styles from './mesh-viewer.module.css';

export interface MeshViewerProps {
  className?: string;
  meshId?: string;
}

export function MeshViewer({ className, meshId }: MeshViewerProps) {
  const debugMode = useMorphoViewerDebugMode();
  return (
    <div className={cn(className, styles.meshViewer)}>
      <div className={styles.container}>
        <Viewer meshId={meshId} />
      </div>
      {meshId && debugMode && <AssetsDownloader entityId={meshId} />}
    </div>
  );
}

const Viewer = React.memo(RawViewer);

function RawViewer({ meshId }: { meshId?: string }) {
  const { loadInfo, loadBlock, infoExists } = useLoaders();

  if (!meshId) {
    return <IconSpinner />;
  }

  if (!infoExists) {
    return (
      <div className={styles.noPreviewAvailable}>
        <p>No interactive view available for this model.</p>
      </div>
    );
  }

  return (
    <MorphoViewerOctree
      className={styles.octree}
      meshId={meshId}
      loadInfo={loadInfo}
      loadBlock={loadBlock}
      gizmo
      scalebar={{
        unit: 1e-9,
      }}
    />
  );
}
