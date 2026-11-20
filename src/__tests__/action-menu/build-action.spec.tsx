import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityLifecycleStatus } from '@/api/entitycore/types/shared/global';
import ActionMenu from '@/ui/segments/action-menu';

import { makeMemodel } from '../mini-detail-view/fixtures';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityTypeValue } from '@/entity-configuration/domain';

const push = vi.fn();
const buildHref = vi.fn();
const notifyError = vi.fn();

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: () => ({ replace: vi.fn(), push }),
}));

vi.mock('@/features/feature-flags', () => ({
  useFlags: () => ({}),
}));

vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ error: notifyError, success: vi.fn() }),
}));

vi.mock('@/hooks/useCopyClipboard', () => ({
  useCopyToClipboard: () => [null, vi.fn(), null, false],
}));

vi.mock('@/ui/segments/workflows/config', () => ({
  buildSimulateConfigureUrlFromDataViewEntity: () => null,
  buildBuildConfigureUrlFromDataViewEntity: (...args: unknown[]) => buildHref(...args),
}));

const workspace = { virtualLabId: 'vl-1', projectId: 'proj-1' };

function makeIonChannelRecording(lifecycle_status?: string) {
  return {
    id: 'recording-1',
    name: 'Test recording',
    type: EntityTypeDict.IonChannelRecording,
    lifecycle_status,
  } as unknown as EntityTypeValue;
}

function renderActionMenu(entity: EntityTypeValue, type: TExtendedEntitiesTypeDict) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui: ReactNode = (
    <ActionMenu entity={entity} ctx={workspace} type={type} parentLink="/data" isPublicEntity />
  );
  return render(
    <QueryClientProvider client={qc}>
      <Provider>{ui}</Provider>
    </QueryClientProvider>
  );
}

describe('ActionMenu Build action', () => {
  beforeEach(() => {
    push.mockReset();
    buildHref.mockReset();
    notifyError.mockReset();
  });

  it('starts the build workflow with the recording selected', () => {
    buildHref.mockReturnValue('/workflows/build/configure/ion-channel-build-campaign/wf_1');
    renderActionMenu(
      makeIonChannelRecording(EntityLifecycleStatus.Active),
      ExtendedEntitiesTypeDict.IonChannelRecording
    );

    // nothing is written before the user asks for it
    expect(buildHref).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Build/ }));

    expect(buildHref).toHaveBeenCalledWith({
      workspace,
      extendedType: ExtendedEntitiesTypeDict.IonChannelRecording,
      entityId: 'recording-1',
      flags: {},
    });
    expect(push).toHaveBeenCalledWith('/workflows/build/configure/ion-channel-build-campaign/wf_1');
  });

  it('tells the user when no build workflow is available', () => {
    buildHref.mockReturnValue(null);
    renderActionMenu(makeIonChannelRecording(), ExtendedEntitiesTypeDict.IonChannelRecording);

    fireEvent.click(screen.getByTestId('data-view-action-build'));

    expect(push).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledOnce();
  });

  it('disables Build for a draft recording', () => {
    renderActionMenu(
      makeIonChannelRecording(EntityLifecycleStatus.Draft),
      ExtendedEntitiesTypeDict.IonChannelRecording
    );

    expect(screen.getByTestId('data-view-action-build')).toBeDisabled();
  });

  it('hides Build for entity types that are not buildable', () => {
    renderActionMenu(
      makeMemodel({ lifecycle_status: EntityLifecycleStatus.Active }) as EntityTypeValue,
      ExtendedEntitiesTypeDict.Memodel
    );

    expect(screen.queryByTestId('data-view-action-build')).not.toBeInTheDocument();
  });
});
