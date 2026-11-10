'use client';

import toPairs from 'es-toolkit/compat/toPairs';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { type TViewVariant, ViewVariant } from '@/constants';
import {
  detailViewInsetPanelClass,
  detailViewTabbedEmptyClass,
} from '@/ui/segments/detail-view/variant-styles';
import { Header } from '@/ui/segments/explore/circuit/elements/section-header';
import { ProgressiveEntityImage } from '@/ui/segments/explore/circuit/elements/use-progressive-img';
import { cn } from '@/utils/css-class';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IAsset } from '@/api/entitycore/types/shared/global';

type Props = {
  circuit: ICircuit;
  variant?: TViewVariant;
};

export default function Overview({ circuit, variant = ViewVariant.Light }: Props) {
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

  const present = (asset?: IAsset): asset is IAsset => Boolean(asset);

  const list = {
    cell: { title: 'Cell statistics', items: [cellProperties].filter(present) },
    network: {
      title: 'Network statistics',
      items: [networkPropertiesA, networkPropertiesB].filter(present),
    },
  };

  return (
    <div className="mt-5">
      <div className="flex w-full flex-col items-center gap-2.5">
        {toPairs(list).map(([key, { items, title }]) => {
          return (
            <div key={key} className="flex w-full flex-col gap-2">
              <Header title={title} variant={variant} />
              <div
                id={`${key}-overview`}
                data-testid={`${key}-overview`}
                className={cn(
                  'flex w-full flex-col items-center gap-2',
                  variant === ViewVariant.Default && detailViewInsetPanelClass(variant),
                  items.length > 0 && 'rounded-lg bg-white'
                )}
              >
                {items.length === 0 ? (
                  <div className={cn(detailViewTabbedEmptyClass(variant), 'min-h-32 text-sm')}>
                    Not available
                  </div>
                ) : (
                  items.map((asset, index) => (
                    <ProgressiveEntityImage
                      key={`${key}-${asset.id || index}`}
                      bordered={false}
                      asset={asset}
                      entityId={circuit.id}
                      alt={asset.path ?? ''}
                      height={300}
                      width="100%"
                      maxHeight="auto"
                      maxWidth="100%"
                      yPadding={16}
                      xPadding={40}
                      variant={variant}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
