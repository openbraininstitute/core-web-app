/**
 * Pins the toolbar's two clusters and their order here, since callers hand over named
 * slots and the toolbar — not the host — decides the arrangement.
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
  it('lays out entity type → brain region, then search → scope → filters → columns', () => {
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
      order(['entity-type', 'scope', 'brain-region', 'extra-left', 'search', 'filters', 'columns'])
    ).toEqual([
      'entity-type',
      'brain-region',
      'extra-left',
      'search',
      'scope',
      'filters',
      'columns',
    ]);
  });

  it('keeps the scope tabs in the right cluster, immediately after the search', () => {
    render(
      <DataGridToolbar
        slots={{
          scope: <div data-testid="scope" />,
          entityType: <div data-testid="entity-type" />,
          search: <div data-testid="search" />,
        }}
      />
    );
    const scope = screen.getByTestId('scope');
    const entityType = screen.getByTestId('entity-type');
    const search = screen.getByTestId('search');
    expect(scope.parentElement).toBe(search.parentElement);
    expect(scope.previousElementSibling).toBe(search);
    expect(entityType.parentElement).not.toBe(scope.parentElement);
    expect(entityType.previousElementSibling).toBeNull();
  });

  it('still renders the left cluster when the entity selector is its only occupant', () => {
    render(<DataGridToolbar slots={{ entityType: <div data-testid="entity-type" /> }} />);
    expect(screen.getByTestId('entity-type')).toBeInTheDocument();
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
