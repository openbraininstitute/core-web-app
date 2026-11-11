/**
 * The selection basket is cross-scope, so it can hold rows this project does not own.
 * The button must not offer to delete a basket with nothing deletable in it, and must
 * not evict the rows it never touched.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityDeleteButton } from '@/ui/segments/data-table/elements/delete-button';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';

vi.mock('@/ui/hooks/use-scope', () => ({
  useScope: () => ({ scope: 'project' }),
}));
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

function renderDeleteButton(selectedRows: EntityCoreIdentifiableNamed[]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EntityDeleteButton<EntityCoreIdentifiableNamed>
        selectedRows={selectedRows}
        clearSelectedRows={vi.fn()}
        dataType={ExtendedEntitiesTypeDict.CellMorphology}
        workspace={workspace}
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
