import sortBy from 'es-toolkit/compat/sortBy';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import PDFViewer from '@/features/model-analysis/viewer/pdf-viewer';
import { WorkspaceContext } from '@/types/common';

type SummaryJson = Record<
  string,
  {
    traces: string;
    stimuli: string;
    order: number;
  }
>;

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

  const imagesByPath = Object.fromEntries(imageAssets.map((f) => [f.path, f]));

  const summaryAsset = icm.assets.find(
    (a) => a.label === AssetLabel.ion_channel_model_figure_summary_json
  );

  const summary =
    summaryAsset &&
    (await downloadAsset({
      ctx,
      entityType: EntityTypeDict.IonChannelModel,
      entityId: icm.id,
      id: summaryAsset?.id,
      asRawResponse: true,
    }));

  const summaryJson: SummaryJson | undefined = await summary?.json();

  return (
    <>
      {summaryJson && (
        <>
          <div className="text-primary-8 border-neutral-2 mb-5 rounded-full border px-4 py-3 text-xl font-bold">
            Model traces
          </div>
          <div className="flex flex-col gap-2">
            {sortBy(Object.entries(summaryJson), (e) => {
              return e[1].order;
            }).map(([key, value], i) => {
              return (
                <div key={key}>
                  <div className="flex justify-between">
                    <div className="text-primary-8 w-[50px] font-bold uppercase">{key}</div>
                    {i === 0 && (
                      <>
                        <div className="text-neutral-3 w-[400px] text-center text-sm uppercase">
                          Stimulus
                        </div>
                        <div className="text-neutral-3 w-[400px] text-center text-sm uppercase">
                          Response
                        </div>
                      </>
                    )}

                    {i !== 0 && (
                      <>
                        <div className="w-[50px]" />
                        <div className="w-[50px]" />
                      </>
                    )}
                  </div>

                  <div className="mt-5 flex justify-between">
                    <div className="w-[50px]" />
                    <PDFViewer
                      key={imagesByPath[value.stimuli].path}
                      entityType={EntityTypeDict.IonChannelModel}
                      entityId={icm.id}
                      assetId={imagesByPath[value.stimuli].id}
                      showPageCount={false}
                      documentClassName="w-[400px]"
                      pageWidth={400}
                    />
                    <PDFViewer
                      key={imagesByPath[value.traces].path}
                      entityType={EntityTypeDict.IonChannelModel}
                      entityId={icm.id}
                      assetId={imagesByPath[value.traces].id}
                      showPageCount={false}
                      documentClassName="w-[400px]"
                      pageWidth={400}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="text-primary-8 border-neutral-2 mt-5 mb-5 rounded-full border px-4 py-3 text-xl font-bold">
        File preview
      </div>
      <div className="bg-neutral-2 overflow-x-auto overflow-y-auto p-4 font-mono text-sm whitespace-pre text-black shadow-lg">
        {text.trimEnd().trimStart()}
      </div>
    </>
  );
}
