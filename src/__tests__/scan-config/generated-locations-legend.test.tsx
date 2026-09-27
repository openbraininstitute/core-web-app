import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GeneratedLocationsLegend } from '@/features/scan-config/components/circuit-viz/morphology-location/generated-legend';

function location(entry: string, index: number) {
  return { section_id: 3, offset: 0.5, entry, index, generated: true };
}

describe('GeneratedLocationsLegend', () => {
  it('lists each block once, with how many locations it placed', () => {
    render(
      <GeneratedLocationsLegend
        locations={[location('random', 0), location('clustered', 0), location('random', 1)]}
      />
    );

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'random2',
      'clustered1',
    ]);
  });

  it('reports a toggle by block, and offers a hidden one back', () => {
    const onToggle = vi.fn();
    render(
      <GeneratedLocationsLegend
        locations={[location('random', 0), location('clustered', 0)]}
        hidden={new Set(['clustered'])}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide random locations' }));

    expect(onToggle).toHaveBeenCalledWith('random');
    expect(screen.getByRole('button', { name: 'Show clustered locations' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('draws nothing before any block has been previewed', () => {
    render(<GeneratedLocationsLegend locations={[]} />);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
