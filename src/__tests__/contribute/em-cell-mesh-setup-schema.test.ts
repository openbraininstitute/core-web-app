import { describe, expect, it } from 'vitest';

import { createEMCellMeshConfig } from '@/ui/segments/contribute/em-cell-mesh/config';
import { SetupSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';

const BRAIN_REGION_ID = '7b2e33b4-37a4-4c3d-9f6c-1b2d3e4f5a6b';
const DATASET_ID = '1c8f0d6e-5a2b-4c7d-8e9f-0a1b2c3d4e5f';

const initialSetup = createEMCellMeshConfig([]).getInitialValues(BRAIN_REGION_ID).setup;

const filledSetup = {
  ...initialSetup,
  name: 'Neuron 42',
  description: 'A neuron',
  experiment_date: '2026-11-25',
  em_dense_reconstruction_dataset_id: DATASET_ID,
  dense_reconstruction_cell_id: 42,
  release_version: 1,
  level_of_detail: 0,
};

function issuePaths(value: unknown) {
  const result = SetupSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('EM cell mesh setup schema', () => {
  it('accepts a setup with every field entitycore requires', () => {
    expect(issuePaths(filledSetup)).toEqual([]);
  });

  it('starts with no dataset, so one must be picked', () => {
    expect(initialSetup?.em_dense_reconstruction_dataset_id).toBeUndefined();
    expect(issuePaths({ ...filledSetup, em_dense_reconstruction_dataset_id: undefined })).toEqual([
      'em_dense_reconstruction_dataset_id',
    ]);
  });

  it('starts with a static mesh type', () => {
    expect(initialSetup?.mesh_type).toBe('static');
  });

  it.each(['release_version', 'level_of_detail', 'mesh_type'])('requires %s', (field) => {
    expect(issuePaths({ ...filledSetup, [field]: null })).toEqual([field]);
  });

  it('rejects a release version that is not a whole number', () => {
    const result = SetupSchema.safeParse({ ...filledSetup, release_version: 1.5 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Release version must be a whole number');
  });
});
