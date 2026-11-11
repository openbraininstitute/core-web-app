import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';

import { IonChannelRecordingRelatedArtifacts } from './ion-channel-recording';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';

const queries = vi.hoisted(() => ({
  getTaskActivities: vi.fn(),
  getTaskConfig: vi.fn(),
  getIonChannelModelingExecutions: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/task', () => ({
  getTaskActivities: queries.getTaskActivities,
  getTaskConfig: queries.getTaskConfig,
}));
vi.mock('@/api/entitycore/queries/model/ion-channel-modeling-execution', () => ({
  getIonChannelModelingExecutions: queries.getIonChannelModelingExecutions,
}));
vi.mock('@/features/views/listing/browse-entity', () => ({
  BrowseEntityScope: ({ extraQueryParams }: { extraQueryParams?: { id__in: string[] } }) => (
    <div data-testid="recordings">{extraQueryParams?.id__in.join(',') ?? 'all'}</div>
  ),
}));

const context = { virtualLabId: 'vlab', projectId: 'proj' };

function renderTab() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback={null}>
        <IonChannelRecordingRelatedArtifacts
          icm={{ id: 'model-id' } as IonChannelModel}
          context={context}
        />
      </Suspense>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('IonChannelRecordingRelatedArtifacts', () => {
  it('lists every recording the model was fitted to, from its task config inputs', async () => {
    queries.getTaskActivities.mockResolvedValue({
      data: [{ used: [{ id: 'config-id', type: 'task_config' }] }],
    });
    queries.getTaskConfig.mockResolvedValue({
      inputs: [{ id: 'recording-1' }, { id: 'recording-2' }],
    });

    renderTab();

    expect((await screen.findByTestId('recordings')).textContent).toBe('recording-1,recording-2');
    expect(queries.getTaskActivities).toHaveBeenCalledWith({
      context,
      filters: {
        generated__id: 'model-id',
        task_activity_type: TaskActivityType.IonChannelModelingExecution,
      },
    });
    expect(queries.getIonChannelModelingExecutions).not.toHaveBeenCalled();
  });

  it('falls back to the pre-scan-config entities for older models', async () => {
    queries.getTaskActivities.mockResolvedValue({ data: [] });
    queries.getIonChannelModelingExecutions.mockResolvedValue({ data: [] });

    renderTab();

    // no recordings anywhere: an empty state, never the unfiltered recordings listing
    await screen.findByText('No recordings found for this model');
    expect(screen.queryByTestId('recordings')).toBeNull();
    expect(queries.getIonChannelModelingExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { generated__id__in: ['model-id'] } })
    );
  });
});
