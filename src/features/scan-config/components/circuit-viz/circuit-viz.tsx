import { LoadingOutlined } from '@ant-design/icons';
import { Switch } from 'antd';
import dynamic from 'next/dynamic';
import { memo, useState } from 'react';

import { IconGear } from '@/components/ai-assistant/icons/gear';
import { MorphoViewerSmallCircuit } from '@/morpho-viewer';

import { useCircuit } from './hooks';

import type { Cell, MorphoViewerTreeItem, Sections } from '@/features/scan-config/types';

import styles from './circuit-viz.module.css';

const CircuitViz = memo(({ id, visible }: { id: string; visible: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [showAxon, setShowAxon] = useState(false);
  const { circuit, isLoading, error, loadCell } = useCircuit(id, showAxon);
  const [highlightedCellId, setHighlightedCellId] = useState('');
  const handleCellHover = (cell: Cell | undefined): void => {
    setHighlightedCellId(cell?.id ?? '');
  };

  if (!visible) return null;

  if (isLoading || error) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        {isLoading && <LoadingOutlined className="text-4xl text-primary-8" />}
        {!!error && (
          <details className="text-red-500">
            <summary>
              <strong>Couldn't load the visualization</strong>
            </summary>
            <div>{error.message}</div>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <MorphoViewerSmallCircuit
        className={styles.morphoViewer}
        gizmo
        scalebar
        key={id + showAxon}
        backgroundColor="white"
        circuit={circuit}
        onCellHover={handleCellHover}
        highlightedCellIds={[highlightedCellId]}
        loadCell={loadCell}
        controls={[
          [
            <div key="show-axon" className={styles.showAxons}>
              Show Axons <Switch value={showAxon} onChange={(v) => setShowAxon(v)} />
            </div>,
            progress > 0 && progress < 1 && (
              <div className={styles.progress}>
                <IconGear />
                <div>Loading</div>
                <strong>{(100 * progress).toFixed(0)}%</strong>
              </div>
            ),
          ],
          'reset-camera',
          'fullscreen',
        ]}
        onLoadProgress={setProgress}
      />
    </div>
  );
});

export function buildMorphoTree(
  sections: Sections,
  cellId: string
): {
  type: 'tree';
  data: {
    cellId: string;
    roots: MorphoViewerTreeItem[];
  };
} {
  const roots: MorphoViewerTreeItem[] = [];
  const terminalNodes = new Map<string, MorphoViewerTreeItem>();
  const somaNodes: MorphoViewerTreeItem[] = [];

  for (const sec of sections) {
    let prevNode: MorphoViewerTreeItem | null = null;

    if (sec.parent_id === 'soma' && somaNodes.length > 0) {
      if (somaNodes.length === 1) {
        prevNode = somaNodes[0];
      } else {
        const [nx, ny, nz] = sec.points[0];
        let minDistance = Infinity;

        for (const sNode of somaNodes) {
          const dist = Math.sqrt((sNode.x - nx) ** 2 + (sNode.y - ny) ** 2 + (sNode.z - nz) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            prevNode = sNode;
          }
        }
      }
    } else if (sec.parent_id !== null && sec.parent_id !== 'soma') {
      prevNode = terminalNodes.get(sec.parent_id) || null;
    }

    const isSoma = sec.id === 'soma';
    const startIdx = sec.parent_id === null || sec.parent_id === 'soma' ? 0 : 1;
    let lastNode = prevNode;

    for (let i = startIdx; i < sec.points.length; i++) {
      const [x, y, z] = sec.points[i];
      const node: MorphoViewerTreeItem = {
        x,
        y,
        z,
        radius: sec.radii[i],
        type: sec.type,
        sectionId: sec.id,
        segmentId: String(i),
        distanceFromSoma: 0,
      };

      if (!lastNode && !isSoma) {
        roots.push(node);
      } else if (isSoma && i === 0) {
        roots.push(node);
      } else if (lastNode) {
        lastNode.children = lastNode.children || [];
        lastNode.children.push(node);
      }

      lastNode = node;

      if (isSoma) {
        somaNodes.push(node);
      }
    }

    if (lastNode && !isSoma) {
      terminalNodes.set(sec.id, lastNode);
    }
  }

  return {
    type: 'tree',
    data: {
      cellId,
      roots: roots,
    },
  };
}

export default dynamic(() => Promise.resolve(CircuitViz), {
  ssr: false,
});
