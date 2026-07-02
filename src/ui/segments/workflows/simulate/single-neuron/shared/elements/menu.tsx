'use client';

import { RightOutlined, SettingFilled, WarningFilled } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { getSingleNeuronStimuliPlot } from '@/api/small-scale-simulator';
import { useLowCredits } from '@/features/low-credits';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import {
  PROTOCOL_DETAILS,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { launchSimulationAtom } from '@/ui/segments/workflows/simulate/single-neuron/shared/runner';
import {
  AmperageStateSchema,
  ExperimentalSetupConfigurationSchema,
  FrequencyInputConfigSchema,
  NeuronLocationArraySchema,
  OverviewConfigurationSchema,
  type PlotData,
  SimulationType,
  StimulationConfigurationSchema,
  SynapseConfigurationArraySchema,
  type TSimulationType,
  type TStimulusModuleValue,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { useSingleNeuronSimulationAtoms } from '@/ui/segments/workflows/simulate/single-neuron/shared/use-simulation-atoms';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { browserHistoryReplace } from '@/utils/browser';
import { cn } from '@/utils/css-class';

export const ExperimentStep = {
  Info: 'info',
  ExperimentalSetup: 'experimental-setup',
  StimulationProtocol: 'stimulation-protocol',
  SynapticInputs: 'synaptic-inputs',
  Recording: 'recording',
} as const;

export type ExperimentStepKeys = (typeof ExperimentStep)[keyof typeof ExperimentStep];

type Props = {
  simulationType: TSimulationType;
  sessionId: string;
  modelId: string;
  memodelId: string;
};

export function Menu({ sessionId, simulationType, modelId, memodelId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const launchSimulation = useSetAtom(launchSimulationAtom);
  const { notifyLowCredits, creditsModal } = useLowCredits({ subject: 'run the simulation' });
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));
  const step = searchParams.get('step') ?? ExperimentStep.Info;

  const [isLaunching, setIsLaunching] = useState(false);

  const updatePanelSelection = () => {
    const query = new URLSearchParams(searchParams);
    query.delete('step');
    query.set('panel', WorkflowSimulatePanels.Results);

    browserHistoryReplace(null, `${pathname}?${query.toString()}`);
  };

  const onStepChange = (s: ExperimentStepKeys) => {
    const query = new URLSearchParams(searchParams);
    query.set('step', s);

    browserHistoryReplace(null, `${pathname}?${query.toString()}`);
  };

  const {
    overviewConfiguration,
    amperageConfiguration,
    experimentalSetupConfiguration,
    recordLocationConfiguration,
    synaptomeConfiguration,
    frequencyConfiguration,
    stimulationConfiguration,
  } = useSingleNeuronSimulationAtoms(sessionId);

  const overResourceThreshold = useMemo(() => {
    const repetitionFactor = Math.max(
      amperageConfiguration.computed.length,
      ...synaptomeConfiguration.map((c) => (Array.isArray(c.frequency) ? c.frequency.length : 1))
    );

    const recordingFactor = recordLocationConfiguration.reduce(
      (recFactor, c) => recFactor + (c.record_currents ? 6 : 1),
      0
    );

    const recordingVectorLength =
      experimentalSetupConfiguration.max_time / experimentalSetupConfiguration.time_step;

    const sizeEstimate = repetitionFactor * recordingFactor * recordingVectorLength;
    // Size estimate unit = ~35 bytes in the resulting JSON asset.
    // The threshold is set to ~150 MB which is the current limit for entitycore asset uploads,
    // see https://github.com/openbraininstitute/entitycore/blob/main/app/config.py#L51
    const threshold = 5_500_000;

    return sizeEstimate > threshold;
  }, [
    amperageConfiguration,
    synaptomeConfiguration,
    recordLocationConfiguration,
    experimentalSetupConfiguration,
  ]);

  const onRun = async () => {
    setIsLaunching(true);

    const protocol = stimulationConfiguration.stimulus.stimulus_protocol;
    let currentInjectionDuration = 0;

    if (protocol) {
      currentInjectionDuration = PROTOCOL_DETAILS[protocol].defaults.time.stop_time;
    }

    const stimulusGraphResult = await queryClient.ensureQueryData({
      queryKey: keyBuilder.stimulationProtocolPreview({
        virtualLabId,
        projectId,
        memodelId,
        amplitudes: (Array.isArray(stimulationConfiguration.stimulus.amplitudes)
          ? stimulationConfiguration.stimulus.amplitudes
          : [stimulationConfiguration.stimulus.amplitudes]
        ).join(','),
        protocol: stimulationConfiguration.stimulus.stimulus_protocol as string,
      }),
      queryFn: () =>
        getSingleNeuronStimuliPlot({
          modelId: memodelId,
          config: {
            amplitudes: Array.isArray(stimulationConfiguration.stimulus.amplitudes)
              ? stimulationConfiguration.stimulus.amplitudes
              : [stimulationConfiguration.stimulus.amplitudes],
            stimulusProtocol: stimulationConfiguration.stimulus
              .stimulus_protocol as TStimulusModuleValue,
          },
          ctx: { projectId, virtualLabId },
        }),
    });

    launchSimulation(
      virtualLabId,
      projectId,
      modelId,
      memodelId,
      sessionId,
      overviewConfiguration,
      stimulationConfiguration,
      experimentalSetupConfiguration,
      recordLocationConfiguration,
      synaptomeConfiguration,
      stimulusGraphResult as PlotData,
      simulationType,
      experimentalSetupConfiguration.max_time ?? currentInjectionDuration,
      () => updatePanelSelection(),
      notifyLowCredits
    );

    setIsLaunching(false);
  };

  const fieldErrors = (result: { error?: { flatten(): { fieldErrors: unknown } } }) =>
    result.error?.flatten().fieldErrors as Record<string, string[]> | undefined;

  const warnInfo = fieldErrors(OverviewConfigurationSchema.safeParse(overviewConfiguration));

  const warnRecordLocation = fieldErrors(
    NeuronLocationArraySchema.safeParse(recordLocationConfiguration)
  );

  const warnExperimentalSetup = fieldErrors(
    ExperimentalSetupConfigurationSchema.safeParse(experimentalSetupConfiguration)
  );

  const warnStimulationProtocol = {
    ...fieldErrors(StimulationConfigurationSchema.safeParse(stimulationConfiguration)),
    ...fieldErrors(AmperageStateSchema.safeParse(amperageConfiguration)),
  };

  const warnSynaptome =
    simulationType === SimulationType.SingleNeuronSynaptome
      ? {
          ...fieldErrors(SynapseConfigurationArraySchema.safeParse(synaptomeConfiguration)),
          ...fieldErrors(FrequencyInputConfigSchema.safeParse(frequencyConfiguration)),
        }
      : {};

  const disableRunSimulation =
    !!Object.keys(warnInfo ?? {}).length ||
    !!Object.keys(warnRecordLocation ?? {}).length ||
    !!Object.keys(warnExperimentalSetup ?? {}).length ||
    !!Object.keys(warnStimulationProtocol ?? {}).length ||
    overResourceThreshold ||
    (simulationType === SimulationType.SingleNeuronSynaptome &&
      !!Object.keys(warnSynaptome ?? {}).length) ||
    isLaunching ||
    simulationStatus?.status === SimulationStatus.LAUNCHED;

  return (
    <>
      {creditsModal}
      <div className="flex h-full flex-col gap-2">
        <div className="text-neutral-3 ml-4 font-light uppercase">Setup</div>
        <Button
          rounded
          variant="outline"
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn('w-full justify-start pr-2! font-bold shadow-md')}
          active={step === ExperimentStep.Info}
          onClick={() => onStepChange(ExperimentStep.Info)}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              <SettingFilled
                className={cn('text-neutral-3 mr-2 [&_svg]:size-3!', {
                  'text-primary-4!': step === ExperimentStep.Info,
                })}
              />
              Info
            </div>
            <div className="flex items-center justify-center gap-3">
              {!!warnInfo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <WarningFilled className="text-sm text-yellow-300!" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    avoidCollisions
                    side="bottom"
                    sideOffset={10}
                    collisionPadding={{ left: 25 }}
                    className="text-destructive! shadow-bnb max-w-2xs min-w-2xs rounded-md bg-amber-100! px-4 py-5 text-wrap"
                    arrowClassName="bg-amber-100"
                  >
                    {Object.values(warnInfo ?? {}).map((e1) => {
                      return e1.map((err1) => (
                        <p key={err1} className="w-full pb-0.5 wrap-break-words hyphens-auto">
                          • {err1}
                        </p>
                      ));
                    })}
                  </TooltipContent>
                </Tooltip>
              )}
              <RightOutlined
                className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                  '-rotate-180 transform text-white!': step === ExperimentStep.Info,
                })}
              />
            </div>
          </div>
        </Button>
        <div className="text-neutral-3 ml-4 font-light uppercase">Experiment</div>
        <Button
          rounded
          variant="outline"
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn('w-full justify-start pr-2 shadow-md')}
          active={step === ExperimentStep.ExperimentalSetup}
          onClick={() => onStepChange(ExperimentStep.ExperimentalSetup)}
        >
          <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
            <div className="shrink-0 font-bold">Experimental setup</div>
            <div className="flex items-center justify-center gap-3">
              {warnExperimentalSetup && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <WarningFilled className="text-sm text-yellow-300!" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    avoidCollisions
                    side="bottom"
                    sideOffset={10}
                    collisionPadding={{ left: 25 }}
                    className="text-destructive! shadow-bnb max-w-2xs min-w-2xs rounded-md bg-amber-100! px-4 py-5 text-wrap"
                    arrowClassName="bg-amber-100"
                  >
                    {warnExperimentalSetup &&
                      Object.values(warnExperimentalSetup).map((e2) => {
                        return e2.map((err2) => {
                          return (
                            <p key={err2} className="w-full pb-0.5 wrap-break-words hyphens-auto">
                              • {err2}
                            </p>
                          );
                        });
                      })}
                  </TooltipContent>
                </Tooltip>
              )}
              <RightOutlined
                className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                  '-rotate-180 transform text-white!': step === ExperimentStep.ExperimentalSetup,
                })}
              />
            </div>
          </div>
        </Button>
        {simulationType === SimulationType.SingleNeuronSynaptome && (
          <Button
            rounded
            variant="outline"
            size={breakpoint === 'l' ? 'md' : 'lg'}
            className={cn('w-full justify-start pr-2 shadow-md')}
            active={step === ExperimentStep.SynapticInputs}
            onClick={() => onStepChange(ExperimentStep.SynapticInputs)}
          >
            <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
              <div className="shrink-0 font-bold">Synaptic Input</div>
              <div className="flex items-center justify-center gap-3">
                {!!Object.keys(warnSynaptome ?? {}).length && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <WarningFilled className="text-sm text-yellow-300!" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      avoidCollisions
                      side="bottom"
                      sideOffset={10}
                      collisionPadding={{ left: 25 }}
                      className="text-destructive shadow-bnb w-full max-w-2xs min-w-2xs rounded-md bg-amber-100 px-4 py-5 text-wrap wrap-break-words"
                      arrowClassName="bg-amber-100"
                    >
                      {warnSynaptome &&
                        Object.values(warnSynaptome).map((e3) => {
                          return Array.isArray(e3)
                            ? e3.map((err3: string) => (
                                <p
                                  key={err3}
                                  className="pb-0.5 wrap-anywhere] hyphens-auto whitespace-pre-wrap"
                                >
                                  • {err3}
                                </p>
                              ))
                            : null;
                        })}
                    </TooltipContent>
                  </Tooltip>
                )}
                <RightOutlined
                  className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                    '-rotate-180 transform text-white!': step === ExperimentStep.SynapticInputs,
                  })}
                />
              </div>
            </div>
          </Button>
        )}
        <Button
          rounded
          variant="outline"
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn('w-full justify-start pr-2 shadow-md')}
          active={step === ExperimentStep.StimulationProtocol}
          onClick={() => onStepChange(ExperimentStep.StimulationProtocol)}
        >
          <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
            <div className="shrink-0 font-bold">Stimulation protocol</div>
            <div className="flex items-center justify-center gap-3">
              {!!Object.keys(warnStimulationProtocol ?? {}).length && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <WarningFilled className="text-sm text-yellow-300!" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    avoidCollisions
                    side="bottom"
                    sideOffset={10}
                    collisionPadding={{ left: 25 }}
                    className="text-destructive shadow-bnb max-w-2xs min-w-2xs rounded-md bg-amber-100 px-4 py-5 text-wrap"
                    arrowClassName="bg-amber-100"
                  >
                    {warnStimulationProtocol &&
                      Object.values(warnStimulationProtocol).map((e4) => {
                        return Array.isArray(e4)
                          ? e4.map((err4: string) => (
                              <p key={err4} className="w-full pb-0.5 wrap-break-words hyphens-auto">
                                • {err4}
                              </p>
                            ))
                          : null;
                      })}
                  </TooltipContent>
                </Tooltip>
              )}
              <RightOutlined
                className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                  '-rotate-180 transform text-white!': step === ExperimentStep.StimulationProtocol,
                })}
              />
            </div>
          </div>
        </Button>
        <Button
          rounded
          variant="outline"
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn('w-full justify-start pr-2 shadow-md')}
          active={step === ExperimentStep.Recording}
          onClick={() => onStepChange(ExperimentStep.Recording)}
        >
          <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
            <div className="shrink-0 font-bold">Recording</div>
            <div className="flex items-center justify-center gap-3">
              {!!Object.keys(warnRecordLocation ?? {}).length && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <WarningFilled className="text-sm text-yellow-300!" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    avoidCollisions
                    side="bottom"
                    sideOffset={10}
                    collisionPadding={{ left: 25 }}
                    className="text-destructive shadow-bnb max-w-2xs min-w-2xs rounded-md bg-amber-100 px-4 py-5 text-wrap"
                    arrowClassName="bg-amber-100"
                  >
                    {warnRecordLocation &&
                      Object.values(warnRecordLocation).map((error) => {
                        return Array.isArray(error)
                          ? error.map((err5: string) => (
                              <p key={err5} className="w-full pb-0.5 wrap-break-words hyphens-auto">
                                • {err5}
                              </p>
                            ))
                          : null;
                      })}
                  </TooltipContent>
                </Tooltip>
              )}
              <RightOutlined
                className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                  '-rotate-180 transform text-white!': step === ExperimentStep.Recording,
                })}
              />
            </div>
          </div>
        </Button>
        <Tooltip open={overResourceThreshold ? true : undefined}>
          <TooltipTrigger asChild>
            <div className="mt-auto w-full">
              <Button
                rounded
                variant="success"
                size={breakpoint === 'l' ? 'md' : 'lg'}
                className={cn(
                  'disabled:bg-neutral-2 disabled:text-neutral-4! w-full justify-center px-10 font-medium!'
                )}
                disabled={disableRunSimulation}
                onClick={onRun}
              >
                <div className="shrink-0 font-bold">Run experiment</div>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent
            sideOffset={0}
            arrowClassName={overResourceThreshold ? 'bg-warning' : 'bg-primary-9'}
            className={overResourceThreshold ? 'bg-warning!' : undefined}
          >
            {overResourceThreshold ? (
              <div className="max-w-80 text-white">
                <span className="text-sm">Simulation is too complex, please decrease either:</span>
                <ul className="mt-2 list-disc pl-4">
                  <li>Number of steps for current/synaptic inputs</li>
                  <li>Number of recording locations and/or current recordings</li>
                  <li>Duration of the simulation</li>
                  <li>Precision by increasing time step</li>
                </ul>
              </div>
            ) : (
              <p className={cn('max-w-80 text-left text-base text-balance')}>
                Please fill all the required information <br />
                along with experiment configurations.
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
