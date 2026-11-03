import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GeneratedLocationsLegend } from '@/features/scan-config/components/circuit-viz/morphology-location/generated-legend';

function location(entry: string, index: number) {
  return { section_id: 3, offset: 0.5, entry, index, generated: true };
}

const BACKGROUND = '#ffffff';

describe('GeneratedLocationsLegend', () => {
  it('lists each block once, with how many locations it placed', () => {
    render(
      <GeneratedLocationsLegend
        entries={['random', 'clustered']}
        locations={[location('random', 0), location('clustered', 0), location('random', 1)]}
        backgroundColor={BACKGROUND}
      />
    );

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'random2',
      'clustered1',
    ]);
  });

  it('keeps a row for a block that failed or placed nothing, with why', () => {
    render(
      <GeneratedLocationsLegend
        entries={['broken', 'empty']}
        locations={[]}
        errors={new Map([['broken', 'Parameter sweeps cannot be previewed']])}
        backgroundColor={BACKGROUND}
      />
    );

    const [broken, empty] = screen.getAllByRole('listitem');
    expect(broken).toHaveTextContent('Parameter sweeps cannot be previewed');
    expect(empty).toHaveTextContent('These parameters place no locations.');
  });

  it("says how many of a block's locations are not drawn", () => {
    render(
      <GeneratedLocationsLegend
        entries={['random']}
        locations={[location('random', 0), location('random', 1), location('random', 2)]}
        drawn={new Map([['random', 1]])}
        backgroundColor={BACKGROUND}
      />
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('1 of 3');
    expect(screen.getByRole('listitem')).toHaveTextContent('2 sit on sections not drawn');
  });

  it('reports a toggle by block, and offers a hidden one back', () => {
    const onToggle = vi.fn();
    render(
      <GeneratedLocationsLegend
        entries={['random', 'clustered']}
        locations={[location('random', 0), location('clustered', 0)]}
        backgroundColor={BACKGROUND}
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
    render(<GeneratedLocationsLegend entries={[]} locations={[]} backgroundColor={BACKGROUND} />);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
