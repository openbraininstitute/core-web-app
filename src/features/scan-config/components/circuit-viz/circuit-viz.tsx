import { useState } from 'react';

import { LoadingNeuronSpinner } from '@/components/neuron-viewer';
import { IconGear } from '@/features/ai-assistant/icons/gear';
import { MorphoViewerSmallCircuit } from '@/morpho-viewer';

import DebouncedSwitch from './debounced-switch';
import { useCircuit } from './hooks';
import { sequentialCellLoader } from './sequential-loader';

import type { Cell, MorphoViewerTreeItem, Sections } from '@/features/scan-config/types';

import styles from './circuit-viz.module.css';

const CircuitViz = ({ id }: { id: string }) => {
  const [progress, setProgress] = useState(0);
  const [showAxon, setShowAxon] = useState(false);
  const { circuit, isLoading, error, loadCell } = useCircuit(id, showAxon);
  const [highlightedCellId, setHighlightedCellId] = useState('');
  const handleCellHover = (cell: Cell | undefined): void => {
    setHighlightedCellId(cell?.id ?? '');
  };
  const reset = () => {
    sequentialCellLoader.clear();
    setProgress(0);
  };

  return (
    <div className="h-full w-full relative">
      {circuit && circuit.length > 0 && (
        <MorphoViewerSmallCircuit
          className={styles.morphoViewer}
          gizmo
          scalebar
          backgroundColor="white"
          circuit={circuit}
          onCellHover={handleCellHover}
          highlightedCellIds={[highlightedCellId]}
          loadCell={loadCell}
          controls={[
            [
              <div key="show-axon" className={styles.showAxons}>
                Show Axons{' '}
                <DebouncedSwitch
                  value={showAxon}
                  onChange={(v) => {
                    reset();
                    setShowAxon(v);
                  }}
                  onClick={reset}
                />
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
      )}
      {(isLoading || progress === 0 || error) && (
        <div className="w-full h-full flex justify-center items-center">
          {(isLoading || progress === 0) && (
            <LoadingNeuronSpinner className={styles.spinner} label="Circuit" />
          )}
          {!!error && (
            <details className="text-red-500">
              <summary>
                <strong>Couldn't load the visualization</strong>
              </summary>
              <div>{error.message}</div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

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

export default CircuitViz;
