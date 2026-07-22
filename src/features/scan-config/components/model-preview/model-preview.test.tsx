import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/circuit-viewer', () => ({
  CircuitPreview: ({
    circuit,
    enableVisualization,
    largeCircuit,
  }: {
    circuit: { id: string };
    enableVisualization?: boolean;
    largeCircuit?: boolean;
  }) => (
    <div
      data-testid="circuit-preview"
      data-circuit-id={circuit.id}
      data-enable-visualization={String(!!enableVisualization)}
      data-large-circuit={String(!!largeCircuit)}
    />
  ),
}));

vi.mock('@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer', () => ({
  NeuronVisualizer: () => <div data-testid="neuron-visualizer" />,
}));

import { EntityTypeDict } from '@/api/entitycore/types';
import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { ModelPreview } from '@/features/scan-config/components/model-preview';

import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

function circuit(scale: TCircuitScaleDictionary) {
  return {
    id: `circuit-${scale}`,
    type: EntityTypeDict.Circuit,
    scale,
  } as unknown as TSupportedEntitiesForScanConfiguration;
}

describe('ModelPreview', () => {
  // Synaptome (beta) is scale='single'. It used to get its own SONATA/h5wasm
  // loader; it now shares the viewer with the other small scales.
  const interactiveScales = [
    CircuitScaleDictionary.Single,
    CircuitScaleDictionary.PairNeuron,
    CircuitScaleDictionary.SmallMicrocircuit,
  ] as const;

  it.each(interactiveScales)('renders the shared viewer for scale=%s', (scale) => {
    render(<ModelPreview model={circuit(scale)} />);

    const preview = screen.getByTestId('circuit-preview');
    expect(preview).toHaveAttribute('data-circuit-id', `circuit-${scale}`);
    expect(preview).toHaveAttribute('data-enable-visualization', 'true');
    expect(preview).toHaveAttribute('data-large-circuit', 'false');
  });

  const largeScales = [
    CircuitScaleDictionary.Microcircuit,
    CircuitScaleDictionary.Region,
    CircuitScaleDictionary.System,
    CircuitScaleDictionary.WholeBrain,
  ] as const;

  it.each(largeScales)('renders the large-circuit viewer for scale=%s', (scale) => {
    render(<ModelPreview model={circuit(scale)} />);

    expect(screen.getByTestId('circuit-preview')).toHaveAttribute('data-large-circuit', 'true');
  });

  it('renders the neuron visualizer for memodels', () => {
    render(
      <ModelPreview
        model={
          {
            id: 'memodel-1',
            type: EntityTypeDict.Memodel,
          } as TSupportedEntitiesForScanConfiguration
        }
      />
    );

    expect(screen.getByTestId('neuron-visualizer')).toBeInTheDocument();
    expect(screen.queryByTestId('circuit-preview')).not.toBeInTheDocument();
  });
});
