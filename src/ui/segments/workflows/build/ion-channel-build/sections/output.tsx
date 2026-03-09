import { LoadingOutlined } from '@ant-design/icons';
import {
  queryOptions,
  experimental_streamedQuery as streamedQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ApiError } from '@/api/error';
import {
  build as buildIonChannel,
  DataType,
  MessageType,
} from '@/api/small-scale-simulator/ion-channel/build';
import { useAppNotification } from '@/components/notification';
import { resolveIonChannelModelingCampaignBuilds } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { message } from '@/i18n/en/ion-channel-build';
import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { Card, CardTitle } from '@/ui/molecules/card';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { getStatusColor } from '@/ui/segments/activity-execution/color-map';
import {
  CONFIGURATION_FORM_STATE_KEY,
  GenerativeFromAtomFamily,
  IonChannelModelingSharedStateFamily,
} from '@/ui/segments/workflows/build/ion-channel-build/helpers';
import { isFormValid } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers/validate-form';
import { FileViewer } from '@/ui/segments/workflows/build/ion-channel-build/sections/file-viewer';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { keyBuilder as workspaceKeyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';
import {
  createAsyncIterableStream,
  createTextStream,
  emptyStream,
  messageGenerator,
} from '@/utils/streamutils';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IIonChannelModelingCampaign } from '@/api/entitycore/types/entities/ion-channel-modeling-campaign';
import type { IIonChannelModelingConfig } from '@/api/entitycore/types/entities/ion-channel-modeling-config';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { TStreamMessage } from '@/api/small-scale-simulator/ion-channel/build';

type IonChannelModelFigureSummaryEntry = {
  order: number;
  group?: string;
  [field: string]: string | number | undefined;
};

type IonChannelModelFigureSummaryJson = Record<string, IonChannelModelFigureSummaryEntry>;

type OutputAssetGroup = 'mod-file' | 'parameters';
type OutputAssetSourceField = 'traces' | 'stimuli' | 'steady state' | 'time constant';

type OutputAssetItem = {
  id: string;
  asset: IAsset;
  entity: IonChannelModel;
  group: OutputAssetGroup;
  name: string;
  extension: string;
  order: number;
  path: string;
  contentType: string;
  sourceKey?: string;
  sourceField?: OutputAssetSourceField;
};

type TraceProtocolGroup = {
  id: string;
  name: string;
  order: number;
  entity: IonChannelModel;
  stimuli: IAsset;
  traces: IAsset;
};

export const OutputListItemKindDict = {
  Asset: 'asset',
  TraceGroup: 'trace-group',
} as const;
export type TOutputListItemKind =
  (typeof OutputListItemKindDict)[keyof typeof OutputListItemKindDict];

type OutputListItem =
  | {
      kind: typeof OutputListItemKindDict.Asset;
      id: string;
      order: number;
      entry: OutputAssetItem;
    }
  | {
      kind: typeof OutputListItemKindDict.TraceGroup;
      id: string;
      order: number;
      entry: TraceProtocolGroup;
    };

export const SelectedPreviewDict = {
  Input: 'input',
  OutputAsset: 'output-asset',
  OutputTraceGroup: 'output-trace-group',
} as const;
export type TSelectedPreviewKind = (typeof SelectedPreviewDict)[keyof typeof SelectedPreviewDict];

type SelectedPreview =
  | {
      kind: typeof SelectedPreviewDict.Input;
      id: string;
      asset: IAsset;
      entity: IIonChannelModelingConfig | undefined;
    }
  | {
      kind: typeof SelectedPreviewDict.OutputAsset;
      id: string;
      asset: IAsset;
      entity: IonChannelModel | undefined;
    }
  | {
      kind: typeof SelectedPreviewDict.OutputTraceGroup;
      id: string;
      protocol: TraceProtocolGroup;
      entity: IonChannelModel | undefined;
    };

export const SummaryKindDict = {
  Parameters: 'parameters',
  traces: 'traces',
} as const;
export type TSummaryKind = (typeof SummaryKindDict)[keyof typeof SummaryKindDict];

type SummaryParameterEntry = {
  kind: typeof SummaryKindDict.Parameters;
  key: string;
  order: number;
  assets: Array<{ field: string; path: string }>;
};

type SummaryTraceEntry = {
  kind: typeof SummaryKindDict.traces;
  key: string;
  order: number;
  assets: Array<{ field: string; path: string }>;
};

type GroupedSummaryEntry = SummaryParameterEntry | SummaryTraceEntry;

type IonChannelBuildingStreamDataMessage = TStreamMessage<{
  campaign?: IIonChannelModelingCampaign;
  execution?: IExecutionActivity;
  config?: IIonChannelModelingConfig;
  model?: IonChannelModel;
}>;

type TBuild = {
  executionId: string;
  status: TActivityStatus;
  config?: IIonChannelModelingConfig;
  entity?: IonChannelModel;
  executionStatus?: string;
};

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

function getFileExtension(asset: IAsset): string {
  const name = getFileName(asset.path);
  const extension = name.split('.').pop()?.trim();

  if (extension && extension !== name) {
    return extension.toUpperCase();
  }

  return asset.content_type.split('/').pop()?.toUpperCase() || 'FILE';
}

function normalizeSummaryKey(key: string): string {
  return key.trim().toLowerCase();
}

function toDisplayLabel(value: string): string {
  if (normalizeSummaryKey(value) === 'ap') return 'AP';

  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function getParameterDisplayName(summaryKey: string, field: string): string {
  const normalizedKey = normalizeSummaryKey(summaryKey);
  const normalizedField = normalizeSummaryKey(field);

  if (normalizedKey === 'activation parameters' && normalizedField === 'steady state') {
    return 'Steady State Activation Parameter';
  }
  if (normalizedKey === 'inactivation parameters' && normalizedField === 'steady state') {
    return 'Steady State Inactivation Parameter';
  }
  if (normalizedKey === 'activation parameters' && normalizedField === 'time constant') {
    return 'Time Constant Activation Parameter';
  }
  if (normalizedKey === 'inactivation parameters' && normalizedField === 'time constant') {
    return 'Time Constant Inactivation Parameter';
  }

  return `${toDisplayLabel(summaryKey)} - ${toDisplayLabel(field)}`;
}

function getParameterDisplayOrder({
  summaryOrder,
  field,
  parameterGroupCount,
  fallbackIndex,
}: {
  summaryOrder: number;
  field: string;
  parameterGroupCount: number;
  fallbackIndex: number;
}): number {
  const normalizedField = normalizeSummaryKey(field);

  if (normalizedField === 'steady state') {
    return 1 + summaryOrder;
  }

  if (normalizedField === 'time constant') {
    return 1 + parameterGroupCount + summaryOrder;
  }

  return 1 + parameterGroupCount * 2 + summaryOrder + fallbackIndex;
}

function getSummaryGroup(entry: IonChannelModelFigureSummaryEntry): TSummaryKind {
  return normalizeSummaryKey(String(entry.group || 'traces')) === SummaryKindDict.Parameters
    ? SummaryKindDict.Parameters
    : SummaryKindDict.traces;
}

function resolveSummaryAsset(assets: Array<IAsset>, rawPath?: string): IAsset | undefined {
  const target = rawPath?.trim();
  if (!target) return undefined;

  const directMatch = assets.find(
    (asset) => asset.path === target || asset.path.endsWith(`/${target}`)
  );
  if (directMatch) return directMatch;

  const targetName = target.split('/').pop()?.toLowerCase();
  if (!targetName) return undefined;

  return assets.find((asset) => getFileName(asset.path).toLowerCase() === targetName);
}

function getSummaryAssets(summaryEntry: IonChannelModelFigureSummaryEntry) {
  return Object.entries(summaryEntry)
    .filter(([field, value]) => field !== 'group' && field !== 'order' && typeof value === 'string')
    .map(([field, value]) => ({ field, path: value as string }));
}

function normalizeGroupedSummaryEntries(summaryData: IonChannelModelFigureSummaryJson | null) {
  if (!summaryData) return [];

  const groupedEntries: Array<GroupedSummaryEntry> = [];

  Object.entries(summaryData).forEach(([key, value]) => {
    const assets = getSummaryAssets(value);
    if (assets.length === 0) return;

    const order = typeof value.order === 'number' ? value.order : 0;
    const group = getSummaryGroup(value);

    if (group === SummaryKindDict.Parameters) {
      groupedEntries.push({
        kind: SummaryKindDict.Parameters,
        key,
        order,
        assets,
      });
      return;
    }

    groupedEntries.push({
      kind: SummaryKindDict.traces,
      key,
      order,
      assets,
    });
  });

  return groupedEntries.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === SummaryKindDict.Parameters ? -1 : 1;
    }
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    return left.key.localeCompare(right.key);
  });
}

function toSelectedOutputPreview(item: OutputListItem): SelectedPreview {
  if (item.kind === 'trace-group') {
    return {
      kind: SelectedPreviewDict.OutputTraceGroup,
      id: item.id,
      protocol: item.entry,
      entity: item.entry.entity,
    };
  }

  return {
    kind: SelectedPreviewDict.OutputAsset,
    id: item.id,
    asset: item.entry.asset,
    entity: item.entry.entity,
  };
}

export function Output({
  sessionId,
  readonly,
  campaignId,
}: {
  sessionId: string | null;
  readonly?: boolean;
  campaignId?: string;
}) {
  const queryClient = useQueryClient();
  const context = useWorkspace();
  const notification = useAppNotification();
  const safeSessionId = sessionId || '';
  const [ionState, updateIonState] = useAtom(
    useMemo(() => IonChannelModelingSharedStateFamily(safeSessionId), [safeSessionId])
  );
  const [payload] = useAtom(
    useMemo(
      () => GenerativeFromAtomFamily(`${CONFIGURATION_FORM_STATE_KEY}/${safeSessionId}`),
      [safeSessionId]
    )
  );

  const [selectedBuildIndex, setSelectedBuildIndex] = useState<number | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<SelectedPreview | null>(null);

  // readonly mode: fetch existing builds from EntityCore
  const {
    data: readonlyBuildsData,
    isFetching: readonlyFetching,
    isLoading: readonlyLoading,
  } = useQuery({
    queryKey: ['campaign-builds-readonly', campaignId, context],
    queryFn: () =>
      resolveIonChannelModelingCampaignBuilds({
        // biome-ignore lint/style/noNonNullAssertion: this request only start if original campaign is present
        id: campaignId!,
        context,
      }),
    enabled: !!readonly && !!campaignId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // build mode: stream build output
  const {
    data: streamData,
    isFetching: streamFetching,
    isLoading: streamLoading,
  } = useQuery(
    queryOptions({
      queryKey: ['build-output-stream', { context, sessionId, payload }],
      queryFn: streamedQuery({
        queryFn: async () => {
          try {
            const response = await buildIonChannel({ ctx: context, payload, stream: true });
            const stream = await createTextStream(response);
            if (!stream) return emptyStream();

            queryClient.invalidateQueries({ queryKey: workspaceKeyBuilder.wallet(context) });

            return messageGenerator(createAsyncIterableStream<string>(stream));
          } catch (error) {
            const errorMsg =
              error instanceof ApiError &&
              error.cause?.code === 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR'
                ? message.LowFunds
                : message.GenericFailed;

            notification.error({ message: errorMsg, duration: null });

            throw error;
          }
        },
        refetchMode: 'append',
      }),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      enabled:
        !readonly &&
        ionState.buildRequested &&
        ionState.schema &&
        payload &&
        isFormValid({ data: payload, schema: ionState.schema }),
    })
  );

  // extract campaign id from stream and store in shared state
  useEffect(() => {
    if (readonly || !streamData || !Array.isArray(streamData)) return;
    const messages = streamData as Array<IonChannelBuildingStreamDataMessage>;
    const firstBuildInput = messages.find(
      (m) => m.message_type === MessageType.DATA && m.data_type === DataType.BuildInput
    ) as
      | (IonChannelBuildingStreamDataMessage & { data: { campaign?: { id?: string } } })
      | undefined;
    const streamCampaignId = firstBuildInput?.data?.campaign?.id;
    if (streamCampaignId && streamCampaignId !== ionState.campaignId) {
      updateIonState({ ...ionState, campaignId: streamCampaignId });
    }
  }, [streamData, readonly, ionState, updateIonState]);

  const isFetching = readonly ? readonlyFetching : streamFetching;
  const isLoading = readonly ? readonlyLoading : streamLoading;

  const builds: TBuild[] = useMemo(() => {
    if (readonly) {
      return readonlyBuildsData?.builds ?? [];
    }

    if (!streamData || !Array.isArray(streamData)) return [];

    const messages = streamData as Array<IonChannelBuildingStreamDataMessage>;
    const buildsMap = new Map<string, TBuild>();

    messages.forEach((message) => {
      if (message.message_type === MessageType.DATA) {
        if (
          message.data_type === DataType.BuildInput &&
          message.data?.execution &&
          message.data?.config
        ) {
          const { execution, config } = message.data;
          buildsMap.set(execution.id, {
            executionId: execution.id,
            status: execution.status,
            executionStatus: execution.status,
            config,
          });
        } else if (
          message.data_type === DataType.BuildOutput &&
          message.data?.model &&
          message.data?.execution
        ) {
          const executionId = message.data.execution.id;
          const buildToUpdate = buildsMap.get(executionId);

          if (buildToUpdate) {
            buildsMap.set(executionId, {
              ...buildToUpdate,
              entity: message.data.model,
              executionStatus: message.data.execution.status,
            });
          }
        }
      }
      buildsMap.forEach((build, key) => {
        buildsMap.set(key, {
          ...build,
          status: 'status' in message ? message.status : build.status,
          executionStatus: build.executionStatus,
        });
      });
    });

    return Array.from(buildsMap.values());
  }, [readonly, readonlyBuildsData, streamData]);

  const selectedBuild = selectedBuildIndex !== null ? builds[selectedBuildIndex] : null;

  useEffect(() => {
    if (builds.length > 0 && selectedBuildIndex === null) {
      setSelectedBuildIndex(0);
    }
  }, [builds.length, selectedBuildIndex]);

  const currentStatus = useMemo(() => {
    if (readonly) return null;
    if (!streamData || !Array.isArray(streamData)) return null;

    const messages = streamData as Array<IonChannelBuildingStreamDataMessage>;
    const statusMessages = messages.filter((m) => m.message_type === MessageType.STATUS);
    const lastStatus = statusMessages[statusMessages.length - 1];

    return 'status' in lastStatus ? lastStatus?.status : null;
  }, [readonly, streamData]);

  const isBuilding =
    currentStatus === ActivityStatus.RUNNING || currentStatus === ActivityStatus.PENDING;
  const hasBuilds = builds.length > 0;
  const hasOutputForSelectedBuild = selectedBuild?.entity !== undefined;

  const summaryAsset = selectedBuild?.entity?.assets?.find(
    (asset) => asset.label === AssetLabel.ion_channel_model_figure_summary_json
  );

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({
      entityId: selectedBuild?.entity?.id || '',
      assetId: summaryAsset?.id || '',
      ...context,
    }),
    queryFn: async () => {
      if (
        !selectedBuild?.entity ||
        !summaryAsset ||
        !selectedBuild.entity.id ||
        !selectedBuild.entity.type ||
        !context.virtualLabId ||
        !context.projectId
      ) {
        return null;
      }

      const presignedData = await getEntityCorePresignedUrl({
        entityType: selectedBuild.entity.type as TEntityTypeDict,
        entityId: selectedBuild.entity.id,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: summaryAsset.id,
      });

      const response = await fetch(presignedData.url);
      const json: IonChannelModelFigureSummaryJson = await response.json();
      return json;
    },
    enabled:
      !!selectedBuild?.entity && !!summaryAsset && !!context.virtualLabId && !!context.projectId,
    staleTime: Infinity,
  });

  const outputListItems = useMemo(() => {
    if (!selectedBuild?.entity) return [];

    const modelEntity = selectedBuild.entity;
    const modelAssets = modelEntity.assets || [];
    let modOutputAsset: OutputAssetItem | null = null;
    const parameterAssets: Array<OutputAssetItem> = [];
    const traceProtocols: Array<TraceProtocolGroup> = [];

    const modFile = modelAssets.find((asset) => asset.label === AssetLabel.neuron_mechanisms);
    if (modFile) {
      modOutputAsset = {
        id: modFile.id,
        asset: modFile,
        entity: modelEntity,
        group: 'mod-file',
        name: getFileName(modFile.path),
        extension: getFileExtension(modFile),
        order: 0,
        path: modFile.path,
        contentType: modFile.content_type,
      };
    }

    const groupedSummaryEntries = normalizeGroupedSummaryEntries(summaryData || null);
    const parameterGroupCount = groupedSummaryEntries.filter(
      (summaryEntry) => summaryEntry.kind === 'parameters'
    ).length;

    groupedSummaryEntries.forEach((summaryEntry) => {
      if (summaryEntry.kind === 'parameters') {
        summaryEntry.assets.forEach((entryAsset, assetIndex) => {
          const resolvedAsset = resolveSummaryAsset(modelAssets, entryAsset.path);
          if (!resolvedAsset) return;

          parameterAssets.push({
            id: resolvedAsset.id,
            asset: resolvedAsset,
            entity: modelEntity,
            group: 'parameters',
            name: getParameterDisplayName(summaryEntry.key, entryAsset.field),
            extension: getFileExtension(resolvedAsset),
            order: getParameterDisplayOrder({
              summaryOrder: summaryEntry.order,
              field: entryAsset.field,
              parameterGroupCount,
              fallbackIndex: assetIndex,
            }),
            path: resolvedAsset.path,
            contentType: resolvedAsset.content_type,
            sourceKey: summaryEntry.key,
            sourceField:
              entryAsset.field === 'steady state' || entryAsset.field === 'time constant'
                ? entryAsset.field
                : undefined,
          });
        });
        return;
      }

      const stimuliPath = summaryEntry.assets.find(
        (entryAsset) => normalizeSummaryKey(entryAsset.field) === 'stimuli'
      )?.path;
      const tracesPath = summaryEntry.assets.find(
        (entryAsset) => normalizeSummaryKey(entryAsset.field) === 'traces'
      )?.path;

      const stimuliAsset = resolveSummaryAsset(modelAssets, stimuliPath);
      const tracesAsset = resolveSummaryAsset(modelAssets, tracesPath);

      if (!stimuliAsset || !tracesAsset) return;

      traceProtocols.push({
        id: `trace-${summaryEntry.key}-${summaryEntry.order}`,
        name: `${toDisplayLabel(summaryEntry.key)} protocol`,
        order: summaryEntry.order,
        entity: modelEntity,
        stimuli: stimuliAsset,
        traces: tracesAsset,
      });
    });

    const items: Array<OutputListItem> = [];

    if (modOutputAsset) {
      items.push({
        kind: 'asset',
        id: modOutputAsset.id,
        order: modOutputAsset.order,
        entry: modOutputAsset,
      });
    }

    parameterAssets
      .sort((left, right) => {
        if (left.order !== right.order) return left.order - right.order;
        return left.name.localeCompare(right.name);
      })
      .forEach((parameterAsset) => {
        items.push({
          kind: 'asset',
          id: parameterAsset.id,
          order: parameterAsset.order,
          entry: parameterAsset,
        });
      });

    const lastParameterOrder =
      parameterAssets.length > 0
        ? Math.max(...parameterAssets.map((parameterAsset) => parameterAsset.order))
        : 0;

    traceProtocols
      .sort((left, right) => {
        if (left.order !== right.order) return left.order - right.order;
        return left.name.localeCompare(right.name);
      })
      .forEach((traceProtocol) => {
        const traceDisplayOrder = lastParameterOrder + 1 + traceProtocol.order;

        items.push({
          kind: 'trace-group',
          id: traceProtocol.id,
          order: traceDisplayOrder,
          entry: traceProtocol,
        });
      });

    return items.sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;

      const leftName = left.kind === 'asset' ? left.entry.name : left.entry.name;
      const rightName = right.kind === 'asset' ? right.entry.name : right.entry.name;
      return leftName.localeCompare(rightName);
    });
  }, [selectedBuild?.entity, summaryData]);

  useEffect(() => {
    if (!selectedBuild?.entity) return;

    if (!selectedPreview) {
      if (outputListItems.length > 0) {
        setSelectedPreview(toSelectedOutputPreview(outputListItems[0]));
      }
      return;
    }

    if (selectedPreview.kind === 'input') return;

    const selectedOutputStillExists = outputListItems.some((item) => {
      if (item.kind === 'asset' && selectedPreview.kind === SelectedPreviewDict.OutputAsset) {
        return item.id === selectedPreview.id;
      }

      if (
        item.kind === 'trace-group' &&
        selectedPreview.kind === SelectedPreviewDict.OutputTraceGroup
      ) {
        return item.id === selectedPreview.id;
      }

      return false;
    });

    if (!selectedOutputStillExists) {
      if (outputListItems.length > 0) {
        setSelectedPreview(toSelectedOutputPreview(outputListItems[0]));
      } else {
        setSelectedPreview(null);
      }
    }
  }, [selectedPreview, selectedBuild?.entity, outputListItems]);

  const isOutputLoading =
    (isBuilding && !hasOutputForSelectedBuild) || (loadingSummary && outputListItems.length === 0);

  return (
    <div
      className={cn('grid w-full grid-cols-[20rem_25rem_1fr] gap-8', {
        'h-[calc(100vh-13rem)]': readonly,
        'h-[calc(100vh-11rem)]': !readonly,
      })}
    >
      <div className="bg-background flex shrink-0 flex-col gap-3 overflow-y-auto">
        {(isLoading || isFetching) && !hasBuilds ? (
          <Card key="build-0" className="p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </Card>
        ) : (
          builds.map((build, index) => {
            const statusColor = getStatusColor(build.status as ActivityStatus);
            const isSelected = selectedBuildIndex === index;

            return (
              <Card
                key={build.executionId}
                className={cn('cursor-pointer select-none p-4 transition-all', {
                  'border-2': isSelected,
                })}
                style={{
                  borderColor: isSelected ? statusColor : undefined,
                  backgroundColor: `${statusColor}15`,
                }}
                onClick={() => {
                  setSelectedBuildIndex(index);
                  setSelectedPreview(null);
                }}
                aria-checked={isSelected}
              >
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="text-primary-9 font-bold">Build {index}</div>
                  <div className="flex items-center gap-2">
                    {(build.status === ActivityStatus.RUNNING ||
                      build.status === ActivityStatus.PENDING) && (
                      <LoadingOutlined
                        spin
                        className="text-lg"
                        style={{
                          color: statusColor,
                        }}
                      />
                    )}
                    <Badge
                      rounded
                      className="px-4"
                      style={{
                        backgroundColor: statusColor,
                        color: '#fff',
                      }}
                    >
                      {build.status || build.executionStatus}
                    </Badge>
                  </div>
                </CardTitle>
              </Card>
            );
          })
        )}
      </div>

      <div className="bg-background secondary-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pr-3 mb-5">
        {!selectedBuild || !hasBuilds ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-2/5 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
            <Skeleton className="h-4 w-2/5 rounded-full" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 8 })
                .fill('')
                .map((_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton map
                  <Skeleton key={index} className="h-12 w-full rounded-full" />
                ))}
            </div>
          </div>
        ) : (
          <>
            {(selectedBuild.config?.assets?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-label mb-3 text-lg font-semibold">Inputs</h3>
                <div className="flex flex-col gap-2">
                  {selectedBuild.config?.assets?.map((asset) => {
                    const fileName = getFileName(asset.path);
                    const extension = getFileExtension(asset);
                    const isActive =
                      selectedPreview?.kind === SelectedPreviewDict.Input &&
                      selectedPreview.id === asset.id;

                    return (
                      <Tooltip key={asset.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActive ? 'shadow' : 'outline'}
                            rounded
                            size="lg"
                            active={isActive}
                            onClick={() =>
                              setSelectedPreview({
                                kind: 'input',
                                id: asset.id,
                                asset,
                                entity: selectedBuild.config,
                              })
                            }
                            className={cn('w-full justify-between gap-2', {
                              'shadow-[8px_12px_24px_0px_#0000000F,-16px_-16px_20px_0px_#FFFFFFD1]!':
                                isActive,
                            })}
                          >
                            <span className="truncate">{fileName}</span>
                            <Badge rounded className="shrink-0">
                              {extension}
                            </Badge>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          sideOffset={5}
                          className="text-white max-w-2xs bg-primary-8 text-base shadow-lg"
                          arrowClassName="bg-primary-8"
                        >
                          {fileName}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-label mb-3 text-lg font-semibold">Outputs</h3>
              {isOutputLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 8 })
                    .fill('')
                    .map((_, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton map
                      <Skeleton key={index} className="h-12 w-full rounded-full" />
                    ))}
                </div>
              ) : selectedBuild.entity ? (
                <div className="flex flex-col gap-2">
                  {outputListItems.map((outputItem) => {
                    if (outputItem.kind === 'trace-group') {
                      const tracesExt = getFileExtension(outputItem.entry.traces);
                      const stimuliExt = getFileExtension(outputItem.entry.stimuli);
                      const showBothBadges =
                        tracesExt &&
                        stimuliExt &&
                        tracesExt.toUpperCase() !== stimuliExt.toUpperCase();
                      const isActive =
                        selectedPreview?.kind === SelectedPreviewDict.OutputTraceGroup &&
                        selectedPreview.id === outputItem.id;

                      return (
                        <Tooltip key={outputItem.id}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isActive ? 'shadow' : 'outline'}
                              rounded
                              size="lg"
                              active={isActive}
                              onClick={() =>
                                setSelectedPreview(toSelectedOutputPreview(outputItem))
                              }
                              className={cn('w-full justify-between gap-2', {
                                'shadow-[8px_12px_24px_0px_#0000000F,-16px_-16px_20px_0px_#FFFFFFD1]!':
                                  isActive,
                              })}
                            >
                              <span className="truncate">{outputItem.entry.name}</span>
                              <div className="flex shrink-0 gap-1">
                                <Badge rounded>{stimuliExt}</Badge>
                                {showBothBadges && <Badge rounded>{tracesExt}</Badge>}
                              </div>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={5}
                            className="text-white max-w-2xs bg-primary-8 text-base shadow-lg"
                            arrowClassName="bg-primary-8"
                          >
                            {outputItem.entry.name}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    const isActive =
                      selectedPreview?.kind === SelectedPreviewDict.OutputAsset &&
                      selectedPreview.id === outputItem.id;

                    return (
                      <Tooltip key={outputItem.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActive ? 'shadow' : 'outline'}
                            rounded
                            size="lg"
                            active={isActive}
                            onClick={() => setSelectedPreview(toSelectedOutputPreview(outputItem))}
                            className={cn('w-full justify-between gap-2', {
                              'shadow-[8px_12px_24px_0px_#0000000F,-16px_-16px_20px_0px_#FFFFFFD1]!':
                                isActive,
                            })}
                          >
                            <span className="truncate">{outputItem.entry.name}</span>
                            <Badge rounded className="shrink-0">
                              {outputItem.entry.extension}
                            </Badge>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          avoidCollisions
                          side="top"
                          sideOffset={5}
                          className="text-white max-w-2xs bg-primary-8 text-base shadow-lg"
                          arrowClassName="bg-primary-8"
                        >
                          {outputItem.entry.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}

                  {outputListItems.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-400">No output files yet</div>
                  )}
                </div>
              ) : readonly ? (
                <Skeleton />
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">No output files yet</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-background flex flex-1 flex-col overflow-auto px-2 pb-2 max-h-[calc(100%-.5rem)]">
        {selectedPreview?.kind === 'input' ||
        selectedPreview?.kind === SelectedPreviewDict.OutputAsset ? (
          <FileViewer
            asset={selectedPreview.asset}
            entity={selectedPreview.entity}
            context={context}
          />
        ) : selectedPreview?.kind === SelectedPreviewDict.OutputTraceGroup ? (
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <FileViewer
                asset={selectedPreview.protocol.stimuli}
                entity={selectedPreview.entity}
                context={context}
              />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <FileViewer
                asset={selectedPreview.protocol.traces}
                entity={selectedPreview.entity}
                context={context}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            {selectedBuild ? 'Select a file to preview' : 'No output file selected'}
          </div>
        )}
      </div>
    </div>
  );
}
