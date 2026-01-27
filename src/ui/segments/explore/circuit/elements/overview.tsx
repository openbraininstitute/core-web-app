'use client';

import toPairs from 'es-toolkit/compat/toPairs';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { Header } from '@/ui/segments/explore/circuit/elements/section-header';
import { ProgressiveEntityImage } from '@/ui/segments/explore/circuit/elements/use-progressive-img';

type Props = {
  circuit: ICircuit;
};

export default function Overview({ circuit }: Props) {
  const cellProperties = getAssetElement({
    assets: circuit.assets,
    filter(i) {
      return i.label === AssetLabel.node_stats;
    },
  });

  const networkPropertiesA = getAssetElement({
    assets: circuit.assets,
    filter(i) {
      return i.label === AssetLabel.network_stats_a;
    },
  });

  const networkPropertiesB = getAssetElement({
    assets: circuit.assets,
    filter(i) {
      return i.label === AssetLabel.network_stats_b;
    },
  });

  const list = {
    cell: { title: 'Cell statistics', items: [cellProperties] },
    network: { title: 'Network statistics', items: [networkPropertiesA, networkPropertiesB] },
  };

  return (
    <div className="mt-5">
      <div className="flex w-full flex-col items-center gap-2.5">
        {toPairs(list).map(([key, { items, title }]) => {
          return (
            <div key={key} className="flex w-full flex-col gap-2">
              <Header title={title} />
              <div className="flex w-full flex-col items-center gap-2">
                {items.map((asset, index) => (
                  <ProgressiveEntityImage
                    key={`${key}-${asset?.id || index}`}
                    bordered={false}
                    asset={asset}
                    entityId={circuit.id}
                    alt={asset?.path ?? ''}
                    height={300}
                    width="100%"
                    maxHeight="auto"
                    maxWidth="100%"
                    yPadding={16}
                    xPadding={40}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
