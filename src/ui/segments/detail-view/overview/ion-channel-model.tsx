import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import PDFViewer from '@/features/model-analysis/viewer/pdf-viewer';
import { WorkspaceContext } from '@/types/common';
import { capitalize } from 'lodash';

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

  const imageAssets = icm.assets.filter((a) => a.label === AssetLabel.ion_channel_model_figure);

  console.log(imageAssets);

  return (
    <div>
      <div className="text-primary-8 mb-5 text-2xl font-bold">File preview</div>
      <div className="bg-neutral-2 overflow-x-auto overflow-y-auto p-4 font-mono text-sm whitespace-pre text-black shadow-lg">
        {text}
      </div>

      {imageAssets.length > 0 && (
        <div className="gap- grid grid-cols-2">
          {imageAssets.map((i) => {
            return (
              <div key={i.full_path}>
                <div>{formatFilename(i.path)}</div>
                <PDFViewer
                  key={i.path}
                  entityType={EntityTypeDict.IonChannelModel}
                  entityId={icm.id}
                  assetId={i.id}
                  showPageCount={false}
                  documentClassName="w-[300px]"
                  pageWidth={300}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* <PDFViewer
        entityType={EntityTypeDict.IonChannelModel}
        entityId={icm.id}
        assetId={imageAssets.id}
        showPageCount={false}
      /> */}
    </div>
  );
}

function formatFilename(filename: string): string {
  const parts = filename.split('.');
  parts.pop();
  const base = parts.join('.');
  const withSpaces = base.split('_').join(' ');

  return capitalize(withSpaces);
}
