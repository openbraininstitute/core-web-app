/** biome-ignore-all lint/suspicious/noArrayIndexKey: The list is not suppose to change */

import { saveAs } from 'file-saver';
import { useSetAtom } from 'jotai';
import React from 'react';

import { circuitSceneAnchorAtom } from '@/features/scan-config/components/model-preview/circuit-scene-anchor';
import { VERTICAL_SCALEBAR } from '@/features/scan-config/components/shared/3d-viewer';
import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';
import { MorphoViewerSomasOnly, useMorphoViewerDebugMode } from '@/morpho-viewer';
import { Button } from '@/ui/molecules/button';
import { isType } from '@/util/type-guards';
import { cn } from '@/utils/css-class';

import { useCircuitNodes, useSomaRadius } from './hooks';

import type { ICircuit } from '@/api/entitycore/types';
import type { CircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { MorphoViewerOverlayTransformEvent, MorphoViewerSignals } from '@/morpho-viewer';

import styles from './large-circuit-preview.module.css';

export interface LargeCircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
  /** per-node colors aligned by node index; undefined → viewer default  */
  colorsByNode?: string[];
  backgroundColor: string;
  /** scalebar pin/label color (adaptive mode); undefined → package default  */
  scalebarColor?: string;
  /** signal bus: dispatch camera reset / snapshot; `snapshotReady` returns the image */
  signals: MorphoViewerSignals;
  /**
   * World-coordinate electrode overlays (same pipeline as CircuitViz).
   * Large circuits use MorphoViewerSomasOnly; overlay interaction is identical.
   */
  overlays?: CircuitOverlayGroup[];
  /** Enable left-drag / right-drag on electrode overlays when form can write back. */
  overlaysInteractive?: boolean;
  /** Gesture-end transform → host `applyElectrodeOverlayTransform`. */
  onOverlayTransform?: (event: MorphoViewerOverlayTransformEvent) => void;
  /** Form-selected electrode block name → highlight in the 3D view. */
  highlightedOverlayId?: string | null;
  /** Soma paint opacity (0–1); electrodes stay fully opaque independently. */
  neuronOpacity?: number;
  /** Electrode marker radius (world units). */
  electrodeRadius?: number;
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
  signals,
  overlays,
  overlaysInteractive = false,
  onOverlayTransform,
  highlightedOverlayId = null,
  neuronOpacity,
  electrodeRadius = 25,
}: LargeCircuitPreviewProps) {
  const debugMode = useMorphoViewerDebugMode();
  const somaRadius = useSomaRadius(circuit);
  const nodes = useCircuitNodes(circuit);
  const setCircuitSceneAnchor = useSetAtom(circuitSceneAnchorAtom);
  React.useEffect(() => {
    if (!nodes || nodes instanceof Error || nodes.length === 0) return;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (const node of nodes) {
      sx += node.position[0];
      sy += node.position[1];
      sz += node.position[2];
    }
    const n = nodes.length;
    setCircuitSceneAnchor([sx / n, sy / n, sz / n]);
  }, [nodes, setCircuitSceneAnchor]);
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

  const morphoOverlays = React.useMemo(
    () =>
      overlays?.map(({ color, coordinates, id, kind, origin, rotation }) => ({
        color,
        coordinates,
        id,
        kind,
        origin,
        rotation,
      })),
    [overlays]
  );

  return (
    <div className={cn(className, 'relative h-full w-full', styles.largeCircuitPreview)}>
      {!nodes && <VisualizationLoadingIndicator />}
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
            signals={signals}
            overlays={morphoOverlays}
            overlaysRadius={electrodeRadius}
            overlaysMinRadiusInPixels={Math.max(2, Math.round(electrodeRadius * 0.32))}
            overlaysInteractive={overlaysInteractive}
            onOverlayTransform={onOverlayTransform}
            highlightedOverlayId={highlightedOverlayId}
            neuronOpacity={neuronOpacity}
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
