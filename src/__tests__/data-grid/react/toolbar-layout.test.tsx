/**
 * The toolbar is one row of two clusters: what the listing IS on the left (scope →
 * brain region → entity type), what you DO to it on the right (search → filters →
 * columns). Callers hand over named slots and the toolbar decides the order, so this
 * pins the order HERE rather than in every host that fills the slots.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataGridToolbar } from '@/features/data-grid/react/toolbar';

function order(testIds: string[]): string[] {
  const bar = screen.getByTestId('data-grid-toolbar');
  const found = [...bar.querySelectorAll('[data-testid]')]
    .map((el) => el.getAttribute('data-testid') ?? '')
    .filter((id) => testIds.includes(id));
  return found;
}

describe('DataGridToolbar', () => {
  it('lays out scope → brain region → entity type, then search → filters → columns', () => {
    render(
      <DataGridToolbar
        slots={{
          scope: <div data-testid="scope" />,
          brainRegion: <div data-testid="brain-region" />,
          entityType: <div data-testid="entity-type" />,
          left: <div data-testid="extra-left" />,
          search: <div data-testid="search" />,
        }}
        filters={<div data-testid="filters" />}
        columnChooser={<div data-testid="columns" />}
      />
    );

    expect(
      order(['scope', 'brain-region', 'entity-type', 'extra-left', 'search', 'filters', 'columns'])
    ).toEqual([
      'scope',
      'brain-region',
      'entity-type',
      'extra-left',
      'search',
      'filters',
      'columns',
    ]);
  });

  it('renders each cluster only when a slot fills it', () => {
    render(<DataGridToolbar slots={{ search: <div data-testid="search" /> }} />);
    expect(screen.getByTestId('search')).toBeInTheDocument();
    expect(screen.queryByTestId('scope')).toBeNull();
  });

  it('renders nothing at all when every slot is empty', () => {
    const { container } = render(<DataGridToolbar />);
    expect(container).toBeEmptyDOMElement();
  });
});
