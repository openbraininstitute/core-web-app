import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { InOutFiles } from '@/features/scan-config/use-cases/build/in-out-files';

import type { ComponentProps } from 'react';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { TActivityCustomFile } from '@/features/scan-config/types';

const retrieveEntity = vi.hoisted(() => vi.fn());

vi.mock('@/entity-configuration/domain/requests', () => ({ retrieveEntity }));
vi.mock('@/features/data-grid/listing-queries', () => ({ invalidateEntityListings: vi.fn() }));
vi.mock('@/features/scan-config/components/shared/io-layout', () => ({ IoLayout: () => null }));

const MEMODEL_ID = 'memodel-1';
const context = { virtualLabId: 'vl-1', projectId: 'proj-1' };
const config = { id: 'config-1', assets: [] } as unknown as ComponentProps<
  typeof InOutFiles
>['config'];
const execution = {
  id: 'exec-1',
  generated: [{ id: MEMODEL_ID, type: EntityTypeDict.Memodel }],
} as unknown as ITaskActivity;

const memodel = (validation_status: string) => ({
  id: MEMODEL_ID,
  type: EntityTypeDict.Memodel,
  validation_status,
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSelect = vi.fn();
  const view = (execStatus: TActivityStatus, selectedFile?: TActivityCustomFile) => (
    <QueryClientProvider client={client}>
      <InOutFiles
        config={config}
        execStatus={execStatus}
        execution={execution}
        selectedFile={selectedFile}
        onSelect={onSelect}
        context={context}
        campaignOrigin={ScanConfigCampaignOriginActionDict.View}
      />
    </QueryClientProvider>
  );
  return { onSelect, view };
}

describe('build InOutFiles', () => {
  beforeEach(() => retrieveEntity.mockReset());

  it('refetches the built ME-model once its run ends and reselects it', async () => {
    retrieveEntity.mockResolvedValueOnce(memodel('created'));
    retrieveEntity.mockResolvedValueOnce(memodel('done'));
    const { onSelect, view } = setup();

    const { rerender } = render(view(ActivityStatus.RUNNING));
    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    const selected = onSelect.mock.lastCall?.[0] as TActivityCustomFile;
    expect(selected.entity).toMatchObject({ validation_status: 'created' });

    rerender(view(ActivityStatus.DONE, selected));

    await waitFor(() => expect(retrieveEntity).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(onSelect.mock.lastCall?.[0].entity).toMatchObject({ validation_status: 'done' })
    );
  });

  it('fetches a finished build once', async () => {
    retrieveEntity.mockResolvedValue(memodel('done'));
    const { onSelect, view } = setup();

    render(view(ActivityStatus.DONE));

    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(retrieveEntity).toHaveBeenCalledTimes(1);
  });
});
