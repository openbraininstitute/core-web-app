/**
 * The selection basket is cross-scope, so it can hold rows this project does not own.
 * The button must not offer to delete a basket with nothing deletable in it, and must
 * not evict the rows it never touched.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityDeleteButton } from '@/ui/segments/data-table/elements/delete-button';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';

vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({
    destroy: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

const workspace = { virtualLabId: 'vl-1', projectId: 'proj-1' };

const publicRow = {
  id: 'p1',
  name: 'Public',
  authorized_public: true,
  authorized_project_id: 'someone-else',
} as unknown as EntityCoreIdentifiableNamed;

const projectRow = {
  id: 'j1',
  name: 'Project',
  authorized_public: false,
  authorized_project_id: 'proj-1',
} as unknown as EntityCoreIdentifiableNamed;

function renderDeleteButton(
  selectedRows: EntityCoreIdentifiableNamed[],
  isRowShown?: (row: EntityCoreIdentifiableNamed) => boolean
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EntityDeleteButton<EntityCoreIdentifiableNamed>
        selectedRows={selectedRows}
        clearSelectedRows={vi.fn()}
        dataType={ExtendedEntitiesTypeDict.CellMorphology}
        workspace={workspace}
        isRowShown={isRowShown}
      />
    </QueryClientProvider>
  );
}

describe('EntityDeleteButton — nothing deletable in the basket', () => {
  it('renders nothing when every selected row belongs to another scope', () => {
    renderDeleteButton([publicRow]);
    // otherwise: "delete 0 items selected", a mutation over an empty list, and the
    // public picks cleared on success
    expect(screen.queryByTestId('bulk-delete-button')).toBeNull();
  });

  it('renders once the basket holds a row this project owns', () => {
    renderDeleteButton([publicRow, projectRow]);
    expect(screen.getByTestId('bulk-delete-button')).toBeInTheDocument();
  });
});

describe('EntityDeleteButton — a basket kept across a scope switch', () => {
  it('names the rows it deletes that the listing does not show', async () => {
    // the user selected a private row, then switched the listing to public data
    const other = { ...projectRow, id: 'j2' } as EntityCoreIdentifiableNamed;
    renderDeleteButton([projectRow, other], (row) => row.id === 'j2');
    fireEvent.click(screen.getByTestId('bulk-delete-button'));
    expect(await screen.findByTestId('delete-hidden-note')).toHaveTextContent(
      '1 of them is not in the scope shown now.'
    );
  });

  it('says nothing more while every row it deletes is shown', async () => {
    renderDeleteButton([projectRow], () => true);
    fireEvent.click(screen.getByTestId('bulk-delete-button'));
    await screen.findByText(/Are you sure you want to delete/);
    expect(screen.queryByTestId('delete-hidden-note')).toBeNull();
  });
});
