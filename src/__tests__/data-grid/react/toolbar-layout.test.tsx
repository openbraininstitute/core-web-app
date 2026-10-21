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
  it('lays out entity type → scope → brain region, then search → filters → columns', () => {
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
      'scope',
      'brain-region',
      'extra-left',
      'search',
      'filters',
      'columns',
    ]);
  });

  it('puts a call to action first in the left cluster, ahead of the pickers', () => {
    render(
      <DataGridToolbar
        slots={{
          action: <div data-testid="action" />,
          left: <div data-testid="extra-left" />,
          search: <div data-testid="search" />,
        }}
      />
    );

    expect(order(['action', 'extra-left', 'search'])).toEqual(['action', 'extra-left', 'search']);
    expect(screen.getByTestId('action').parentElement).toBe(
      screen.getByTestId('extra-left').parentElement
    );
  });

  it('centres the bulk actions between two equal clusters', () => {
    render(
      <DataGridToolbar
        slots={{ action: <div data-testid="action" />, search: <div data-testid="search" /> }}
        bulkActions={<div data-testid="bulk" />}
      />
    );

    expect(order(['action', 'bulk', 'search'])).toEqual(['action', 'bulk', 'search']);
    const left = screen.getByTestId('action').parentElement;
    const right = screen.getByTestId('search').parentElement;
    expect(screen.getByTestId('bulk').parentElement).toBe(left?.parentElement);
    for (const side of [left, right]) expect(side).toHaveClass('flex-1', 'basis-0');
  });

  it('puts the entity-type selector FIRST in the left cluster, ahead of the scope tabs', () => {
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
    expect(entityType.parentElement).toBe(scope.parentElement);
    expect(entityType.parentElement).not.toBe(search.parentElement);
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
