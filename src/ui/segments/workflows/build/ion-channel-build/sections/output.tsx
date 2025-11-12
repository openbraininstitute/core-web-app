/* eslint-disable no-nested-ternary */

import { useMemo, useState, useEffect } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { useAtom } from 'jotai';
import {
  queryOptions,
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query';

import {
  CONFIGURATION_FORM_STATE_KEY,
  GenerativeFromAtomFamily,
  IonChannelModelingSharedStateFamily,
} from '@/ui/segments/workflows/build/ion-channel-build/helpers';

import { isFormValid } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers/validate-form';
import { FileViewer } from '@/ui/segments/workflows/build/ion-channel-build/sections/file-viewer';
import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { getStatusColor } from '@/ui/segments/activity-execution/color-map';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  build as buildIonChannel,
  DataType,
  MessageType,
} from '@/api/small-scale-simulator/ion-channel/build';
import { Card, CardTitle } from '@/ui/molecules/card';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Button } from '@/ui/molecules/button';
import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';
import {
  createAsyncIterableStream,
  createTextStream,
  emptyStream,
  messageGenerator,
} from '@/utils/streamutils';

import type { EntityCoreResource, IAsset } from '@/api/entitycore/types/shared/global';
import type { TStreamMessage } from '@/api/small-scale-simulator/ion-channel/build';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type {
  IonChannelModelingCampaign,
  IonChannelModelingConfig,
} from '@/api/entitycore/types/entities/ion-channel-modeling-campaign';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import {
  EntitycoreExecutionStatus,
  type IEntitycoreExecution,
  type TEntitycoreExecutionStatus,
} from '@/api/entitycore/types/entities/execution';

type IonChannelModelFigureSummaryJson = {
  [key: string]: {
    traces: string;
    stimuli: string;
    order: number;
  };
};

type IonChannelModelProtocolGroup = {
  name: string;
  traces: IAsset;
  stimuli: IAsset;
  order: number;
};

type IonChannelBuildingStreamDataMessage = TStreamMessage<{
  campaign?: IonChannelModelingCampaign;
  execution?: IEntitycoreExecution;
  config?: IonChannelModelingConfig;
  model?: IonChannelModel;
}>;

type Build = {
  executionId: string;
  status: TEntitycoreExecutionStatus;
  configEntity: Partial<EntityCoreResource>;
  modelEntity?: Partial<EntityCoreResource>;
  executionStatus?: string;
};

export function Output({ sessionId }: { sessionId: string | null }) {
  const context = useWorkspace();
  const [ionState] = useAtom(
    useMemo(() => IonChannelModelingSharedStateFamily(sessionId!), [sessionId])
  );
  const [payload] = useAtom(
    useMemo(
      () => GenerativeFromAtomFamily(`${CONFIGURATION_FORM_STATE_KEY}/${sessionId}`),
      [sessionId]
    )
  );

  const [selectedBuildIndex, setSelectedBuildIndex] = useState<number | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<{
    asset: IAsset;
    entity: Partial<EntityCoreResource>;
    type: 'input' | 'output';
  } | null>(null);

  const [selectedProtocol, setSelectedProtocol] = useState<IonChannelModelProtocolGroup | null>(
    null
  );
  const [selectedModFile, setSelectedModFile] = useState<{
    asset: IAsset;
    entity: Partial<EntityCoreResource>;
  } | null>(null);

  const { data, isFetching, isLoading } = useQuery(
    queryOptions({
      queryKey: ['build-output-stream', { context, sessionId, payload }],
      queryFn: streamedQuery({
        queryFn: async () => {
          const response = await buildIonChannel({ ctx: context, payload, stream: true });
          const stream = await createTextStream(response);
          if (!stream) return emptyStream();
          return messageGenerator(createAsyncIterableStream<string>(stream));
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
    currentStatus === EntitycoreExecutionStatus.RUNNING ||
    currentStatus === EntitycoreExecutionStatus.PENDING;
  const hasBuilds = builds.length > 0;
  const hasOutputForSelectedBuild = selectedBuild?.modelEntity !== undefined;

  const summaryAsset = selectedBuild?.modelEntity?.assets?.find(
    (a) => a.label === AssetLabel.ion_channel_model_figure_summary_json
  );

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({
      entityId: selectedBuild?.modelEntity?.id || '',
      assetId: summaryAsset?.id || '',
      ...context,
    }),
    queryFn: async () => {
      if (!selectedBuild?.modelEntity || !summaryAsset) return null;

      const presignedData = await getEntityCorePresignedUrl({
        entityType: selectedBuild.modelEntity.type as TEntityTypeDict,
        entityId: selectedBuild.modelEntity.id!,
        virtualLabId: context.virtualLabId!,
        projectId: context.projectId!,
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

  const protocolGroups = useMemo(() => {
    if (!summaryData || !selectedBuild?.modelEntity) return [];

    const groups: Array<IonChannelModelProtocolGroup> = [];

    Object.entries(summaryData).forEach(([key, value]) => {
      const tracesAsset = selectedBuild.modelEntity!.assets?.find(
        (a) => a.path === value.traces || a.path.endsWith(`/${value.traces}`)
      );
      const stimuliAsset = selectedBuild.modelEntity!.assets?.find(
        (a) => a.path === value.stimuli || a.path.endsWith(`/${value.stimuli}`)
      );

      if (tracesAsset && stimuliAsset) {
        groups.push({
          name: key,
          traces: tracesAsset,
          stimuli: stimuliAsset,
          order: value.order,
        });
      }
    });

    return groups.sort((a, b) => a.order - b.order);
  }, [summaryData, selectedBuild?.modelEntity]);

  const modFile = selectedBuild?.modelEntity?.assets?.find(
    (a) => a.label === AssetLabel.neuron_mechanisms
  );

  useEffect(() => {
    if (modFile && !selectedModFile && !selectedProtocol && selectedBuild?.modelEntity) {
      setSelectedModFile({
        asset: modFile,
        entity: selectedBuild.modelEntity,
      });
    }
  }, [modFile, selectedModFile, selectedProtocol, selectedBuild?.modelEntity]);

  return (
    <div className="grid h-[calc(100vh-10rem)] w-full grid-cols-[20rem_25rem_1fr] gap-8 p-4">
      <div className="bg-background flex flex-shrink-0 flex-col gap-3 overflow-y-auto">
        {(isLoading || isFetching) && !hasBuilds ? (
          <Card key="build-0" className="p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </Card>
        ) : (
          builds.map((build, index) => {
            const statusColor = getStatusColor(build.status as EntitycoreExecutionStatus);
            const isSelected = selectedBuildIndex === index;

            return (
              <Card
                key={build.executionId}
                className={cn('cursor-pointer p-4 transition-all select-none', {
                  'border-2': isSelected,
                })}
                style={{
                  borderColor: isSelected ? statusColor : undefined,
                  backgroundColor: `${statusColor}15`,
                }}
                onClick={() => {
                  setSelectedBuildIndex(index);
                  setSelectedAsset(null);
                }}
                aria-checked={isSelected}
              >
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="text-primary-9 font-bold">Build {index}</div>
                  <div className="flex items-center gap-2">
                    {(build.status === EntitycoreExecutionStatus.RUNNING ||
                      build.status === EntitycoreExecutionStatus.PENDING) && (
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
                    const fileName = asset.path.split('/').pop() || asset.path;
                    const extension = fileName.split('.').pop()?.toUpperCase() || '';
                    const isActive =
                      selectedAsset?.asset.id === asset.id && selectedAsset.type === 'input';

                    return (
                      <Button
                        key={asset.id}
                        variant={isActive ? 'shadow' : 'outline'}
                        rounded
                        size="lg"
                        active={isActive}
                        onClick={() =>
                          setSelectedAsset({
                            asset,
                            entity: selectedBuild.configEntity,
                            type: 'input',
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
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-label mb-3 text-lg font-semibold">Output Files</h3>
              {(isBuilding && !hasOutputForSelectedBuild) || loadingSummary ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-full" />
                  ))}
                </div>
              ) : selectedBuild.modelEntity ? (
                <div className="flex flex-col gap-2">
                  {modFile && (
                    <Button
                      variant={selectedModFile?.asset.id === modFile.id ? 'shadow' : 'outline'}
                      rounded
                      size="lg"
                      active={selectedModFile?.asset.id === modFile.id}
                      onClick={() => {
                        setSelectedModFile({
                          asset: modFile,
                          entity: selectedBuild.modelEntity!,
                        });
                        setSelectedProtocol(null);
                        setSelectedAsset(null);
                      }}
                      className={cn('w-full justify-between gap-2', {
                        'shadow-[8px_12px_24px_0px_#0000000F,-16px_-16px_20px_0px_#FFFFFFD1]!':
                          selectedModFile?.asset.id === modFile.id,
                      })}
                    >
                      <span className="truncate">{modFile.path.split('/').pop()}</span>
                      <Badge rounded className="shrink-0">
                        MOD
                      </Badge>
                    </Button>
                  )}

                  {protocolGroups.map((protocol) => {
                    const tracesExt = protocol.traces.path.split('.').pop()?.toUpperCase() || '';
                    const stimuliExt = protocol.stimuli.path.split('.').pop()?.toUpperCase() || '';
                    const showBothBadges = tracesExt !== stimuliExt;
                    const isActive =
                      selectedProtocol?.name === protocol.name && selectedAsset === null;
                    return (
                      <Button
                        key={protocol.name}
                        variant={isActive ? 'shadow' : 'outline'}
                        rounded
                        size="lg"
                        active={isActive}
                        onClick={() => {
                          setSelectedProtocol(protocol);
                          setSelectedModFile(null);
                          setSelectedAsset(null);
                        }}
                        className={cn('w-full justify-between gap-2', {
                          'shadow-[8px_12px_24px_0px_#0000000F,-16px_-16px_20px_0px_#FFFFFFD1]!':
                            isActive,
                        })}
                      >
                        <span className="truncate">
                          {protocol.name === 'ap'
                            ? protocol.name.toUpperCase()
                            : protocol.name.charAt(0).toUpperCase() + protocol.name.slice(1)}{' '}
                          protocol
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <Badge rounded>{tracesExt}</Badge>
                          {showBothBadges && <Badge rounded>{stimuliExt}</Badge>}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">No output files yet</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-background flex flex-1 flex-col overflow-auto px-2 pb-2">
        {selectedAsset ? (
          <FileViewer asset={selectedAsset.asset} entity={selectedAsset.entity} context={context} />
        ) : selectedModFile ? (
          <FileViewer
            asset={selectedModFile.asset}
            entity={selectedModFile.entity}
            context={context}
          />
        ) : selectedProtocol ? (
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <FileViewer
                asset={selectedProtocol.stimuli}
                entity={selectedBuild!.modelEntity!}
                context={context}
              />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <FileViewer
                asset={selectedProtocol.traces}
                entity={selectedBuild!.modelEntity!}
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
