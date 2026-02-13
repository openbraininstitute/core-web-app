import { Empty } from 'antd';

import { hasAssets } from '@/api/entitycore/guards';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { EmptyPreview } from '@/entity-configuration/definitions/renderer';
import { ProgressiveEntityImage } from '@/ui/segments/explore/circuit/elements/use-progressive-img';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export function CircuitPreview({ record }: { record: ICircuit }) {
  console.log('–– – CircuitPreview – record––', record);
  if (!hasAssets(record)) return EmptyPreview;
  const visualizationAsset = getAssetElement({
    assets: record.assets,
    filter: (a) => a.label === AssetLabel.circuit_visualization,
  });

  if (!visualizationAsset)
    return (
      <Empty
        key="no-asset-empty-thumbnail"
        description="Error loading thumbnail"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="h-full! w-full! select-none [&_.ant-empty-description]:text-white!"
      />
    );

  return (
    <div className="w-full bg-white">
      <ProgressiveEntityImage
        asset={visualizationAsset}
        entityId={record.id}
        alt="hii"
        height={300}
        width="100%"
        maxHeight="auto"
        maxWidth="100%"
        yPadding={16}
        xPadding={16}
        bordered={false}
        clsx={{
          error: {
            text: 'text-center text-primary-9',
          },
          progress: {
            strokeColor: '#fff',
            className: '#fff',
          },
        }}
        optimized={false}
      />
    </div>
  );
}
