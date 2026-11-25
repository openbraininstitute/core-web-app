import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEMCellMeshPipeline } from '@/ui/segments/contribute/em-cell-mesh/pipeline';

import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';

const h = vi.hoisted(() => ({
  createEMCellMesh: vi.fn(),
  deleteEMCellMesh: vi.fn(),
  createAsset: vi.fn(),
  convertEMCellMesh: vi.fn(),
}));

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'lab', projectId: 'project' }),
}));
vi.mock('@/features/data-grid/listing-queries', () => ({ invalidateEntityListings: vi.fn() }));
vi.mock('@/api/entitycore/queries', () => ({
  createEMCellMesh: h.createEMCellMesh,
  deleteEMCellMesh: h.deleteEMCellMesh,
}));
vi.mock('@/api/entitycore/queries/assets', () => ({ createAsset: h.createAsset }));
vi.mock('@/api/one/em-cell-mesh', () => ({ convertEMCellMesh: h.convertEMCellMesh }));

const MESH_ID = 'mesh-1';

function values(fileName: string): TEMCellMeshForm {
  return {
    setup: {
      name: 'Neuron 42',
      description: 'A neuron',
      brain_region_id: 'region',
      experiment_date: '2026-11-25',
      em_dense_reconstruction_dataset_id: 'dataset',
      dense_reconstruction_cell_id: 42,
      release_version: 1,
      level_of_detail: 0,
      generation_method: 'marching_cubes',
      mesh_type: 'static',
    },
    subject_id: 'subject',
    license_id: 'license',
    mtype_class_id: '',
    contribution: [],
    assets: { mesh: new File(['v 0 0 0\n'], fileName) },
  } as unknown as TEMCellMeshForm;
}

function render() {
  const client = new QueryClient();
  return renderHook(() => useEMCellMeshPipeline({ sessionId: 'session' }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.createEMCellMesh.mockResolvedValue({ id: MESH_ID });
  h.createAsset.mockImplementation(async ({ onProgress }) => {
    onProgress?.({ phase: 'uploading', loadedBytes: 5, totalBytes: 10 });
    return { id: 'asset' };
  });
  h.convertEMCellMesh.mockResolvedValue({ job_id: 'job' });
  h.deleteEMCellMesh.mockResolvedValue(undefined);
});

describe('useEMCellMeshPipeline', () => {
  it('creates an OBJ mesh as a draft, uploads it, then starts its conversion', async () => {
    const { result } = render();

    await act(() => result.current.createEntity({ values: values('neuron.obj') }));

    expect(h.createEMCellMesh.mock.calls[0][0].payload.lifecycle_status).toBe('draft');
    expect(h.createAsset.mock.calls[0][0].mimeType).toBe('application/obj');
    expect(h.convertEMCellMesh).toHaveBeenCalledWith({
      ctx: { virtualLabId: 'lab', projectId: 'project' },
      entityId: MESH_ID,
    });
    expect(result.current.skippedSteps).toEqual([]);
    expect(result.current.completionNotice).toContain('shows as Draft until it is ready');
    expect(result.current.stepProgress?.createEMCellMeshAssets.detail).toBe(
      'Uploading 5 Bytes of 10 Bytes'
    );
  });

  it('creates a GLB mesh as active and skips the conversion', async () => {
    const { result } = render();

    await act(() => result.current.createEntity({ values: values('neuron.glb') }));

    expect(h.createEMCellMesh.mock.calls[0][0].payload.lifecycle_status).toBe('active');
    expect(h.convertEMCellMesh).not.toHaveBeenCalled();
    expect(result.current.skippedSteps).toEqual(['convertEMCellMesh']);
    expect(result.current.completionNotice).toBeNull();
  });

  it.each([
    ['the upload', () => h.createAsset.mockRejectedValue(new Error('upload failed'))],
    ['the conversion launch', () => h.convertEMCellMesh.mockRejectedValue(new Error('409'))],
  ])('deletes the OBJ draft when %s fails', async (_, fail) => {
    fail();
    const { result } = render();

    await act(async () => {
      await expect(result.current.createEntity({ values: values('neuron.obj') })).rejects.toThrow();
    });

    expect(h.deleteEMCellMesh).toHaveBeenCalledWith({
      id: MESH_ID,
      context: { virtualLabId: 'lab', projectId: 'project' },
    });
    expect(result.current.completionNotice).toBeNull();
  });

  it('deletes a GLB mesh when its upload fails', async () => {
    h.createAsset.mockRejectedValue(new Error('upload failed'));
    const { result } = render();

    await act(async () => {
      await expect(result.current.createEntity({ values: values('neuron.glb') })).rejects.toThrow();
    });

    expect(h.deleteEMCellMesh).toHaveBeenCalledOnce();
  });

  it('reports the launch error when the conversion already holds the mesh', async () => {
    h.convertEMCellMesh.mockRejectedValue(new Error('launch failed'));
    h.deleteEMCellMesh.mockRejectedValue(new Error('mesh used by an activity'));
    const { result } = render();

    await act(async () => {
      await expect(result.current.createEntity({ values: values('neuron.obj') })).rejects.toThrow(
        'launch failed'
      );
    });
  });
});
