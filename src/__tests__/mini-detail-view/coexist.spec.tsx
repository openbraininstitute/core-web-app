import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));
vi.mock('@bprogress/next', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/ui/segments/workflows/config', () => ({
  WORKFLOW_SESSION_ID_SEARCH_PARAM: 'workflow_session_id',
}));
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const record = {
  id: 'icm-1',
  name: 'NaTg',
  type: ExtendedEntitiesTypeDict.IonChannelModel,
} as unknown as EntityCoreObjectTypes;

describe('card next to another dismissable panel', () => {
  it('stays open when the other panel is clicked', () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MiniDetailViewRenderer
          section={WorkspaceSection.Notebooks}
          record={record}
          dataType={ExtendedEntitiesTypeDict.IonChannelModel}
          enableAnimation={false}
          onClose={onClose}
          dismissOnOutsideInteraction
        />
        <div data-dismissable="">
          <button type="button">assistant</button>
        </div>
        <div data-dismissable="">
          <button type="button" aria-label="expand AI assistant">
            OBI Assistant
          </button>
        </div>
        <button type="button">page</button>
      </QueryClientProvider>
    );
    expect(screen.getByTestId('mini-viewer').closest('[data-dismissable]')).not.toBeNull();
    fireEvent.mouseDown(screen.getByText('assistant'));
    fireEvent.mouseDown(screen.getByText('OBI Assistant'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByText('page'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
