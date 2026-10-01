import { describe, expect, it, vi } from 'vitest';

const post = vi.fn();

vi.mock('@/api/one/utils', () => ({
  obioneApi: async () => ({ post }),
}));

import { ApiError } from '@/api/error';
import { createAndRegisterMorphometrics, resolveNeuronFile } from '@/api/one/cell-morphology';
import { CellMorphologyAssetsSchema } from '@/ui/segments/contribute/cell-morphology/schema';

const file = new File(['garbage'], 'bad.swc', { type: 'application/swc' });

// The api client throws on every non-2xx, so a rejected file never arrives as a response.
describe('resolveNeuronFile', () => {
  it('reports the reason for a 422 so the file can be kept', async () => {
    post.mockRejectedValue(
      new ApiError('Morphology validation failed: bad parent id', {
        status: 422,
        code: 'INVALID_REQUEST',
      })
    );

    expect(await resolveNeuronFile(file)).toEqual({
      isValid: false,
      validationError: 'Morphology validation failed: bad parent id',
    });
  });

  it('strips the ANSI colour codes morphio writes into the reason', async () => {
    post.mockRejectedValue(
      new ApiError('Morphology validation failed:\n\x1b[1;31merror\x1b[0m: bad parent id', {
        status: 422,
      })
    );

    expect(await resolveNeuronFile(file)).toEqual({
      isValid: false,
      validationError: 'Morphology validation failed:\nerror: bad parent id',
    });
  });

  it('rethrows failures obi-one will not store', async () => {
    post.mockRejectedValue(new ApiError('Failed to convert the file', { status: 400 }));

    await expect(resolveNeuronFile(file)).rejects.toThrow('Failed to convert the file');
  });
});

describe('createAndRegisterMorphometrics', () => {
  it('treats a 200 disqualified response as stored, not as an error', async () => {
    post.mockResolvedValue({
      json: async () => ({
        entity_id: 'entity-1',
        lifecycle_status: 'disqualified',
        validation_error: 'bad parent id',
        measurement_entity_id: null,
        mesh_asset_id: null,
      }),
    });

    await expect(
      createAndRegisterMorphometrics(file, {}, { projectId: 'pj-1', virtualLabId: 'vl-1' })
    ).resolves.toEqual({
      id: 'entity-1',
      lifecycleStatus: 'disqualified',
      validationError: 'bad parent id',
    });
  });
});

describe('CellMorphologyAssetsSchema', () => {
  it('accepts a single unconverted file and rejects none', () => {
    expect(CellMorphologyAssetsSchema.safeParse({ swc: file }).success).toBe(true);
    expect(CellMorphologyAssetsSchema.safeParse({}).success).toBe(false);
  });
});
