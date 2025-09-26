'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useAtom } from 'jotai';
import kebabCase from 'lodash/kebabCase';
import uniqBy from 'lodash/uniqBy';
import Link from 'next/link';

import { createSingleNeuronSimulationAtom } from '@/ui/segments/workflows/simulate/single-neuron/shared/runner';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { exportSimulationResultsAsZip } from '@/util/simulation-plotly-to-csv';
import { getSingleNeuronStimuliPlot } from '@/api/small-scale-simulator';
import {
  PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY,
  PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY,
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  ExperimentalSetupConfigurationSchema,
  OverviewConfigurationSchema,
  RecordLocationArraySchema,
  SimulationType,
  StimulationConfigurationSchema,
  SynapseConfigurationArraySchema,
  type TSimulationType,
  type PlotData,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useAppNotification } from '@/components/notification';
import { ROOT_ROUTE } from '@/config';
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
  StimulationConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { messages } from '@/i18n/en/simulation';
import { Button } from '@/ui/molecules/button';
import {
  genericSingleNeuronSimulationPlotDataAtomFamily,
  simulationStatusAtomFamily,
} from '@/state/simulate/single-neuron';
import { cn } from '@/utils/css-class';

type Props = {
  sessionId: string;
  modelId: string;
  memodelId: string;
  type: TSimulationType;
};

export function Menu({ sessionId, modelId, memodelId, type }: Props) {
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
  const sscKey = getSessionKey(PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);

  const [simulationStatus] = useAtom(simulationStatusAtomFamily(sessionId));
  const [simulationResults] = useAtom(genericSingleNeuronSimulationPlotDataAtomFamily(sessionId));
  const [recordLocationConfiguration] = useAtom(RecordLocationConfigurationAtomFamily(rclKey));
  const [overviewConfiguration] = useAtom(OverviewConfigurationAtomFamily(infoKey));
  const [stimulationConfiguration] = useAtom(StimulationConfigurationAtomFamily(spcKey));
  const [experimentalSetupConfiguration] = useAtom(
    ExperimentalSetupConfigurationAtomFamily(sesKey)
  );
  const [synaptomeConfiguration] = useAtom(SynaptomeConfigurationAtomFamily(sscKey));

  const [, createSingleNeuronSimulation] = useAtom(createSingleNeuronSimulationAtom);

  const current = queryParams.get('record') ?? 'all';
  const disableSaveSimulation =
    !!RecordLocationArraySchema.safeParse(recordLocationConfiguration).error ||
    !!ExperimentalSetupConfigurationSchema.safeParse(experimentalSetupConfiguration).error ||
    !!StimulationConfigurationSchema.safeParse(stimulationConfiguration).error ||
    !!OverviewConfigurationSchema.safeParse(overviewConfiguration).error ||
    (type === SimulationType.SingleNeuronSynaptome &&
      !!SynapseConfigurationArraySchema.safeParse(synaptomeConfiguration).error);

  const onChange = (value: string) => {
    const params = new URLSearchParams(queryParams);
    params.set('record', value);
    params.delete('step');

    replace(`${pathname}?${params.toString()}`);
  };

  const handleSaveSimulation = async () => {
    const data = await queryClient.fetchQuery({
      queryKey: keyBuilder.stimulationProtocolPreview({
        virtualLabId,
        projectId,
        memodelId,
        amplitudes: (Array.isArray(stimulationConfiguration.stimulus.amplitudes)
          ? stimulationConfiguration.stimulus.amplitudes
          : [stimulationConfiguration.stimulus.amplitudes]
        ).join(','),
        protocol: stimulationConfiguration.stimulus.stimulus_protocol!,
      }),
      queryFn: () =>
        getSingleNeuronStimuliPlot({
          modelId: memodelId,
          config: {
            amplitudes: Array.isArray(stimulationConfiguration.stimulus.amplitudes)
              ? stimulationConfiguration.stimulus.amplitudes
              : [stimulationConfiguration.stimulus.amplitudes],
            stimulusProtocol: stimulationConfiguration.stimulus.stimulus_protocol!,
          },
          ctx: { projectId, virtualLabId },
        }),
    });

    return createSingleNeuronSimulation(
      overviewConfiguration.name,
      overviewConfiguration.description ?? '',
      modelId,
      memodelId,
      virtualLabId,
      projectId,
      type,
      stimulationConfiguration,
      experimentalSetupConfiguration,
      recordLocationConfiguration,
      synaptomeConfiguration,
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
    onSuccess: (data) => {
      notification.success({
        message: messages.CreationSimulationSucceed,
        description: (
          <div>
            <Link
              onClick={() => {
                notification.destroy('simulation-saved');
              }}
              href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${type === SimulationType.SingleNeuron ? kebabCase(ExtendedEntitiesTypeDict.SingleNeuronSimulation) : kebabCase(ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation)}/${data?.simulation.id}`}
              className="text-primary-6 hover:underline"
            >
              Go to simulation details
            </Link>
          </div>
        ),
        onClick: () => {
          notification.destroy('simulation-saved');
        },
        placement: 'topRight',
        key: 'simulation-saved',
        duration: 10,
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
        name: kebabCase(overviewConfiguration.name) ?? 'simulation_plots',
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

  const controlsDisabled =
    simulationStatus?.status !== 'finished' ||
    disableSaveSimulation ||
    mutateSaveSimulation.isPending;

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
        {uniqBy(recordLocationConfiguration, (item) => `${item.section}-${item.offset}`).map(
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
            <TooltipContent
              sideOffset={10}
              collisionPadding={{ left: 20 }}
              arrowClassName="bg-primary-9"
            >
              <p className={cn('max-w-80 text-left text-sm break-words hyphens-auto')}>
                Almost there! To download your simulation results, please let it finish running and
                make sure the details are complete
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
            <TooltipContent sideOffset={10} arrowClassName="bg-primary-9">
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
