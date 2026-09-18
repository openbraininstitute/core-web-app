import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SynapseLegend } from '@/features/scan-config/components/circuit-viz/synapse-legend';

import type { TSmallCircuitSynapseGroup } from '@/features/scan-config/components/circuit-viz/sources/types';

function group(label: string, color: string): TSmallCircuitSynapseGroup {
  return { label, color, coordinates: new Float32Array([0, 0, 0]) };
}

describe('SynapseLegend', () => {
  it('lists each colour once, however many populations carry it', () => {
    render(
      <SynapseLegend
        groups={[
          group('Excitatory', '#cc3311'),
          group('Inhibitory', '#009e73'),
          // A second typed population repeats both types.
          group('Excitatory', '#cc3311'),
          group('Inhibitory', '#009e73'),
          // An untyped one is named by its population instead.
          group('nodeA__nodeA__chemical', '#e69f00'),
        ]}
      />
    );

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Excitatory',
      'Inhibitory',
      'nodeA__nodeA__chemical',
    ]);
  });

  it('draws nothing when the scene has no synapses', () => {
    render(<SynapseLegend groups={[]} />);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('stays gone once dismissed', () => {
    render(<SynapseLegend groups={[group('Excitatory', '#cc3311')]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hide synapse colours' }));

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
