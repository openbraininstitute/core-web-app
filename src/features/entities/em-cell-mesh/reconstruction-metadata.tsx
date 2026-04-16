import get from 'es-toolkit/compat/get';
import { getEmDenseReconstructionDataset } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import { EmptyValue } from '@/entity-configuration/definitions/empty-value';
import { ReconstructionMetadataFields } from '@/features/entities/em-cell-mesh/helpers';

type Props = {
  entity: IEMCellMesh;
};

export async function ReconstructionMetadata({ entity }: Props) {
  const emDenseReconstructionDataset = await getEmDenseReconstructionDataset({
    id: entity.em_dense_reconstruction_dataset.id,
  });
  const resource = { emDenseReconstructionDataset, entity };
  return (
    <div>
      <h2 className="font-bold text-primary-8 text-2xl mb-4">Reconstruction metadata</h2>
      <div className="grid grid-cols-3 items-center justify-between gap-y-5">
        {ReconstructionMetadataFields.map(({ key, label, path, renderer }) => (
          <div key={key} id={key} className="text-primary-7 flex flex-col">
            <div className="text-neutral-4 uppercase">{label}</div>
            <div className="flex items-center justify-start">
              <div>
                {renderer
                  ? renderer(get(resource, path, EmptyValue))
                  : get(resource, path, EmptyValue)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
