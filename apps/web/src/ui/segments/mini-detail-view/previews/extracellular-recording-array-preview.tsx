import { Image } from 'antd';

import { hasAssets } from '@/api/entitycore/guards';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { renderPreview } from '@/entity-configuration/definitions/renderer';

import type { ISimulatableExtracellularRecordingArray } from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';

type Props = {
  record: ISimulatableExtracellularRecordingArray;
};

export function ExtracellularRecordingArrayPreview({ record }: Props) {
  if (!hasAssets(record)) return null;

  const imageAsset = getAsset({
    assets: record.assets,
    label: AssetLabel.electrode_array_image,
  }).getOneOrNull();

  if (!imageAsset) return null;

  return (
    <div className="flex w-full items-center justify-center rounded-md bg-white">
      {renderPreview(
        record as unknown as EntityCoreResource,
        undefined,
        undefined,
        'rounded-md h-full relative w-full!',
        'w-full! h-[200px]! flex!',
        true,
        (src) => (
          <Image
            alt={`${record.name} preview`}
            src={src}
            rootClassName="w-full h-80"
            className="max-h-full w-full rounded-md object-contain"
          />
        ),
        'assetLabel',
        AssetLabel.electrode_array_image
      )}
    </div>
  );
}
