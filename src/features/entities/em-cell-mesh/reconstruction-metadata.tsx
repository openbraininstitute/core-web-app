import get from 'es-toolkit/compat/get';

import { getEmDenseReconstructionDataset } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import { renderExternalUrl } from '@/entity-configuration/definitions/render-external-url';
import { EmptyValue } from '@/entity-configuration/definitions/empty-value';
import { ReconstructionMetadataFields } from '@/features/entities/em-cell-mesh/helpers';
import {
  detailViewHeadingClass,
  detailViewLabelClass,
  detailViewLinkClass,
  detailViewValueClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';

type Props = {
  entity: IEMCellMesh;
  variant?: DetailViewVariant;
};

function renderFieldValue(
  value: unknown,
  renderer: ((key: string) => string) | typeof renderExternalUrl | null,
  variant: DetailViewVariant
) {
  if (renderer === renderExternalUrl) {
    return renderExternalUrl(value, {
      className: cn(
        'wrap-break-word underline',
        variant === 'onPrimary' ? detailViewLinkClass(variant) : 'text-primary-6'
      ),
    });
  }
  if (renderer) {
    return renderer(value as string);
  }
  return value;
}

export async function ReconstructionMetadata({ entity, variant = 'light' }: Props) {
  const emDenseReconstructionDataset = await getEmDenseReconstructionDataset({
    id: entity.em_dense_reconstruction_dataset.id,
  });
  const resource = { emDenseReconstructionDataset, entity };

  return (
    <div>
      <h2 className={cn('mb-4', detailViewHeadingClass(variant, '2xl'))}>
        Reconstruction metadata
      </h2>
      <div className="grid grid-cols-3 items-center justify-between gap-y-5">
        {ReconstructionMetadataFields.map(({ key, label, path, renderer }) => (
          <div key={key} id={key} className={cn('flex flex-col', detailViewValueClass(variant))}>
            <div className={detailViewLabelClass(variant)}>{label}</div>
            <div className="flex items-center justify-start">
              <div className={cn(variant === 'onPrimary' && 'font-bold')}>
                {renderFieldValue(get(resource, path, EmptyValue), renderer, variant)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
