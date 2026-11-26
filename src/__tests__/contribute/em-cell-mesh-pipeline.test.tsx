import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadPhase } from '@/api/entitycore/queries/assets/multipart';
import { ApiError } from '@/api/error';
import { useEMCellMeshPipeline } from '@/ui/segments/contribute/em-cell-mesh/pipeline';
import { AgentType } from '@/ui/segments/contribute/shared/types';

import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';

const h = vi.hoisted(() => ({
  createEMCellMesh: vi.fn(),
  deleteEMCellMesh: vi.fn(),
  createAsset: vi.fn(),
  convertEMCellMesh: vi.fn(),
  createContribution: vi.fn(),
  createMtypeClassification: vi.fn(),
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
vi.mock('@/api/entitycore/queries/general/contribution', () => ({
  createContribution: h.createContribution,
}));
vi.mock('@/api/entitycore/queries/annotations/mtype-classification', () => ({
  createMtypeClassification: h.createMtypeClassification,
}));

const MESH_ID = 'mesh-1';
const MTYPE_ID = '5f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b';
const CONTRIBUTION = {
  agent_type: AgentType.Person.key,
  agent_id: '0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d',
  role_id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
};

function values(fileName: string): TEMCellMeshForm {
  return {
    setup: {
      name: 'Neuron 42',
      description: 'A neuron',
      brain_region_id: 'region',
      experiment_date: '2026-11-25',
      em_dense_reconstruction_dataset_id: 'dataset',
      dense_reconstruction_cell_id: '42',
      release_version: 1,
      level_of_detail: 0,
      generation_method: 'marching_cubes',
      mesh_type: 'static',
    },
    subject_id: 'subject',
    license_id: 'license',
    mtype_class_id: MTYPE_ID,
    contribution: [CONTRIBUTION],
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
    onProgress?.({ phase: UploadPhase.Uploading, loadedBytes: 5, totalBytes: 10 });
    return { id: 'asset' };
  });
  h.convertEMCellMesh.mockResolvedValue({ job_id: 'job' });
  h.deleteEMCellMesh.mockResolvedValue(undefined);
  h.createContribution.mockResolvedValue({ id: 'contribution' });
  h.createMtypeClassification.mockResolvedValue({ id: 'classification' });
});

function callOrder(mock: { mock: { invocationCallOrder: number[] } }) {
  return mock.mock.invocationCallOrder[0];
}

function leaveIsBlocked() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

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
    expect(h.createContribution.mock.calls[0][0].contributor).toEqual({
      agent_id: CONTRIBUTION.agent_id,
      role_id: CONTRIBUTION.role_id,
      entity_id: MESH_ID,
    });
    expect(h.createMtypeClassification.mock.calls[0][0].payload).toMatchObject({
      mtype_class_id: MTYPE_ID,
      entity_id: MESH_ID,
    });
    const order = [
      h.createEMCellMesh,
      h.createContribution,
      h.createMtypeClassification,
      h.createAsset,
      h.convertEMCellMesh,
    ].map(callOrder);
    expect(order).toEqual([...order].sort((x, y) => x - y));
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
    ['the upload', () => h.createAsset.mockRejectedValue(new Error('upload failed')), 0],
    ['the conversion launch', () => h.convertEMCellMesh.mockRejectedValue(new Error('409')), 1],
  ])('deletes the OBJ draft when %s fails', async (_, fail, conversions) => {
    fail();
    const { result } = render();

    await act(async () => {
      await expect(result.current.createEntity({ values: values('neuron.obj') })).rejects.toThrow();
    });

    expect(h.deleteEMCellMesh).toHaveBeenCalledWith({
      id: MESH_ID,
      context: { virtualLabId: 'lab', projectId: 'project' },
    });
    expect(h.convertEMCellMesh).toHaveBeenCalledTimes(conversions);
    expect(result.current.completionNotice).toBeNull();
  });

  it('keeps the leave warning on until the failed mesh is deleted', async () => {
    let finishDelete = () => {};
    h.deleteEMCellMesh.mockReturnValue(
      new Promise<void>((resolve) => {
        finishDelete = resolve;
      })
    );
    h.createAsset.mockRejectedValue(new Error('upload failed'));
    const { result } = render();

    let submission: Promise<unknown> = Promise.resolve();
    act(() => {
      submission = result.current
        .createEntity({ values: values('neuron.obj') })
        .catch(() => undefined);
    });
    await waitFor(() => expect(h.deleteEMCellMesh).toHaveBeenCalled());

    expect(leaveIsBlocked()).toBe(true);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      finishDelete();
      await submission;
    });

    expect(leaveIsBlocked()).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('deletes a GLB mesh when its upload fails', async () => {
    h.createAsset.mockRejectedValue(new Error('upload failed'));
    const { result } = render();

    await act(async () => {
      await expect(result.current.createEntity({ values: values('neuron.glb') })).rejects.toThrow();
    });

    expect(h.deleteEMCellMesh).toHaveBeenCalledOnce();
  });

  it('counts the conversion as started when its job already holds the mesh', async () => {
    h.convertEMCellMesh.mockRejectedValue(new Error('gateway timeout'));
    h.deleteEMCellMesh.mockRejectedValue(new ApiError('used', { status: 409 }));
    const { result } = render();

    await act(async () => {
      await expect(result.current.createEntity({ values: values('neuron.obj') })).resolves.toEqual({
        id: MESH_ID,
      });
    });

    expect(result.current.status.convertEMCellMesh).toBe('success');
    expect(result.current.error).toBeNull();
    expect(result.current.completionNotice).toContain('shows as Draft until it is ready');
  });

  it('reports a failed upload even when the delete is refused', async () => {
    h.createAsset.mockRejectedValue(new Error('upload failed'));
    h.deleteEMCellMesh.mockRejectedValue(new ApiError('used', { status: 409 }));
    const { result } = render();

    await act(async () => {
      await expect(result.current.createEntity({ values: values('neuron.obj') })).rejects.toThrow(
        'upload failed'
      );
    });
    expect(h.convertEMCellMesh).not.toHaveBeenCalled();
  });

  it('reports the launch error when the delete fails for another reason', async () => {
    h.convertEMCellMesh.mockRejectedValue(new Error('launch failed'));
    h.deleteEMCellMesh.mockRejectedValue(new ApiError('server error', { status: 500 }));
    const { result } = render();

    await act(async () => {
      await expect(result.current.createEntity({ values: values('neuron.obj') })).rejects.toThrow(
        'launch failed'
      );
    });
    expect(result.current.completionNotice).toBeNull();
  });
});
