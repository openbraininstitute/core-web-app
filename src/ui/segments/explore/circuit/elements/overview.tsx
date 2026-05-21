'use client';

import toPairs from 'es-toolkit/compat/toPairs';

import { ProgressiveEntityImage } from '@/ui/segments/explore/circuit/elements/use-progressive-img';
import { Header } from '@/ui/segments/explore/circuit/elements/section-header';
import { detailViewInsetPanelClass, type DetailViewVariant } from '@/ui/segments/detail-view/variant-styles';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { cn } from '@/utils/css-class';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

type Props = {
  circuit: ICircuit;
  variant?: DetailViewVariant;
};

export default function Overview({ circuit, variant = 'light' }: Props) {
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
              <Header title={title} variant={variant} />
              <div
                className={cn(
                  'flex w-full flex-col items-center gap-2',
                  variant === 'onPrimary' && detailViewInsetPanelClass(variant)
                )}
              >
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
                    variant={variant}
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
