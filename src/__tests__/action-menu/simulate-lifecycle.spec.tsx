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

describe('ActionMenu Simulate lifecycle gating', () => {
  it('hides Simulate when the entity type is not simulatable', () => {
    renderActionMenu(
      makeCellMorphology() as EntityTypeValue,
      ExtendedEntitiesTypeDict.CellMorphology
    );

    expect(screen.queryByRole('button', { name: 'Simulate' })).not.toBeInTheDocument();
  });

  it('enables Simulate for an active simulatable entity', () => {
    renderActionMenu(
      makeMemodel({ lifecycle_status: EntityLifecycleStatus.Active }) as EntityTypeValue
    );

    const simulate = screen.getByRole('button', { name: /Simulate/ });
    expect(simulate).toBeEnabled();
    expect(simulate).toHaveAttribute('href', '/workflows/simulate/configure/test');
  });

  it.each([
    EntityLifecycleStatus.Draft,
    EntityLifecycleStatus.Disqualified,
  ])('shows Simulate disabled for a %s simulatable entity', (status) => {
    renderActionMenu(makeMemodel({ lifecycle_status: status }) as EntityTypeValue);

    const simulate = screen.getByRole('button', { name: /Simulate/ });
    expect(simulate).toBeDisabled();
    expect(simulate).not.toHaveAttribute('href');
  });
});
