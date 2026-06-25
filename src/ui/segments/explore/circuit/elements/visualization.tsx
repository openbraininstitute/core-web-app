'use client';

import { kebabCase } from 'es-toolkit/compat';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { ProgressiveEntityImage } from '@/ui/segments/explore/circuit/elements/use-progressive-img';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

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
    <div
      id={`visualization-${kebabCase(circuit.type)}-${circuit.id}`}
      data-testid="visualization"
      className="mt-5"
    >
      <ProgressiveEntityImage
        asset={visAsset}
        entityId={circuit.id}
        alt="circuit visualization"
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
