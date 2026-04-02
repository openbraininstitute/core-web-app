import { find, values } from 'es-toolkit/compat';
import { EMCellMeshTypeDict } from '@/api/entitycore/types/entities/em-cell-mesh';
import { renderExternalUrl } from '@/entity-configuration/definitions/render-external-url';

export const ReconstructionMetadataFields = [
  {
    key: 'em-dense-reconstruction-dataset.release_url',
    label: 'Release URL',
    path: 'emDenseReconstructionDataset.release_url',
    renderer: renderExternalUrl,
  },
  {
    key: 'entity.release_version',
    label: 'Release version',
    path: 'entity.release_version',
    renderer: null,
  },
  {
    key: 'entity.mesh_type',
    label: 'Mesh type',
    path: 'entity.mesh_type',
    renderer: (key: string) => find(values(EMCellMeshTypeDict), (v) => v.key === key)?.label || key,
  },
  {
    key: 'em-dense-reconstruction-dataset.em_dense_reconstruction_dataset',
    label: 'EM Dense Reconstruction dataset',
    path: 'emDenseReconstructionDataset.name',
    renderer: null,
  },
  {
    key: 'em-dense-reconstruction-dataset.cell_identifying_property',
    label: 'Cell identifying property',
    path: 'emDenseReconstructionDataset.cell_identifying_property',
    renderer: null,
  },
  {
    key: 'entity.dense_reconstruction_cell_id',
    label: 'Dense reconstruction cell ID',
    path: 'entity.dense_reconstruction_cell_id',
    renderer: null,
  },
];
