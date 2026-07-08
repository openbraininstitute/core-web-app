/** biome-ignore-all lint/suspicious/noArrayIndexKey: The list is not suppose to change */

import { LoadingOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import React from 'react';

import {
  downloadCircuitImage,
  VERTICAL_SCALEBAR,
} from '@/features/scan-config/components/shared/3d-viewer';
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
  /** per-node colors aligned by node index; undefined → viewer default  */
  colorsByNode?: string[];
  backgroundColor: string;
  /** scalebar pin/label color (adaptive mode); undefined → package default  */
  scalebarColor?: string;
  resetSignal: number;
  /** bump to capture a PNG of the circuit (viewer excludes the gizmo) */
  captureSignal: number;
}

interface CellInfo {
  morphologyId: string;
  position: [number, number, number];
  color?: string;
}

export function LargeCircuitPreview({
  className,
  circuit,
  colorsByNode,
  backgroundColor,
  scalebarColor,
  resetSignal,
  captureSignal,
}: LargeCircuitPreviewProps) {
  const debugMode = useMorphoViewerDebugMode();
  const somaRadius = useSomaRadius(circuit);
  const nodes = useCircuitNodes(circuit);
  const scalebar = React.useMemo(
    () => (scalebarColor ? { ...VERTICAL_SCALEBAR, color: scalebarColor } : VERTICAL_SCALEBAR),
    [scalebarColor]
  );
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(nodes)], { type: 'application/json' });
    saveAs(blob, `${circuit.id}.json`);
  };
  const cellInfos = React.useMemo(() => {
    if (nodes instanceof Error || !nodes) return [];

    return nodes.map((node, index) => {
      const cell: CellInfo = {
        morphologyId: node.morphologyId,
        position: node.position,
        color: colorsByNode?.[index],
      };
      return cell;
    });
  }, [nodes, colorsByNode]);

  return (
    <div className={cn(className, 'relative h-full w-full', styles.largeCircuitPreview)}>
      {!nodes && <LoadingIndicator />}
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
            scalebar={scalebar}
            cellInfos={cellInfos}
            backgroundColor={backgroundColor}
            resetCameraSignal={resetSignal}
            captureSignal={captureSignal}
            onCapture={(image) => downloadCircuitImage(image, circuit.name)}
            controls={[
              debugMode
                ? [
                    <Button
                      key="download"
                      onClick={handleDownload}
                      className={styles.downloadButton}
                    >
                      Download {nodes.length} nodes
                    </Button>,
                  ]
                : [],
            ]}
          />
        ))}
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
      <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm text-primary-9 shadow-md ring-1 ring-black/5 backdrop-blur">
        <LoadingOutlined spin />
        <span>Loading visualization…</span>
      </div>
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
