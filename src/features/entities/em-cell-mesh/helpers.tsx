import { find, values } from 'es-toolkit/compat';
import { EMCellMeshTypeDict } from '@/api/entitycore/types/entities/em-cell-mesh';

export const ReconstructionMetadataFields = [
  {
    key: 'source_database',
    label: 'Source database',
    path: 'source_database',
    renderer: null,
  },
  {
    key: 'release_version',
    label: 'Release version',
    path: 'entity.release_version',
    renderer: null,
  },
  {
    key: 'mesh_type',
    label: 'Mesh type',
    path: 'entity.mesh_type',
    renderer: (key: string) => find(values(EMCellMeshTypeDict), (v) => v.key === key)?.label || key,
  },
  {
    key: 'em_dense_reconstruction_dataset',
    label: 'EM Dense Reconstruction dataset',
    path: 'em.name',
    renderer: null,
  },
  {
    key: 'primary_key_id',
    label: 'Primary key ID',
    path: 'em.id',
    renderer: null,
  },
];
