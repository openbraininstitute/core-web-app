'use client';

import React from 'react';

import { IconSpinner } from '@/components/icons/spinner';
import { MorphoViewerOctree } from '@/morpho-viewer';
import { cn } from '@/utils/css-class';

import AssetsDownloader from './assets-downloader';
import { useLoaders } from './loader';

import styles from './mesh-viewer.module.css';

export interface MeshViewerProps {
  className?: string;
  meshId?: string;
}

export function MeshViewer({ className, meshId }: MeshViewerProps) {
  return (
    <div className={cn(className, styles.meshViewer)}>
      {meshId && <AssetsDownloader entityId={meshId} />}
      <div className={styles.container}>
        <Viewer meshId={meshId} />
      </div>
    </div>
  );
}

const Viewer = React.memo(RawViewer);

function RawViewer({ meshId }: { meshId?: string }) {
  const { loadInfo, loadBlock } = useLoaders();

  if (!meshId) {
    return <IconSpinner />;
  }

  return (
    <MorphoViewerOctree
      className={styles.octree}
      meshId={meshId}
      loadInfo={loadInfo}
      loadBlock={loadBlock}
      gizmo
      scalebar
    />
  );
}
