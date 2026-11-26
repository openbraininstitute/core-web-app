import type { IEMCellMeshCreate } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';

export function toEMCellMeshCreatePayload(values: TEMCellMeshForm): IEMCellMeshCreate {
  const { setup } = values;
  return {
    name: setup.name,
    description: setup.description,
    brain_region_id: setup.brain_region_id,
    subject_id: values.subject_id,
    license_id: values.license_id,
    experiment_date:
      typeof setup.experiment_date === 'string'
        ? setup.experiment_date
        : setup.experiment_date.toISOString(),
    contact_email: setup.contact_email,
    published_in: setup.published_in,
    notice_text: setup.notice_text,
    em_dense_reconstruction_dataset_id: setup.em_dense_reconstruction_dataset_id,
    release_version: setup.release_version,
    dense_reconstruction_cell_id: setup.dense_reconstruction_cell_id,
    generation_method: setup.generation_method,
    level_of_detail: setup.level_of_detail,
    mesh_type: setup.mesh_type,
  };
}
