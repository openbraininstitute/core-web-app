import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { downloadArchive } from '@/services/entity-download';
import sessionAtom from '@/state/session';
import { EntityDownloadButton } from '@/ui/segments/data-table/elements/download-button';

import type { Session } from 'next-auth';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

vi.mock('@/ui/hooks/use-scope', () => ({
  useScope: () => ({ scope: 'public' }),
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

vi.mock('@/services/entity-download', () => ({
  downloadArchive: vi.fn(async () => undefined),
}));

const workspace = { virtualLabId: 'vl-1', projectId: 'proj-1' };

function makeRow(id: string, name?: string): EntityCoreIdentifiable {
  return { id, ...(name ? { name } : {}) } as EntityCoreIdentifiable;
}

function renderDownloadButton({
  selectedRows,
  clearSelectedRows = vi.fn(),
  session = { user: { name: 'tester' } } as Session,
}: {
  selectedRows: EntityCoreIdentifiable[];
  clearSelectedRows?: () => void;
  session?: Session | null;
}) {
  const store = createStore();
  store.set(sessionAtom, session);

  return {
    clearSelectedRows,
    store,
    ...render(
      <Provider store={store}>
        <EntityDownloadButton
          selectedRows={selectedRows}
          clearSelectedRows={clearSelectedRows}
          dataType={ExtendedEntitiesTypeDict.CellMorphology}
          workspace={workspace}
        />
      </Provider>
    ),
  };
}

/**
 * Bulk download for every data listing. `browse-entity-grid.tsx` renders this button
 * in `renderBulkActions`; it used to be reached through a `TableControls` pass-through,
 * which is what this spec used to mount.
 */
describe('EntityDownloadButton (data listing bulk download)', () => {
  beforeEach(() => {
    vi.mocked(downloadArchive).mockReset();
    vi.mocked(downloadArchive).mockResolvedValue(undefined);
  });

  it('hides the bulk download button when there is no session', () => {
    renderDownloadButton({
      selectedRows: [makeRow('m1')],
      session: null,
    });

    expect(screen.queryByTestId('bulk-download-button')).not.toBeInTheDocument();
  });

  it('labels a single selection as Download entity (1)', () => {
    renderDownloadButton({ selectedRows: [makeRow('m1')] });

    expect(screen.getByTestId('bulk-download-button')).toHaveTextContent('Download entity (1)');
  });

  it('labels a multi selection as Download entities (N)', () => {
    renderDownloadButton({
      selectedRows: [makeRow('m1'), makeRow('m2'), makeRow('m3')],
    });

    expect(screen.getByTestId('bulk-download-button')).toHaveTextContent('Download entities (3)');
  });

  it('downloads the selected entity ids through downloadArchive', async () => {
    renderDownloadButton({
      selectedRows: [makeRow('m1'), makeRow('m2')],
    });

    fireEvent.click(screen.getByTestId('bulk-download-button'));

    await waitFor(() => {
      // no single name to name the archive after when several rows are selected
      expect(downloadArchive).toHaveBeenCalledWith(
        EntityTypeDict.CellMorphology,
        ['m1', 'm2'],
        workspace,
        undefined
      );
    });
  });

  it('passes the entity name along when a single row is selected', async () => {
    renderDownloadButton({ selectedRows: [makeRow('m1', 'Morph A')] });

    fireEvent.click(screen.getByTestId('bulk-download-button'));

    await waitFor(() => {
      expect(downloadArchive).toHaveBeenCalledWith(
        EntityTypeDict.CellMorphology,
        ['m1'],
        workspace,
        'Morph A'
      );
    });
  });

  it('disables the button while a download is in progress', async () => {
    let resolveDownload!: () => void;
    vi.mocked(downloadArchive).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDownload = resolve;
        })
    );

    renderDownloadButton({ selectedRows: [makeRow('m1')] });

    fireEvent.click(screen.getByTestId('bulk-download-button'));

    await waitFor(() => {
      expect(screen.getByTestId('bulk-download-button')).toBeDisabled();
    });

    resolveDownload();

    await waitFor(() => {
      expect(screen.getByTestId('bulk-download-button')).not.toBeDisabled();
    });
  });

  it('clears the selection after a successful download', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const clearSelectedRows = vi.fn();

    renderDownloadButton({
      selectedRows: [makeRow('m1')],
      clearSelectedRows,
    });

    fireEvent.click(screen.getByTestId('bulk-download-button'));

    await waitFor(() => {
      expect(downloadArchive).toHaveBeenCalled();
    });

    await vi.advanceTimersByTimeAsync(2000);

    expect(clearSelectedRows).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
