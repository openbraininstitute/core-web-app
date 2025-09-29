import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { WorkspaceContext } from '@/types/common';

export default async function IonChannelModelOverview({
  icm,
  ctx,
}: {
  icm: IonChannelModel;
  ctx: WorkspaceContext;
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
    <div>
      <div className="text-primary-8 mb-5 text-2xl font-bold">File preview</div>
      <div className="bg-neutral-2 overflow-x-auto overflow-y-auto p-4 font-mono text-sm whitespace-pre text-black shadow-lg">
        {text}
      </div>
    </div>
  );
}
