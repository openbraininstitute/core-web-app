/**
 * The toolbar is one row of two clusters: the workspace the listing is read through on
 * the left (scope → brain region), everything that narrows the current view on the
 * right (entity type → search → filters → columns). Callers hand over named slots and
 * the toolbar decides the order, so this pins the order HERE rather than in every host
 * that fills the slots.
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
  it('lays out scope → brain region, then entity type → search → filters → columns', () => {
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
      order(['scope', 'brain-region', 'extra-left', 'entity-type', 'search', 'filters', 'columns'])
    ).toEqual([
      'scope',
      'brain-region',
      'extra-left',
      'entity-type',
      'search',
      'filters',
      'columns',
    ]);
  });

  it('puts the entity-type selector in the RIGHT cluster, with the search', () => {
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
    // same cluster as the search, a different one from the scope tabs
    expect(entityType.parentElement).toBe(search.parentElement);
    expect(entityType.parentElement).not.toBe(scope.parentElement);
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
