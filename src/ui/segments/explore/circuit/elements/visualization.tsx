'use client';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { ProgressiveEntityImage } from '@/ui/segments/explore/circuit/elements/use-progressive-img';

type Props = {
  circuit: ICircuit;
};

export function Visualization({ circuit }: Props) {
  const visAsset = getAssetElement({
    assets: circuit.assets,
    filter(i) {
      return i.label === AssetLabel.circuit_visualization;
    },
  });

  return (
    <div className="mt-5">
      <ProgressiveEntityImage
        asset={visAsset}
        entityId={circuit.id}
        alt="hii"
        height={300}
        width="100%"
        maxHeight="auto"
        maxWidth="100%"
        yPadding={16}
        xPadding={16}
        bordered={false}
      />
    </div>
  );
}
