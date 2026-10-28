import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { InOutFiles } from '@/features/scan-config/use-cases/build/in-out-files';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ComponentProps } from 'react';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { TActivityCustomFile } from '@/features/scan-config/types';

const retrieveEntity = vi.hoisted(() => vi.fn());
const invalidateEntityListings = vi.hoisted(() => vi.fn());

vi.mock('@/entity-configuration/domain/requests', () => ({ retrieveEntity }));
vi.mock('@/features/data-grid/listing-queries', () => ({ invalidateEntityListings }));
vi.mock('@/features/scan-config/components/shared/io-layout', () => ({ IoLayout: () => null }));

const MEMODEL_ID = 'memodel-1';
const context = { virtualLabId: 'vl-1', projectId: 'proj-1' };
const config = { id: 'config-1', assets: [] } as unknown as ComponentProps<
  typeof InOutFiles
>['config'];
const makeExecution = (id: string, memodelId?: string) =>
  ({
    id,
    generated: memodelId ? [{ id: memodelId, type: EntityTypeDict.Memodel }] : [],
  }) as unknown as ITaskActivity;

const execution = makeExecution('exec-1', MEMODEL_ID);

const memodel = (validation_status: string, id = MEMODEL_ID) => ({
  id,
  type: EntityTypeDict.Memodel,
  validation_status,
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSelect = vi.fn();
  const view = (
    execStatus: TActivityStatus,
    selectedFile?: TActivityCustomFile,
    shownExecution = execution
  ) => (
    <QueryClientProvider client={client}>
      <InOutFiles
        config={config}
        execStatus={execStatus}
        execution={shownExecution}
        selectedFile={selectedFile}
        onSelect={onSelect}
        context={context}
        campaignOrigin={ScanConfigCampaignOriginActionDict.View}
      />
    </QueryClientProvider>
  );
  return { client, onSelect, view };
}

describe('build InOutFiles', () => {
  beforeEach(() => {
    retrieveEntity.mockReset();
    invalidateEntityListings.mockReset();
  });

  it('refetches the built ME-model, its preview and listings once its run ends, and reselects it', async () => {
    retrieveEntity.mockResolvedValueOnce(memodel('created'));
    retrieveEntity.mockResolvedValueOnce(memodel('done'));
    const { client, onSelect, view } = setup();
    const previewKey = keyBuilder.preview(context, { entityId: MEMODEL_ID, dpi: 100 });
    client.setQueryData(previewKey, 'stale preview');

    const { rerender } = render(view(ActivityStatus.RUNNING));
    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    const selected = onSelect.mock.lastCall?.[0] as TActivityCustomFile;
    expect(selected.entity).toMatchObject({ validation_status: 'created' });

    rerender(view(ActivityStatus.DONE, selected));

    await waitFor(() => expect(retrieveEntity).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(onSelect.mock.lastCall?.[0].entity).toMatchObject({ validation_status: 'done' })
    );
    expect(client.getQueryState(previewKey)?.isInvalidated).toBe(true);
    expect(invalidateEntityListings).toHaveBeenCalledWith(client, EntityTypeDict.Memodel);
  });

  it('fetches a finished build once', async () => {
    retrieveEntity.mockResolvedValue(memodel('done'));
    const { client, onSelect, view } = setup();

    render(view(ActivityStatus.DONE));

    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(retrieveEntity).toHaveBeenCalledTimes(1);
    // the run may have ended while nothing was mounted
    expect(invalidateEntityListings).toHaveBeenCalledWith(client, EntityTypeDict.Memodel);
  });

  it('does not refetch a finished build picked while another one is running', async () => {
    retrieveEntity.mockImplementation(({ id }: { id: string }) =>
      Promise.resolve(memodel(id === MEMODEL_ID ? 'created' : 'done', id))
    );
    const { client, onSelect, view } = setup();
    const previewKey = keyBuilder.preview(context, { entityId: 'memodel-2', dpi: 100 });
    client.setQueryData(previewKey, 'preview');

    const { rerender } = render(view(ActivityStatus.RUNNING));
    await waitFor(() => expect(onSelect).toHaveBeenCalled());

    rerender(view(ActivityStatus.DONE, undefined, makeExecution('exec-2', 'memodel-2')));
    await waitFor(() => expect(retrieveEntity).toHaveBeenCalledTimes(2));
    expect(client.getQueryState(previewKey)?.isInvalidated).toBe(false);
  });

  it('does not refetch when the built ME-model is linked only after its run ended', async () => {
    retrieveEntity.mockResolvedValue(memodel('done'));
    const { client, view } = setup();
    const previewKey = keyBuilder.preview(context, { entityId: MEMODEL_ID, dpi: 100 });
    client.setQueryData(previewKey, 'preview');
    const unlinked = makeExecution('exec-1');

    const { rerender } = render(view(ActivityStatus.RUNNING, undefined, unlinked));
    rerender(view(ActivityStatus.DONE, undefined, unlinked));
    rerender(view(ActivityStatus.DONE));

    await waitFor(() => expect(retrieveEntity).toHaveBeenCalledTimes(1));
    expect(client.getQueryState(previewKey)?.isInvalidated).toBe(false);
  });
});
