/* eslint-disable no-nested-ternary */

import { LoadingOutlined } from '@ant-design/icons';
import {
  queryOptions,
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import ApiError from '@/api/error';
import {
  build as buildIonChannel,
  DataType,
  MessageType,
} from '@/api/small-scale-simulator/ion-channel/build';
import { useAppNotification } from '@/components/notification';
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
import type {
  IonChannelModelingCampaign,
  IonChannelModelingConfig,
} from '@/api/entitycore/types/entities/ion-channel-modeling-campaign';
import type { EntityCoreResource, IAsset } from '@/api/entitycore/types/shared/global';
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
  entity: Partial<EntityCoreResource>;
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
  entity: Partial<EntityCoreResource>;
  stimuli: IAsset;
  traces: IAsset;
};

type OutputListItem =
  | {
      kind: 'asset';
      id: string;
      order: number;
      entry: OutputAssetItem;
    }
  | {
      kind: 'trace-group';
      id: string;
      order: number;
      entry: TraceProtocolGroup;
    };

type SelectedPreview =
  | {
      kind: 'input';
      id: string;
      asset: IAsset;
      entity: Partial<EntityCoreResource>;
    }
  | {
      kind: 'output-asset';
      id: string;
      asset: IAsset;
      entity: Partial<EntityCoreResource>;
    }
  | {
      kind: 'output-trace-group';
      id: string;
      protocol: TraceProtocolGroup;
      entity: Partial<EntityCoreResource>;
    };

type SummaryParameterEntry = {
  kind: 'parameters';
  key: string;
  order: number;
  assets: Array<{ field: string; path: string }>;
};

type SummaryTraceEntry = {
  kind: 'traces';
  key: string;
  order: number;
  assets: Array<{ field: string; path: string }>;
};

type GroupedSummaryEntry = SummaryParameterEntry | SummaryTraceEntry;

type IonChannelBuildingStreamDataMessage = TStreamMessage<{
  campaign?: IonChannelModelingCampaign;
  execution?: IExecutionActivity;
  config?: IonChannelModelingConfig;
  model?: IonChannelModel;
}>;

type Build = {
  executionId: string;
  status: TActivityStatus;
  configEntity: Partial<EntityCoreResource>;
  modelEntity?: Partial<EntityCoreResource>;
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

function getSummaryGroup(entry: IonChannelModelFigureSummaryEntry): 'parameters' | 'traces' {
  return normalizeSummaryKey(String(entry.group || 'traces')) === 'parameters'
    ? 'parameters'
    : 'traces';
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

    if (group === 'parameters') {
      groupedEntries.push({
        kind: 'parameters',
        key,
        order,
        assets,
      });
      return;
    }

    groupedEntries.push({
      kind: 'traces',
      key,
      order,
      assets,
    });
  });

  return groupedEntries.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'parameters' ? -1 : 1;
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
      kind: 'output-trace-group',
      id: item.id,
      protocol: item.entry,
      entity: item.entry.entity,
    };
  }

  return {
    kind: 'output-asset',
    id: item.id,
    asset: item.entry.asset,
    entity: item.entry.entity,
  };
}

export function Output({ sessionId }: { sessionId: string | null }) {
  const context = useWorkspace();
  const notification = useAppNotification();
  const safeSessionId = sessionId || '';
  const [ionState] = useAtom(
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

  const { data, isFetching, isLoading } = useQuery(
    queryOptions({
      queryKey: ['build-output-stream', { context, sessionId, payload }],
      queryFn: streamedQuery({
        queryFn: async () => {
          try {
            const response = await buildIonChannel({ ctx: context, payload, stream: true });
            const stream = await createTextStream(response);
            if (!stream) return emptyStream();
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
        ionState.schema && payload && isFormValid({ data: payload, schema: ionState.schema }),
    })
  );

  const builds = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    const messages = data as Array<IonChannelBuildingStreamDataMessage>;
    const buildsMap = new Map<string, Build>();

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
            configEntity: {
              id: config.id,
              type: config.type,
              assets: config.assets || [],
            },
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
              modelEntity: {
                id: message.data.model.id,
                type: message.data.model.type,
                assets: message.data.model.assets || [],
              },
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
  }, [data]);

  const selectedBuild = selectedBuildIndex !== null ? builds[selectedBuildIndex] : null;

  useEffect(() => {
    if (builds.length > 0 && selectedBuildIndex === null) {
      setSelectedBuildIndex(0);
    }
  }, [builds.length, selectedBuildIndex]);

  const currentStatus = useMemo(() => {
    if (!data || !Array.isArray(data)) return null;

    const messages = data as Array<IonChannelBuildingStreamDataMessage>;
    const statusMessages = messages.filter((m) => m.message_type === MessageType.STATUS);
    const lastStatus = statusMessages[statusMessages.length - 1];

    return 'status' in lastStatus ? lastStatus?.status : null;
  }, [data]);

  const isBuilding =
    currentStatus === ActivityStatus.RUNNING || currentStatus === ActivityStatus.PENDING;
  const hasBuilds = builds.length > 0;
  const hasOutputForSelectedBuild = selectedBuild?.modelEntity !== undefined;

  const summaryAsset = selectedBuild?.modelEntity?.assets?.find(
    (asset) => asset.label === AssetLabel.ion_channel_model_figure_summary_json
  );

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({
      entityId: selectedBuild?.modelEntity?.id || '',
      assetId: summaryAsset?.id || '',
      ...context,
    }),
    queryFn: async () => {
      if (
        !selectedBuild?.modelEntity ||
        !summaryAsset ||
        !selectedBuild.modelEntity.id ||
        !selectedBuild.modelEntity.type ||
        !context.virtualLabId ||
        !context.projectId
      ) {
        return null;
      }

      const presignedData = await getEntityCorePresignedUrl({
        entityType: selectedBuild.modelEntity.type as TEntityTypeDict,
        entityId: selectedBuild.modelEntity.id,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: summaryAsset.id,
      });

      const response = await fetch(presignedData.url);
      const json: IonChannelModelFigureSummaryJson = await response.json();
      return json;
    },
    enabled:
      !!selectedBuild?.modelEntity &&
      !!summaryAsset &&
      !!context.virtualLabId &&
      !!context.projectId,
    staleTime: Infinity,
  });

  const outputListItems = useMemo(() => {
    if (!selectedBuild?.modelEntity) return [];

    const modelEntity = selectedBuild.modelEntity;
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
  }, [selectedBuild?.modelEntity, summaryData]);

  useEffect(() => {
    if (!selectedBuild?.modelEntity) return;

    if (!selectedPreview) {
      if (outputListItems.length > 0) {
        setSelectedPreview(toSelectedOutputPreview(outputListItems[0]));
      }
      return;
    }

    if (selectedPreview.kind === 'input') return;

    const selectedOutputStillExists = outputListItems.some((item) => {
      if (item.kind === 'asset' && selectedPreview.kind === 'output-asset') {
        return item.id === selectedPreview.id;
      }

      if (item.kind === 'trace-group' && selectedPreview.kind === 'output-trace-group') {
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
  }, [selectedPreview, selectedBuild?.modelEntity, outputListItems]);

  const isOutputLoading =
    (isBuilding && !hasOutputForSelectedBuild) || (loadingSummary && outputListItems.length === 0);

  return (
    <div className="grid h-[calc(100vh-10rem)] w-full grid-cols-[20rem_25rem_1fr] gap-8 p-4">
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

      <div className="bg-background secondary-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pr-3">
        {!selectedBuild ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            {hasBuilds ? 'Select a build to view files' : 'Waiting for build execution...'}
          </div>
        ) : (
          <>
            {(selectedBuild.configEntity?.assets?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-label mb-3 text-lg font-semibold">Input Files</h3>
                <div className="flex flex-col gap-2">
                  {selectedBuild.configEntity.assets?.map((asset) => {
                    const fileName = getFileName(asset.path);
                    const extension = getFileExtension(asset);
                    const isActive =
                      selectedPreview?.kind === 'input' && selectedPreview.id === asset.id;

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
                                entity: selectedBuild.configEntity,
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
              <h3 className="text-label mb-3 text-lg font-semibold">Output Files</h3>
              {isOutputLoading ? (
                <div className="flex flex-col gap-2">
                  {['loading-1', 'loading-2', 'loading-3', 'loading-4', 'loading-5'].map((key) => (
                    <Skeleton key={key} className="h-12 w-full rounded-full" />
                  ))}
                </div>
              ) : selectedBuild.modelEntity ? (
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
                        selectedPreview?.kind === 'output-trace-group' &&
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
                      selectedPreview?.kind === 'output-asset' &&
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
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">No output files yet</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-background flex flex-1 flex-col overflow-auto px-2 pb-2">
        {selectedPreview?.kind === 'input' || selectedPreview?.kind === 'output-asset' ? (
          <FileViewer
            asset={selectedPreview.asset}
            entity={selectedPreview.entity}
            context={context}
          />
        ) : selectedPreview?.kind === 'output-trace-group' ? (
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
