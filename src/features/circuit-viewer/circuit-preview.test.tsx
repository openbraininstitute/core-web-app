import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./circuit-viz', () => ({
  default: () => <div data-testid="circuit-viz" />,
}));
vi.mock('./large-circuit-preview', () => ({
  LargeCircuitPreview: () => <div data-testid="large-circuit-viz" />,
}));
vi.mock('@/features/circuit-nodes', () => ({
  CircuitNodesTable: () => <div data-testid="nodes-table" />,
}));
vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({ config: undefined }),
}));
vi.mock('@/features/circuit-nodes/population-utils', () => ({
  resolvePopulation: () => undefined,
}));
vi.mock('./color-by/use-circuit-color-by', () => ({
  useCircuitColorBy: () => ({
    containerRef: { current: null },
    config: { showAxons: false, backgroundColor: '#ffffff' },
    colorsByNode: undefined,
    defaultColor: '#3b82f6',
    theme: null,
    signals: {},
    colorBy: undefined,
    menu: {},
  }),
}));

const useCircuitImageURLMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/circuit-viewer/hooks/use-circuit-image-url', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCircuitImageURL: () => useCircuitImageURLMock(),
}));

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { CircuitPreview } from '@/features/circuit-viewer/circuit-preview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

function circuit(labels: AssetLabel[]) {
  return {
    id: 'circuit-1',
    name: 'Test circuit',
    assets: labels.map((label, i) => ({ id: `asset-${i}`, label })),
  } as unknown as ICircuit;
}

describe('CircuitPreview mode toggle', () => {
  it('offers the image/3D toggle when the circuit has a preview image', () => {
    useCircuitImageURLMock.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

    render(
      <CircuitPreview
        circuit={circuit([AssetLabel.simulation_designer_image])}
        enableVisualization
      />
    );

    expect(document.getElementById('preview-mode-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('circuit-viz')).toBeInTheDocument();
  });

  // Synaptome (beta) circuits have no preview image; image mode would only ever
  // render the broken-image placeholder, so the toggle must not be offered.
  it('hides the toggle and forces 3D when there is no preview image', () => {
    useCircuitImageURLMock.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

    render(<CircuitPreview circuit={circuit([AssetLabel.sonata_circuit])} enableVisualization />);

    expect(document.getElementById('preview-mode-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('circuit-viz')).toBeInTheDocument();
  });
});
