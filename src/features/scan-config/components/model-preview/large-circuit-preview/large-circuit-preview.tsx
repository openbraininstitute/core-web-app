/** biome-ignore-all lint/suspicious/noArrayIndexKey: The list is not suppose to change */
import { saveAs } from 'file-saver';
import React from 'react';

import { LoadingNeuronSpinner } from '@/components/neuron-viewer';
import { MorphoViewerSomasOnly, useMorphoViewerDebugMode } from '@/morpho-viewer';
import { Button } from '@/ui/molecules/button';
import { isType } from '@/util/type-guards';
import { cn } from '@/utils/css-class';

import { useCircuitNodes, useSomaRadius } from './hooks';

import type { ICircuit } from '@/api/entitycore/types';

import styles from './large-circuit-preview.module.css';

export interface LargeCircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
}

interface CellInfo {
  morphologyId: string;
  position: [number, number, number];
}

export function LargeCircuitPreview({ className, circuit }: LargeCircuitPreviewProps) {
  // const debug = useMorphoViewerDebugMode();
  const somaRadius = useSomaRadius(circuit);
  const nodes = useCircuitNodes(circuit);
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(nodes)], { type: 'application/json' });
    saveAs(blob, `${circuit.id}.json`);
  };
  const cellInfos = React.useMemo(() => {
    if (nodes instanceof Error || !nodes) return [];

    return nodes.map((node) => {
      const cell: CellInfo = {
        morphologyId: node.morphologyId,
        position: node.position,
      };
      return cell;
    });
  }, [nodes]);

  return (
    <div className={cn(className, styles.largeCircuitPreview)}>
      {!nodes && <LoadingNeuronSpinner className={styles.spinner} label="Circuit" />}
      {nodes &&
        (nodes instanceof Error ? (
          <div className={styles.error}>
            <h2>
              Unable to load circuit <strong>{circuit.name}</strong>!
            </h2>
            <p>{nodes.message}</p>
            <ErrorDetail cause={nodes.cause} />
          </div>
        ) : (
          <MorphoViewerSomasOnly
            somaRadius={somaRadius}
            gizmo
            scalebar
            cellInfos={cellInfos}
            controls={[
              // debug
              //   ? [
              //       <Button
              //         key="doanload"
              //         onClick={handleDownload}
              //         className={styles.downloadButton}
              //       >
              //         Download {nodes.length} nodes
              //       </Button>,
              //     ]
              //   : [],
              'reset-camera',
              'fullscreen',
            ]}
          />
        ))}
    </div>
  );
}

function ErrorDetail({ cause }: { cause: unknown }) {
  const steps = React.useMemo(() => parseCause(cause), [cause]);
  if (!steps) return null;

  return (
    <details>
      <summary>Successful steps before error:</summary>
      <ol>
        {steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
    </details>
  );
}

function parseCause(cause: unknown): string[] | null {
  return isType<string[]>(cause, ['array', 'string']) ? cause : null;
}
