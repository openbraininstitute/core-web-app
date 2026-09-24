import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

  it('takes the corner unless the host draws controls there', () => {
    const { rerender } = render(<SynapseLegend groups={[group('Excitatory', '#cc3311')]} />);

    expect(screen.getByRole('complementary').className).toContain('top-3');

    rerender(<SynapseLegend belowChrome groups={[group('Excitatory', '#cc3311')]} />);

    expect(screen.getByRole('complementary').className).toContain('top-14');
  });

  it('draws nothing when the scene has no synapses', () => {
    render(<SynapseLegend groups={[]} />);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('collapses to its icon and comes back', () => {
    render(<SynapseLegend groups={[group('Excitatory', '#cc3311')]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse synapse colours' }));

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

    // Reversible, unlike the close button it replaced: hiding a type is only
    // undoable from the legend.
    fireEvent.click(screen.getByRole('button', { name: 'Show synapses' }));

    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('shows every group by default and reports each toggle by label', () => {
    const onToggle = vi.fn();
    render(
      <SynapseLegend
        groups={[group('Excitatory', '#cc3311'), group('Inhibitory', '#009e73')]}
        onToggle={onToggle}
      />
    );

    expect(screen.getByRole('button', { name: 'Hide Excitatory synapses' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide Inhibitory synapses' }));

    expect(onToggle).toHaveBeenCalledWith('Inhibitory');
  });

  it('offers to show back a hidden group, and leaves its colour alone', () => {
    render(
      <SynapseLegend
        groups={[group('Excitatory', '#cc3311'), group('Inhibitory', '#009e73')]}
        hidden={new Set(['Inhibitory'])}
      />
    );

    expect(screen.getByRole('button', { name: 'Show Inhibitory synapses' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // Still listed, still its own colour: hiding is not unmapping.
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Excitatory',
      'Inhibitory',
    ]);
  });
});
