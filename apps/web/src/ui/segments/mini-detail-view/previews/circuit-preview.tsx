import { hasAssets } from '@/api/entitycore/guards';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ProgressiveEntityImage } from '@/ui/segments/explore/circuit/elements/use-progressive-img';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export function CircuitPreview({ record }: { record: ICircuit }) {
  // Only render the circuit image when its asset exists; otherwise show nothing.
  if (!hasAssets(record)) return null;
  const visualizationAsset = getAsset({
    assets: record.assets,
    label: AssetLabel.circuit_visualization,
  }).getOneOrNull();

  if (!visualizationAsset) return null;

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
