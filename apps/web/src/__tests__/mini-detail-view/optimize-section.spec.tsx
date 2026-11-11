import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

vi.mock('@bprogress/next', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/ui/segments/workflows/config', () => ({
  WORKFLOW_SESSION_ID_SEARCH_PARAM: 'workflow_session_id',
}));

// jsdom has no IntersectionObserver, which the mini view's text fields use
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const ionChannelModel = {
  id: 'icm-1',
  name: 'NaTg',
  type: ExtendedEntitiesTypeDict.IonChannelModel,
} as unknown as EntityCoreObjectTypes;

describe('MiniDetailViewRenderer in the Optimize workflow (its scan-config pickers)', () => {
  it('links to the entity details page in a new tab, without "Use model"', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MiniDetailViewRenderer
          section={WorkspaceSection.OptimizeWorkflow}
          record={ionChannelModel}
          dataType={ExtendedEntitiesTypeDict.IonChannelModel}
          enableAnimation={false}
          hideUseModelAction
          openDetailsInNewTab
        />
      </QueryClientProvider>
    );

    const viewDetails = screen.getByRole('button', { name: 'View details' });
    expect(viewDetails).toHaveAttribute(
      'href',
      '/app/virtual-lab/vl-1/proj-1/data/view/ion-channel-model/icm-1'
    );
    expect(viewDetails).toHaveAttribute('target', '_blank');
    expect(screen.queryByText('Use model')).toBeNull();
  });
});
