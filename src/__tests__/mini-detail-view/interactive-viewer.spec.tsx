import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import { makeCellMorphology } from './fixtures';

import type { ComponentProps } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

vi.mock('@/ui/segments/mini-detail-view/interactive-viewers', async () => {
  const { ExtendedEntitiesTypeDict: Types } = await import(
    '@/api/entitycore/types/extended-entity-type'
  );
  const Viewer = ({ record }: { record: EntityCoreObjectTypes }) => (
    <div data-testid="stub-viewer">{record.id}</div>
  );
  return {
    resolveInteractiveViewer: (type: string) => (type === Types.EMCellMesh ? Viewer : null),
  };
});

vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const mesh = {
  id: 'mesh-1',
  name: 'Neuron mesh',
  type: ExtendedEntitiesTypeDict.EMCellMesh,
} as unknown as EntityCoreObjectTypes;

function renderCard(props: Partial<ComponentProps<typeof MiniDetailViewRenderer>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Provider store={createStore()}>
        <MiniDetailViewRenderer
          section={WorkspaceSection.Data}
          record={mesh}
          dataType={ExtendedEntitiesTypeDict.EMCellMesh}
          enableAnimation={false}
          hideUseModelAction
          {...props}
        />
      </Provider>
    </QueryClientProvider>
  );
}

describe('MiniDetailViewRenderer interactive viewer', () => {
  it('shows the registered viewer above the metadata when the host is interactive', () => {
    renderCard({ interactive: true });

    const slot = screen.getByTestId('mini-detail-interactive-viewer');
    expect(screen.getByTestId('stub-viewer')).toHaveTextContent('mesh-1');
    const firstField = screen.queryAllByTestId(/^mini-detail-property-/).at(0);
    expect(firstField).toBeDefined();
    expect(
      // biome-ignore lint/style/noNonNullAssertion: asserted above
      slot.compareDocumentPosition(firstField!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('keeps the card static when the host is not interactive', () => {
    renderCard();

    expect(screen.queryByTestId('mini-detail-interactive-viewer')).toBeNull();
  });

  it('leaves a type without a viewer unchanged in an interactive host', () => {
    renderCard({
      interactive: true,
      record: makeCellMorphology(),
      dataType: ExtendedEntitiesTypeDict.CellMorphology,
    });

    expect(screen.queryByTestId('mini-detail-interactive-viewer')).toBeNull();
  });

  it('has a close button only when the host passes onClose', () => {
    const { unmount } = renderCard({ interactive: true });
    expect(screen.queryByRole('button', { name: 'close' })).toBeNull();
    unmount();

    renderCard({ interactive: true, onClose: vi.fn() });
    expect(screen.getByRole('button', { name: 'close' })).toBeInTheDocument();
  });
});
