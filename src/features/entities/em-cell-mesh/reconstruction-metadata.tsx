import get from 'es-toolkit/compat/get';
import { getEmDenseReconstructionDataset } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import { EmptyValue } from '@/entity-configuration/definitions/renderer';

type Props = {
  entity: IEMCellMesh;
};

const _fields = [
  {
    key: 'source_database',
    label: 'Source database',
    path: 'source_database',
  },
  {
    key: 'release_version',
    label: 'Release version',
    path: 'release_version',
  },
  {
    key: 'mesh_type',
    label: 'Mesh type',
    path: 'mesh_type',
  },
  {
    key: 'primary_key_id',
    label: 'Primary key ID',
    path: 'primary_key_id',
  },
  {
    key: 'pt_root_id',
    label: 'PT root ID',
    path: 'pt_root_id',
  },
] as const;

export async function ReconstructionMetadata({ entity }: Props) {
  const em = await getEmDenseReconstructionDataset({
    id: entity.em_dense_reconstruction_dataset.id,
  });
  return (
    <div>
      <h2 className="font-bold text-primary-8 text-2xl">Reconstruction Metadata</h2>
      <div className="grid grid-cols-3 gap-1.5">
        {_fields.map(({ key, label, path }) => (
          <div key={key}>
            <div>{label}</div>
            <div>{get({ ...em, ...entity }, path, EmptyValue)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
