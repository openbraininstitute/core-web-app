import { sortBy } from 'es-toolkit/compat';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { PDFViewer } from '@/features/model-analysis/viewer/asset-viewers/pdf-viewer';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { WorkspaceContext } from '@/types/common';

type SummaryEntry = {
  order: number;
  group: string;
  traces?: string;
  stimuli?: string;
  'steady state'?: string;
  'time constant'?: string;
};

type SummaryJson = Record<string, SummaryEntry>;

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

  const groupedEntries = summaryJson
    ? Object.entries(summaryJson).reduce<Record<string, [string, SummaryEntry][]>>(
        (acc, [key, value]) => {
          const group = value.group ?? 'traces';
          if (!acc[group]) acc[group] = [];
          acc[group].push([key, value]);
          return acc;
        },
        {}
      )
    : undefined;

  if (groupedEntries) {
    for (const group of Object.keys(groupedEntries)) {
      groupedEntries[group] = sortBy(groupedEntries[group], (e) => e[1].order);
    }
  }

  const orderedGroups: [string, [string, SummaryEntry][]][] = groupedEntries
    ? [
        ...(groupedEntries.parameters
          ? [['parameters', groupedEntries.parameters] as [string, [string, SummaryEntry][]]]
          : []),
        ...(groupedEntries.traces
          ? [['traces', groupedEntries.traces] as [string, [string, SummaryEntry][]]]
          : []),
      ]
    : [];

  return (
    <>
      {orderedGroups.map(([groupName, entries]) => (
        <div key={groupName}>
          <div className="text-primary-8 border-neutral-2 mb-5 mt-5 rounded-full border px-4 py-3 text-xl font-bold capitalize">
            Model {groupName}
          </div>

          {groupName === 'traces' && (
            <div className="flex flex-col">
              {/* Header row */}
              <div className="grid grid-cols-[200px_1fr_1fr] gap-4 pb-3">
                <div />
                <div className="text-neutral-3 text-center text-sm uppercase">Stimulus</div>
                <div className="text-neutral-3 text-center text-sm uppercase">Response</div>
              </div>
              {/* Data rows */}
              {entries.map(([key, value]) => {
                const stimuliAsset = value.stimuli ? imagesByPath[value.stimuli] : undefined;
                const tracesAsset = value.traces ? imagesByPath[value.traces] : undefined;

                if (!stimuliAsset && !tracesAsset) return null;

                return (
                  <div key={key}>
                    {/* Title row */}
                    <div className="grid grid-cols-[200px_1fr_1fr] gap-4 pt-4">
                      <div className="text-primary-8 font-bold uppercase">{key}</div>
                      <div />
                      <div />
                    </div>
                    {/* Images row */}
                    <div className="grid grid-cols-[200px_1fr_1fr] gap-4 py-2">
                      <div />
                      <div className="min-w-0">
                        {stimuliAsset && (
                          <PDFViewer
                            key={stimuliAsset.path}
                            entityType={EntityTypeDict.IonChannelModel}
                            entityId={icm.id}
                            assetId={stimuliAsset.id}
                            showPageCount={false}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        {tracesAsset && (
                          <PDFViewer
                            key={tracesAsset.path}
                            entityType={EntityTypeDict.IonChannelModel}
                            entityId={icm.id}
                            assetId={tracesAsset.id}
                            showPageCount={false}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {groupName === 'parameters' && (
            <div className="flex flex-col">
              {/* Header row */}
              <div className="grid grid-cols-[200px_1fr_1fr] gap-4 pb-3">
                <div />
                <div className="text-neutral-3 text-center text-sm uppercase">Steady State</div>
                <div className="text-neutral-3 text-center text-sm uppercase">Time Constant</div>
              </div>
              {/* Data rows */}
              {entries.map(([key, value]) => {
                const steadyStateAsset = value['steady state']
                  ? (imagesByPath[value['steady state']] ??
                    imagesByPath[`${value['steady state']}.pdf`])
                  : undefined;
                const timeConstantAsset = value['time constant']
                  ? (imagesByPath[value['time constant']] ??
                    imagesByPath[`${value['time constant']}.pdf`])
                  : undefined;

                if (!steadyStateAsset && !timeConstantAsset) return null;

                return (
                  <div key={key}>
                    {/* Title row */}
                    <div className="grid grid-cols-[200px_1fr_1fr] gap-4 pt-4">
                      <div className="text-primary-8 font-bold uppercase">{key}</div>
                      <div />
                      <div />
                    </div>
                    {/* Images row */}
                    <div className="grid grid-cols-[200px_1fr_1fr] gap-4 py-2">
                      <div />
                      <div className="min-w-0">
                        {steadyStateAsset && (
                          <PDFViewer
                            key={steadyStateAsset.path}
                            entityType={EntityTypeDict.IonChannelModel}
                            entityId={icm.id}
                            assetId={steadyStateAsset.id}
                            showPageCount={false}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        {timeConstantAsset && (
                          <PDFViewer
                            key={timeConstantAsset.path}
                            entityType={EntityTypeDict.IonChannelModel}
                            entityId={icm.id}
                            assetId={timeConstantAsset.id}
                            showPageCount={false}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="text-primary-8 border-neutral-2 mt-5 mb-5 rounded-full border px-4 py-3 text-xl font-bold">
        File preview
      </div>
      <div className="bg-neutral-2 overflow-x-auto overflow-y-auto p-4 font-mono text-sm whitespace-pre text-black shadow-lg">
        {text.trimEnd().trimStart()}
      </div>
    </>
  );
}
