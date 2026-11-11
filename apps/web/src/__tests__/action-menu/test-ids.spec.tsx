import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityLifecycleStatus } from '@/api/entitycore/types/shared/global';
import ActionMenu from '@/ui/segments/action-menu';

import { makeCellMorphology, makeMemodel } from '../mini-detail-view/fixtures';

import type { ReactNode } from 'react';
import type { EntityTypeValue } from '@/entity-configuration/domain';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/features/feature-flags', () => ({
  useFlags: () => ({}),
}));

vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCopyClipboard', () => ({
  useCopyToClipboard: () => [null, vi.fn(), null, false],
}));

vi.mock('@/ui/segments/workflows/config', () => ({
  buildSimulateConfigureUrlFromDataViewEntity: () => '/workflows/simulate/configure/test',
}));

const workspace = { virtualLabId: 'vl-1', projectId: 'proj-1' };

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Provider>{ui}</Provider>
    </QueryClientProvider>
  );
}

function renderActionMenu(entity: EntityTypeValue, type = ExtendedEntitiesTypeDict.Memodel) {
  return wrap(
    <ActionMenu
      entity={entity}
      ctx={workspace}
      type={type}
      parentLink="/data"
      isPublicEntity={false}
    />
  );
}

/**
 * The end-to-end suite addresses these actions by test id, so a rename here
 * breaks it. See obi-e2e locators/data-view.ts.
 */
describe('ActionMenu test ids', () => {
  it('marks the panel and every action of a simulatable, downloadable entity', () => {
    renderActionMenu(
      makeMemodel({ lifecycle_status: EntityLifecycleStatus.Active }) as EntityTypeValue
    );

    expect(screen.getByTestId('data-view-actions')).toBeInTheDocument();
    expect(screen.getByTestId('data-view-action-copy-id')).toBeInTheDocument();
    expect(screen.getByTestId('data-view-action-download')).toBeInTheDocument();

    const simulate = screen.getByTestId('data-view-action-simulate');
    expect(simulate).toBeEnabled();
    expect(simulate).toHaveAttribute('href', '/workflows/simulate/configure/test');
  });

  it('keeps the simulate test id when the lifecycle blocks it', () => {
    renderActionMenu(
      makeMemodel({ lifecycle_status: EntityLifecycleStatus.Draft }) as EntityTypeValue
    );

    const simulate = screen.getByTestId('data-view-action-simulate');
    expect(simulate).toBeDisabled();
    expect(simulate).not.toHaveAttribute('href');
  });

  it('marks delete, and omits simulate, for a deletable entity that cannot be simulated', () => {
    renderActionMenu(
      makeCellMorphology() as EntityTypeValue,
      ExtendedEntitiesTypeDict.CellMorphology
    );

    expect(screen.getByTestId('data-view-action-delete')).toBeInTheDocument();
    expect(screen.queryByTestId('data-view-action-simulate')).not.toBeInTheDocument();
  });
});
