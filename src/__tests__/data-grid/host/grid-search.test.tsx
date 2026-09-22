import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GridSearch } from '@/features/data-grid/host/grid-search';

/** The opened input and the clip wrapper that animates it must agree on one width. */
function widths(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>('div'))
    .map((el) => Array.from(el.classList).find((c) => /^w-\d+$/.test(c)))
    .filter((c): c is string => Boolean(c));
}

describe('GridSearch — placeholder and width', () => {
  it('defaults to the generic hint at the default width', () => {
    const { container } = render(<GridSearch openOnMount onSearch={vi.fn()} />);

    expect(screen.getByLabelText('Search')).toHaveAttribute('placeholder', 'Search for entities…');
    expect(widths(container)).toEqual(['w-64', 'w-64']);
  });

  it('takes a host-supplied placeholder', () => {
    render(<GridSearch openOnMount onSearch={vi.fn()} placeholder="Search entities by name, ID" />);

    expect(screen.getByLabelText('Search')).toHaveAttribute(
      'placeholder',
      'Search entities by name, ID'
    );
  });

  it('applies a widened input to BOTH the reveal animation and the input itself', () => {
    // one token drives the two, so a wider input cannot end up clipped by a narrow reveal
    const { container } = render(
      <GridSearch openOnMount onSearch={vi.fn()} inputWidthClass="w-96" />
    );

    expect(widths(container)).toEqual(['w-96', 'w-96']);
  });

  it('still collapses to zero width when closed', () => {
    const { container } = render(<GridSearch onSearch={vi.fn()} inputWidthClass="w-96" />);

    // the clip wrapper is w-0 while closed; the input inside stays laid out at w-96
    expect(widths(container)).toEqual(['w-0', 'w-96']);
  });

  it('reports the typed term to the host', () => {
    const onSearch = vi.fn();
    render(<GridSearch openOnMount onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByLabelText('Clear search'));

    // clearing commits immediately, bypassing the debounce
    expect(onSearch).toHaveBeenCalledWith('');
  });
});

describe('GridSearch — a host that swaps onSearch mid-debounce', () => {
  it('delivers a term typed just before the swap to the NEW onSearch', () => {
    vi.useFakeTimers();
    try {
      const before = vi.fn();
      const after = vi.fn();

      const { rerender } = render(<GridSearch openOnMount value="" onSearch={before} />);

      fireEvent.change(screen.getByLabelText('Search'), {
        target: { value: 'Visualize' },
      });

      // The controller is rebuilt 100ms in, well inside the 300ms debounce.
      vi.advanceTimersByTime(100);
      rerender(<GridSearch openOnMount value="" onSearch={after} />);

      vi.advanceTimersByTime(400);

      expect(after).toHaveBeenCalledWith('Visualize');
      expect(before).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
