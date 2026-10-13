import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { EmCellMeshPreviewViewer } from '@/features/entities/em-cell-mesh/preview-viewer';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { IAsset } from '@/api/entitycore/types/shared/global';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

vi.mock('@/api/entitycore/queries/experimental/em-cell-mesh', () => ({
  getEmCellMesh: vi.fn(),
}));

vi.mock('@/features/entities/em-cell-mesh/viewer/em-mesh-viewer', () => ({
  EmCellMeshViewer: ({
    entity,
    asset,
  }: {
    entity: { id: string; name: string };
    asset: Pick<IAsset, 'id'>;
  }) => (
    <div data-testid="em-mesh-viewer">
      {entity.id}:{entity.name}:{asset.id}
    </div>
  ),
}));

const GLB = {
  id: 'glb-1',
  label: AssetLabel.cell_surface_mesh,
  content_type: AssetContentType.gltf_binary,
  size: 1000,
} as IAsset;

// a listing record, without assets
const record = {
  id: 'mesh-1',
  name: 'Neuron mesh',
  type: ExtendedEntitiesTypeDict.EMCellMesh,
} as unknown as EntityCoreObjectTypes;

function renderViewer(viewerRecord: EntityCoreObjectTypes = record) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EmCellMeshPreviewViewer record={viewerRecord} />
    </QueryClientProvider>
  );
}

describe('EmCellMeshPreviewViewer', () => {
  beforeEach(() => vi.mocked(getEmCellMesh).mockReset());

  it('fetches the mesh by id and passes its GLB to the viewer', async () => {
    vi.mocked(getEmCellMesh).mockResolvedValue({
      ...record,
      assets: [GLB],
    } as unknown as IEMCellMesh);

    renderViewer();

    expect(await screen.findByTestId('em-mesh-viewer')).toHaveTextContent(
      'mesh-1:Neuron mesh:glb-1'
    );
    expect(getEmCellMesh).toHaveBeenCalledWith(expect.objectContaining({ id: 'mesh-1' }));
  });

  it('uses the GLB a listing record already carries, without a fetch', async () => {
    renderViewer({ ...record, assets: [GLB] } as unknown as EntityCoreObjectTypes);

    expect(await screen.findByTestId('em-mesh-viewer')).toHaveTextContent(
      'mesh-1:Neuron mesh:glb-1'
    );
    expect(getEmCellMesh).not.toHaveBeenCalled();
  });

  it('says so when the mesh has no GLB', async () => {
    vi.mocked(getEmCellMesh).mockResolvedValue({ ...record, assets: [] } as unknown as IEMCellMesh);

    renderViewer();

    expect(await screen.findByText('This mesh has no viewable file.')).toBeInTheDocument();
    expect(screen.queryByTestId('em-mesh-viewer')).toBeNull();
  });

  it('offers a retry when the fetch fails', async () => {
    vi.mocked(getEmCellMesh)
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce({ ...record, assets: [GLB] } as unknown as IEMCellMesh);

    renderViewer();

    expect(await screen.findByText('Could not load this mesh.')).toBeInTheDocument();
    expect(screen.queryByText('This mesh has no viewable file.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('em-mesh-viewer')).toHaveTextContent('glb-1');
  });
});
