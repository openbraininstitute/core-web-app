'use client';

import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { RightOutlined, SettingFilled, WarningFilled } from '@ant-design/icons';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { launchSimulationAtom } from '@/ui/segments/workflows/simulate/single-neuron/shared/runner';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { simulationStatusAtomFamily } from '@/state/simulate/single-neuron';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  SynapseConfigurationArraySchema,
  NeuronLocationArraySchema,
  OverviewConfigurationSchema,
  StimulationConfigurationSchema,
  ExperimentalSetupConfigurationSchema,
  AmperageStateSchema,
  FrequencyInputConfigSchema,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import {
  AmperageStateAtomFamily,
  ExperimentalSetupConfigurationAtomFamily,
  FrequencyInputConfigurationAtomFamily,
  OverviewConfigurationAtomFamily,
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY,
  PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
  PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY,
  PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY,
  PREFIX_AMPERAGE_CONFIGURATION_SESSION_KEY,
  PROTOCOL_DETAILS,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { useAppNotification } from '@/components/notification';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import {
  SimulationType,
  type TSimulationType,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { browserHistoryReplace } from '@/utils/browser';

export const ExperimentStep = {
  Info: 'info',
  ExperimentalSetup: 'experimental-setup',
  StimulationProtocol: 'stimulation-protocol',
  SynapticInputs: 'synaptic-inputs',
  Recording: 'recording',
} as const;

export type ExperimentStepKeys = (typeof ExperimentStep)[keyof typeof ExperimentStep];

type Props = {
  type: TSimulationType;
  sessionId: string;
};

export function Menu({ sessionId, type }: Props) {
  const pathname = usePathname();
  const notify = useAppNotification();
  const searchParams = useSearchParams();
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const { id: modelId } = useParams<{ id: string }>();
  const step = searchParams.get('step') ?? ExperimentStep.Info;
  const launchSimulation = useSetAtom(launchSimulationAtom);
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));

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

  const spcKey = getSessionKey(PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const sesKey = getSessionKey(PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY, sessionId);
  const rlcKey = getSessionKey(PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const sscKey = getSessionKey(PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const freqKey = getSessionKey(PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY, sessionId);
  const infoKey = getSessionKey(PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY, sessionId);
  const ampKey = getSessionKey(PREFIX_AMPERAGE_CONFIGURATION_SESSION_KEY, sessionId);

  const [overviewConfiguration] = useAtom(OverviewConfigurationAtomFamily(infoKey));
  const [stimulationConfiguration] = useAtom(StimulationConfigurationAtomFamily(spcKey));
  const [experimentalSetupConfiguration] = useAtom(
    ExperimentalSetupConfigurationAtomFamily(sesKey)
  );
  const [recordLocationConfiguration] = useAtom(RecordLocationConfigurationAtomFamily(rlcKey));
  const [synaptomeConfiguration] = useAtom(SynaptomeConfigurationAtomFamily(sscKey));
  const [frequencyConfiguration] = useAtom(FrequencyInputConfigurationAtomFamily(freqKey));
  const [amperageConfiguration] = useAtom(AmperageStateAtomFamily(ampKey));

  const onRun = () => {
    const protocol = stimulationConfiguration.stimulus.stimulus_protocol;
    let currentInjectionDuration = 0;
    if (protocol) {
      currentInjectionDuration = PROTOCOL_DETAILS[protocol].defaults.time.stop_time;
    }
    launchSimulation(
      virtualLabId,
      projectId,
      modelId,
      sessionId,
      stimulationConfiguration,
      experimentalSetupConfiguration,
      recordLocationConfiguration,
      synaptomeConfiguration,
      type,
      experimentalSetupConfiguration.max_time ?? currentInjectionDuration,
      () => updatePanelSelection()
    );
  };

  const warnInfo =
    OverviewConfigurationSchema.safeParse(overviewConfiguration).error?.formErrors.fieldErrors;

  const warnRecordLocation = NeuronLocationArraySchema.safeParse(recordLocationConfiguration).error
    ?.formErrors.fieldErrors;

  const warnExperimentalSetup = ExperimentalSetupConfigurationSchema.safeParse(
    experimentalSetupConfiguration
  ).error?.formErrors.fieldErrors;

  const warnStimulationProtocol = {
    ...StimulationConfigurationSchema.safeParse(stimulationConfiguration).error?.formErrors
      .fieldErrors,
    ...AmperageStateSchema.safeParse(amperageConfiguration).error?.formErrors.fieldErrors,
  };

  const warnSynaptome =
    type === SimulationType.SingleNeuronSynaptome
      ? {
          ...SynapseConfigurationArraySchema.safeParse(synaptomeConfiguration).error?.formErrors
            .fieldErrors,
          ...FrequencyInputConfigSchema.safeParse(frequencyConfiguration).error?.formErrors
            .fieldErrors,
        }
      : {};

  const disableRunSimulation =
    !!Object.keys(warnRecordLocation ?? {}).length ||
    !!Object.keys(warnExperimentalSetup ?? {}).length ||
    !!Object.keys(warnStimulationProtocol ?? {}).length ||
    (type === SimulationType.SingleNeuronSynaptome && !!Object.keys(warnSynaptome ?? {}).length) ||
    simulationStatus?.status === 'launched';

  useEffect(() => {
    if (simulationStatus && simulationStatus.status === 'error') {
      notify.error({
        message:
          type === SimulationType.SingleNeuronSynaptome
            ? 'Synaptome simulation failed'
            : 'Single neuron simulation failed',
        description: simulationStatus.description,
        placement: 'topRight',
        key: 'simulation-error',
      });
    }
  }, [simulationStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
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
                <TooltipTrigger>
                  <WarningFilled className="text-sm text-yellow-300" />
                </TooltipTrigger>
                <TooltipContent
                  avoidCollisions
                  side="bottom"
                  sideOffset={10}
                  collisionPadding={{ left: 25 }}
                  className="text-destructive shadow-bnb max-w-2xs min-w-2xs rounded-md bg-amber-100 px-4 py-5 text-wrap"
                  arrowClassName="bg-amber-100"
                >
                  {Object.values(warnInfo ?? {}).map((e1) => {
                    return e1.map((err1) => (
                      <p key={err1} className="w-full pb-0.5 break-words hyphens-auto">
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
          <div className="flex-shrink-0 font-bold">Experimental setup</div>
          <div className="flex items-center justify-center gap-3">
            {warnExperimentalSetup && (
              <Tooltip>
                <TooltipTrigger>
                  <WarningFilled className="text-sm text-yellow-300" />
                </TooltipTrigger>
                <TooltipContent
                  avoidCollisions
                  side="bottom"
                  sideOffset={10}
                  collisionPadding={{ left: 25 }}
                  className="text-destructive shadow-bnb max-w-2xs min-w-2xs rounded-md bg-amber-100 px-4 py-5 text-wrap"
                  arrowClassName="bg-amber-100"
                >
                  {warnExperimentalSetup &&
                    Object.values(warnExperimentalSetup).map((e2) => {
                      return e2.map((err2) => {
                        return (
                          <p key={err2} className="w-full pb-0.5 break-words hyphens-auto">
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
      {type === SimulationType.SingleNeuronSynaptome && (
        <Button
          rounded
          variant="outline"
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn('w-full justify-start pr-2 shadow-md')}
          active={step === ExperimentStep.SynapticInputs}
          onClick={() => onStepChange(ExperimentStep.SynapticInputs)}
        >
          <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
            <div className="flex-shrink-0 font-bold">Synaptic Input</div>
            <div className="flex items-center justify-center gap-3">
              {!!Object.keys(warnSynaptome ?? {}).length && (
                <Tooltip open>
                  <TooltipTrigger>
                    <WarningFilled className="text-sm text-yellow-300" />
                  </TooltipTrigger>
                  <TooltipContent
                    avoidCollisions
                    side="bottom"
                    sideOffset={10}
                    collisionPadding={{ left: 25 }}
                    className="text-destructive shadow-bnb w-full max-w-2xs min-w-2xs rounded-md bg-amber-100 px-4 py-5 text-wrap break-words"
                    arrowClassName="bg-amber-100"
                  >
                    {warnSynaptome &&
                      Object.values(warnSynaptome).map((e3) => {
                        return Array.isArray(e3)
                          ? e3.map((err3: string) => (
                              <p
                                key={err3}
                                className="pb-0.5 [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap"
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
          <div className="flex-shrink-0 font-bold">Stimulation protocol</div>
          <div className="flex items-center justify-center gap-3">
            {!!Object.keys(warnStimulationProtocol ?? {}).length && (
              <Tooltip>
                <TooltipTrigger>
                  <WarningFilled className="text-sm text-yellow-300" />
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
                            <p key={err4} className="w-full pb-0.5 break-words hyphens-auto">
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
          <div className="flex-shrink-0 font-bold">Recording</div>
          <div className="flex items-center justify-center gap-3">
            {!!Object.keys(warnRecordLocation ?? {}).length && (
              <Tooltip>
                <TooltipTrigger>
                  <WarningFilled className="text-sm text-yellow-300" />
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
                            <p key={err5} className="w-full pb-0.5 break-words hyphens-auto">
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
              disabled={disableRunSimulation}
              onClick={onRun}
            >
              <div className="flex-shrink-0 font-bold">Run experiment</div>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={10} arrowClassName="bg-primary-9">
          <p className={cn('max-w-80 text-left text-base text-balance')}>
            Please fill all the required information <br />
            along with experiment configurations.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
