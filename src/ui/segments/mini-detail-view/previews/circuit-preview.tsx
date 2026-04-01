import { Empty } from 'antd';

import { hasAssets } from '@/api/entitycore/guards';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { EmptyPreview } from '@/entity-configuration/definitions/renderer';
import { ProgressiveEntityImage } from '@/ui/segments/explore/circuit/elements/use-progressive-img';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export function CircuitPreview({ record }: { record: ICircuit }) {
  if (!hasAssets(record)) return EmptyPreview;
  const visualizationAsset = getAsset({
    assets: record.assets,
    label: AssetLabel.circuit_visualization,
  }).getOneOrNull();

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
        key={visualizationAsset.id}
        asset={visualizationAsset}
        entityId={record.id}
        alt={record.name}
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
