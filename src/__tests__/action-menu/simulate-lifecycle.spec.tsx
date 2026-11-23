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
  listLaunchActionsFromDataViewEntity: ({ extendedType }: { extendedType: string }) =>
    extendedType === 'memodel'
      ? [
          {
            activity: 'simulate',
            workflow: { targetType: 'me_model_circuit_simulation' },
            label: 'Simulate',
            href: '/workflows/simulate/configure/test',
          },
          {
            activity: 'build',
            workflow: { targetType: 'build_synaptome_campaign' },
            label: 'Build synaptome',
            href: '/workflows/build/configure/test',
          },
        ]
      : [],
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

  it('lists one action per launchable workflow', () => {
    renderActionMenu(
      makeMemodel({ lifecycle_status: EntityLifecycleStatus.Active }) as EntityTypeValue
    );

    const build = screen.getByRole('button', { name: /Build synaptome/ });
    expect(build).toHaveAttribute('href', '/workflows/build/configure/test');
    expect(build).toHaveAttribute('data-testid', 'data-view-action-build-build_synaptome_campaign');
  });

  it.each([
    EntityLifecycleStatus.Draft,
    EntityLifecycleStatus.Disqualified,
  ])('shows every launch action disabled for a %s entity', (status) => {
    renderActionMenu(makeMemodel({ lifecycle_status: status }) as EntityTypeValue);

    for (const name of [/Simulate/, /Build synaptome/]) {
      const action = screen.getByRole('button', { name });
      expect(action).toBeDisabled();
      expect(action).not.toHaveAttribute('href');
    }
  });
});
