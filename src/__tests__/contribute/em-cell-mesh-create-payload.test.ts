import { describe, expect, it } from 'vitest';

import { toEMCellMeshCreatePayload } from '@/ui/segments/contribute/em-cell-mesh/helpers';

import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';

const DATASET_ID = '1c8f0d6e-5a2b-4c7d-8e9f-0a1b2c3d4e5f';

const values = {
  setup: {
    name: 'Neuron 42',
    description: 'A neuron',
    brain_region_id: 'region',
    experiment_date: new Date('2026-11-25T00:00:00Z'),
    em_dense_reconstruction_dataset_id: DATASET_ID,
    dense_reconstruction_cell_id: '864691135405224174',
    release_version: 1,
    level_of_detail: 0,
    generation_method: 'marching_cubes',
    mesh_type: 'static',
    generation_parameters: 'stale',
  },
  subject_id: 'subject',
  license_id: 'license',
  mtype_class_id: '',
  contribution: [],
  assets: {},
} as unknown as TEMCellMeshForm;

describe('toEMCellMeshCreatePayload', () => {
  it('sends every field entitycore requires', () => {
    expect(toEMCellMeshCreatePayload(values)).toMatchObject({
      release_version: 1,
      level_of_detail: 0,
      mesh_type: 'static',
      generation_method: 'marching_cubes',
      dense_reconstruction_cell_id: '864691135405224174',
      em_dense_reconstruction_dataset_id: DATASET_ID,
      subject_id: 'subject',
      license_id: 'license',
      experiment_date: '2026-11-25T00:00:00.000Z',
    });
  });

  it('leaves out fields the form does not show', () => {
    expect(toEMCellMeshCreatePayload(values)).not.toHaveProperty('generation_parameters');
  });
});
