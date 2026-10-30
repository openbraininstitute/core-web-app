import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { type TViewVariant, ViewVariant } from '@/constants';
import { CodeBlock } from '@/ui/molecules/code-blocks';
import {
  detailViewInsetPanelClass,
  detailViewSectionHeadingClass,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { WorkspaceContext } from '@/types/common';

export default async function EModelOverview({
  emodel,
  ctx,
  variant = ViewVariant.Default,
}: {
  emodel: IEModel;
  ctx: WorkspaceContext;
  variant?: TViewVariant;
}) {
  const asset = emodel.assets.filter((a) => a.label === AssetLabel.neuron_hoc)[0];
  if (!asset) return null;

  const file: ArrayBuffer = await downloadAsset({
    ctx,
    entityType: EntityTypeDict.Emodel,
    entityId: emodel.id,
    id: asset.id,
  });
  if (!file) return null;

  const text = new TextDecoder().decode(file);

  return (
    <div>
      <div className={detailViewSectionHeadingClass(variant)}>File Preview: NEURON hoc</div>
      <div
        className={cn(
          'overflow-x-auto secondary-scrollbar overflow-y-auto font-mono text-sm whitespace-pre shadow-lg',
          variant === ViewVariant.Default
            ? cn(detailViewInsetPanelClass(variant), 'text-white')
            : 'bg-neutral-2 text-black'
        )}
      >
        {/* shiki has no "hoc" grammar; "c" is the closest bundled language and is what
            the EXTRA_LANGUAGES map (code-blocks/index.tsx) resolves "hoc" to anyway. */}
        <CodeBlock code={text.trimEnd().trimStart()} language="c" showLineNumbers scrollableX />
      </div>
    </div>
  );
}
