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
  dense_reconstruction_cell_id: '864691135405224174',
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

  it.each([
    'release_version',
    'level_of_detail',
    'mesh_type',
    'dense_reconstruction_cell_id',
  ])('requires %s', (field) => {
    expect(issuePaths({ ...filledSetup, [field]: null })).toEqual([field]);
  });

  it.each([
    ['release_version', 1.5, 'Release version must be a whole number'],
    ['level_of_detail', 1.5, 'Level of detail must be a whole number'],
    ['dense_reconstruction_cell_id', '1.5', 'Dense reconstruction cell id must be a whole number'],
    [
      'dense_reconstruction_cell_id',
      '9223372036854775808',
      'Dense reconstruction cell id is too large',
    ],
  ])('rejects %s %s', (field, value, message) => {
    const result = SetupSchema.safeParse({ ...filledSetup, [field]: value });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([message]);
  });

  it('keeps every digit of a cell id above 2^53', () => {
    const result = SetupSchema.safeParse(filledSetup);

    expect(result.data?.dense_reconstruction_cell_id).toBe('864691135405224174');
  });
});
