import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NumericFilter } from '@/features/circuit-nodes/components/numeric-filter';

import type { ComponentProps } from 'react';

// The filter registers itself with the grid; there is no grid here.
vi.mock('ag-grid-react', () => ({ useGridFilter: () => {} }));

type Props = ComponentProps<typeof NumericFilter>;

describe('NumericFilter', () => {
  it('keeps every digit of a 64-bit id', () => {
    const onModelChange = vi.fn();
    render(<NumericFilter {...({ model: null, onModelChange } as unknown as Props)} />);

    const input = screen.getByPlaceholderText('Values, e.g. 3, 7');
    fireEvent.change(input, { target: { value: '720575940620980304' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });

    expect(onModelChange).toHaveBeenLastCalledWith({
      filterType: 'number',
      type: 'equals',
      filter: '720575940620980304',
    });
  });

  it('takes several values for Equals, leaving out what is not a number', () => {
    const onModelChange = vi.fn();
    render(<NumericFilter {...({ model: null, onModelChange } as unknown as Props)} />);

    const input = screen.getByPlaceholderText('Values, e.g. 3, 7');
    fireEvent.change(input, { target: { value: '3, 5 x 9,' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });

    expect(onModelChange).toHaveBeenLastCalledWith({
      filterType: 'number',
      type: 'equals',
      filter: '3, 5, 9',
    });
  });
});
