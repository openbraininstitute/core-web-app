import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { type TViewVariant, ViewVariant } from '@/constants';
import { CodeBlock } from '@/ui/molecules/code-blocks';
import {
  detailViewHeadingClass,
  detailViewInsetPanelClass,
  detailViewPanelBorderClass,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { WorkspaceContext } from '@/types/common';

function sectionHeadingClass(variant: TViewVariant) {
  return cn(
    'mb-5 mt-5 rounded-full border px-4 py-3 text-xl font-bold capitalize',
    detailViewHeadingClass(variant, 'xl'),
    detailViewPanelBorderClass(variant)
  );
}

export default async function IonChannelModelOverview({
  icm,
  ctx,
  variant = ViewVariant.Default,
}: {
  icm: IonChannelModel;
  ctx: WorkspaceContext;
  variant?: TViewVariant;
}) {
  const asset = icm.assets.filter((a) => a.label === AssetLabel.neuron_mechanisms)[0];
  if (!asset) return null;
  const file: ArrayBuffer = await downloadAsset({
    ctx,
    entityType: EntityTypeDict.IonChannelModel,
    entityId: icm.id,
    id: asset.id,
  });

  if (!file) return null;
  const decoder = new TextDecoder();
  const text = decoder.decode(file);

  return (
    <>
      <div className={sectionHeadingClass(variant)}>File preview</div>
      <div
        className={cn(
          'overflow-x-auto secondary-scrollbar overflow-y-auto font-mono text-sm whitespace-pre shadow-lg',
          variant === ViewVariant.Default
            ? cn(detailViewInsetPanelClass(variant), 'text-white')
            : 'bg-neutral-2 text-black'
        )}
      >
        <CodeBlock code={text.trimEnd().trimStart()} language="shell" showLineNumbers scrollableX />
      </div>
    </>
  );
}
