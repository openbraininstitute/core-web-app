'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useAtom } from 'jotai';

import kebabCase from 'lodash/kebabCase';
import uniqBy from 'lodash/uniqBy';

import { createSingleNeuronSimulationAtom } from '@/ui/segments/workflows/simulate/single-neuron/shared/runner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  OverviewConfigSchema,
  SimulationType,
  type PlotData,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { exportSimulationResultsAsZip } from '@/util/simulation-plotly-to-csv';
import { getSingleNeuronStimuliPlot } from '@/api/small-scale-simulator';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useAppNotification } from '@/components/notification';
import {
  PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY,
  PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY,
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import {
  keyBuilder as workspaceKeyBuilder,
  prefix as workspaceKeyPrefix,
} from '@/ui/use-query-keys/workspace';
import {
  ExperimentalSetupConfigurationAtomFamily,
  OverviewConfigurationAtomFamily,
  RecordLocationConfigurationAtomFamily,
  StimulationProtocolConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { messages } from '@/i18n/en/simulation';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import {
  genericSingleNeuronSimulationPlotDataAtomFamily,
  simulationStatusAtom,
} from '@/state/simulate/single-neuron';

type Props = {
  sessionId: string;
  modelId: string;
  memodelId: string;
};

export function Menu({ sessionId, modelId, memodelId }: Props) {
  const pathname = usePathname();
  const { replace } = useRouter();
  const breakpoint = useDefaultBreakpoint();
  const queryClient = useQueryClient();
  const queryParams = useSearchParams();
  const notification = useAppNotification();
  const { virtualLabId, projectId } = useWorkspace();

  const infoKey = getSessionKey(PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY, sessionId);
  const rclKey = getSessionKey(PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const spcKey = getSessionKey(PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const sesKey = getSessionKey(PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY, sessionId);

  const [, createSingleNeuronSimulation] = useAtom(createSingleNeuronSimulationAtom);
  const [simulationStatus] = useAtom(simulationStatusAtom);
  const [simulationResults] = useAtom(genericSingleNeuronSimulationPlotDataAtomFamily(sessionId));
  const [recodingConfig] = useAtom(RecordLocationConfigurationAtomFamily(rclKey));
  const [overviewConfig] = useAtom(OverviewConfigurationAtomFamily(infoKey));
  const [stimulationConfig] = useAtom(StimulationProtocolConfigurationAtomFamily(spcKey));
  const [experimentalConfig] = useAtom(ExperimentalSetupConfigurationAtomFamily(sesKey));

  const current = queryParams.get('record') ?? 'all';
  const validateOverview = OverviewConfigSchema.safeParse(overviewConfig);
  const controlsDisabled = simulationStatus?.status !== 'finished' || !!validateOverview.error;

  const onChange = (value: string) => {
    const params = new URLSearchParams(queryParams);
    params.set('record', value);
    replace(`${pathname}?${params.toString()}`);
  };

  const handleSaveSimulation = async () => {
    const data = await queryClient.fetchQuery({
      queryKey: keyBuilder.stimulationProtocolPreview({
        virtualLabId,
        projectId,
        memodelId,
        amplitudes: (Array.isArray(stimulationConfig.stimulus.amplitudes)
          ? stimulationConfig.stimulus.amplitudes
          : [stimulationConfig.stimulus.amplitudes]
        ).join(','),
        protocol: stimulationConfig.stimulus.stimulus_protocol!,
      }),
      queryFn: () =>
        getSingleNeuronStimuliPlot({
          modelId: memodelId,
          config: {
            amplitudes: Array.isArray(stimulationConfig.stimulus.amplitudes)
              ? stimulationConfig.stimulus.amplitudes
              : [stimulationConfig.stimulus.amplitudes],
            stimulusProtocol: stimulationConfig.stimulus.stimulus_protocol!,
          },
          ctx: { projectId, virtualLabId },
        }),
    });

    createSingleNeuronSimulation(
      overviewConfig.name,
      overviewConfig.description ?? '',
      modelId,
      memodelId,
      virtualLabId,
      projectId,
      SimulationType.SingleNeuron,
      stimulationConfig,
      experimentalConfig,
      recodingConfig,
      undefined,
      simulationResults,
      data as PlotData
    );
  };

  const mutateSaveSimulation = useMutation({
    mutationFn: () => handleSaveSimulation(),
    onError: (error) => {
      notification.error({
        message: error?.message ?? messages.CreationSimulationFailed,
        duration: 7,
        placement: 'topRight',
        key: 'simulation-saved',
      });
    },
    onSuccess: () => {
      notification.success({
        message: messages.CreationSimulationSucceed,
        placement: 'topRight',
        key: 'simulation-saved',
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workspaceKeyBuilder.wallet({ virtualLabId, projectId }),
        }),
        queryClient.invalidateQueries({
          queryKey: [`${workspaceKeyPrefix}/activities`, { type: 'simulate' }],
        }),
      ]);
    },
  });

  const mutateDownloadResultsAsZip = useMutation({
    mutationFn: () =>
      exportSimulationResultsAsZip({
        name: kebabCase(overviewConfig.name) ?? 'simulation_plots',
        result: simulationResults!,
      }),
    onSuccess: () => {
      notification.success({
        message: messages.DownloadSuccessful,
        placement: 'topRight',
        key: 'download-simulation-zip',
      });
    },
    onError: () => {
      notification.error({
        message: messages.DownloadFailed,
        placement: 'topRight',
        key: 'download-simulation-zip',
      });
    },
  });

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="secondary-scrollbar flex h-full w-full flex-col items-center justify-start gap-2 overflow-y-auto scroll-auto pr-1.5">
        <Button
          rounded
          variant="outline"
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn('w-full justify-start pr-2! font-bold shadow-md')}
          onClick={() => onChange('all')}
          active={current === 'all'}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div>All</div>
            <RightOutlined
              className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                '-rotate-180 transform text-white!': current === 'all',
              })}
            />
          </div>
        </Button>
        {uniqBy(recodingConfig, (item) => `${item.section}-${item.offset}`).map(
          ({ section, offset }, indx) => {
            const record = `${section}_${offset}`;
            return (
              <Button
                // eslint-disable-next-line react/no-array-index-key
                key={`${record}_${indx}`}
                rounded
                variant="outline"
                size={breakpoint === 'l' ? 'md' : 'lg'}
                className={cn('w-full justify-start pr-2! font-bold shadow-md')}
                onClick={() => onChange(record)}
                active={record === current}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div>{record}</div>
                  <RightOutlined
                    className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                      '-rotate-180 transform text-white!': current === record,
                    })}
                  />
                </div>
              </Button>
            );
          }
        )}
      </div>
      <div className="mt-auto flex w-full items-center justify-center gap-2 pr-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-auto w-full">
              <Button
                rounded
                variant="outline"
                size={breakpoint === 'l' ? 'md' : 'lg'}
                className={cn(
                  'disabled:bg-neutral-2 disabled:text-neutral-4! w-full justify-center px-10 font-medium!'
                )}
                onClick={() => mutateDownloadResultsAsZip.mutateAsync()}
                disabled={controlsDisabled}
              >
                <div className="flex-shrink-0 font-bold">
                  Download <span className="font-light">(csv)</span>
                </div>
                {mutateDownloadResultsAsZip.isPending && (
                  <LoadingOutlined className="ml-2 text-white" />
                )}
              </Button>
            </div>
          </TooltipTrigger>
          {controlsDisabled && (
            <TooltipContent sideOffset={10} collisionPadding={{ left: 20 }}>
              <p className={cn('max-w-80 text-left text-sm break-words hyphens-auto')}>
                Almost there! To save your simulation, please let it finish running and make sure
                the details are complete
              </p>
            </TooltipContent>
          )}
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-auto w-full">
              <Button
                rounded
                variant="success"
                size={breakpoint === 'l' ? 'md' : 'lg'}
                className={cn(
                  'disabled:bg-neutral-2 disabled:text-neutral-4! w-full justify-center px-10 font-medium!'
                )}
                onClick={() => mutateSaveSimulation.mutateAsync()}
                disabled={controlsDisabled}
              >
                <div className="flex-shrink-0 font-bold">Save</div>
                {mutateSaveSimulation.isPending && <LoadingOutlined className="ml-2 text-white" />}
              </Button>
            </div>
          </TooltipTrigger>
          {controlsDisabled && (
            <TooltipContent sideOffset={10}>
              <p className={cn('max-w-80 text-left text-sm break-words hyphens-auto')}>
                Almost there! To save your simulation, please let it finish running and make sure
                the details are complete
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
