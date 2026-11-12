import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { pathwayNodeColors } from '@/features/circuit-viewer/pathway-colors';

import type { ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TablePathway } from '@/features/circuit-nodes/circuit-nodes-table';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';

const h = vi.hoisted(() => ({
  nodeColors: undefined as NodeColors | undefined,
}));

vi.mock('@/features/circuit-viewer/morphologies/use-morphology-pack-status', async (original) => ({
  ...(await original<
    typeof import('@/features/circuit-viewer/morphologies/use-morphology-pack-status')
  >()),
  useMorphologyPackStatus: () => null,
}));
vi.mock('@/features/feature-flags', async (original) => ({
  ...(await original<typeof import('@/features/feature-flags')>()),
  useFlag: () => false,
}));
vi.mock('@/features/scan-config/components/model-preview/large-circuit-preview', () => ({
  LargeCircuitPreview: () => null,
}));
vi.mock('@/features/scan-config/components/circuit-viz/circuit-viz', () => ({
  CircuitVisualization: ({ nodeColors }: { nodeColors?: NodeColors }) => {
    h.nodeColors = nodeColors;
    return null;
  },
  MemodelVisualization: () => null,
}));
vi.mock('@/features/scan-config/components/color-by/circuit-viewer-chrome', () => ({
  STATUS_PLACE: {},
  CircuitViewerChrome: ({ keys }: { keys?: ReactNode }) => <div data-testid="keys">{keys}</div>,
}));
vi.mock('@/features/circuit-nodes', () => ({ CircuitNodesTable: () => null }));
vi.mock('@/features/scan-config/components/model-preview/use-electrode-overlays', () => ({
  electrodeBlockPath: () => '',
  useElectrodeOverlays: () => ({
    overlays: [],
    available: false,
    draggableOverlayIds: new Set(),
    overlayIdByBlockPath: new Map(),
  }),
}));
vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({
    config: {
      nodes: [{ name: 'cortex', type: 'biophysical', file: 'nodes.h5' }],
      edges: [],
      raw: {},
    },
  }),
}));
vi.mock('@/features/scan-config/components/shared/3d-viewer', () => ({
  downloadCircuitImage: () => {},
}));
vi.mock('@/features/scan-config/components/color-by/use-node-color-mapping', () => ({
  useNodeColorMapping: () => ({
    mapping: null,
    columns: [],
    loading: false,
    status: 'ready',
    retry: () => {},
  }),
}));

const CIRCUIT = { id: 'c1', name: 'c1', scale: 'small_microcircuit' } as unknown as ICircuit;
const PATHWAY: TablePathway = {
  circuitId: 'c1',
  population: 'cortex',
  rowCount: 3,
  pre: Uint32Array.from([0]),
  post: Uint32Array.from([2]),
};
const columnsOf = (colors: NodeColors | undefined) => colors && [...colors.columnByNode];

beforeEach(() => {
  h.nodeColors = undefined;
});

describe('CircuitScene beside a host’s connectivity matrix', () => {
  it('has no pathway key without one', () => {
    render(<CircuitScene circuit={CIRCUIT} />);

    expect(screen.queryByTestId('pathway-key')).toBeNull();
    expect(h.nodeColors).toBeUndefined();
  });

  it('has the key while the matrix is up, under the host’s own', () => {
    render(<CircuitScene circuit={CIRCUIT} matrix={{ pathway: null }} keys={<i>The ramp</i>} />);

    const key = screen.getByTestId('pathway-key');
    expect(screen.getByText('The ramp').nextElementSibling).toBe(key);
    expect(h.nodeColors).toBeUndefined();
  });

  it('colours the pathway under the pointer over the rest', () => {
    render(<CircuitScene circuit={CIRCUIT} matrix={{ pathway: PATHWAY }} />);

    expect(columnsOf(h.nodeColors)).toEqual(
      columnsOf(pathwayNodeColors({ ...PATHWAY, background: '#000000' }))
    );
  });

  it('leaves another circuit’s pathway alone', () => {
    render(
      <CircuitScene circuit={CIRCUIT} matrix={{ pathway: { ...PATHWAY, circuitId: 'other' } }} />
    );

    expect(h.nodeColors).toBeUndefined();
  });

  it('keeps the host’s own keys with no matrix', () => {
    render(<CircuitScene circuit={CIRCUIT} keys={<i>The ramp</i>} />);

    expect(screen.getByText('The ramp')).toBeInTheDocument();
    expect(screen.queryByTestId('pathway-key')).toBeNull();
  });
});
