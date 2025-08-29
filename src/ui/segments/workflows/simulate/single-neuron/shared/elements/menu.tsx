'use client';

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RightOutlined, SettingFilled } from '@ant-design/icons';
import { useAtom, useSetAtom } from 'jotai';

import { headerTabsAtom } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/header';
import { launchSimulationAtom } from '@/ui/segments/workflows/simulate/single-neuron/shared/runner';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';

import {
  ExperimentalSetupConfigurationAtomFamily,
  RecordLocationConfigurationAtomFamily,
  StimulationProtocolConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY,
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  PREFIX_SYNAPTOME_SIMULATION_CONFIGURATION_SESSION_KEY,
  PROTOCOL_DETAILS,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import {
  SimulationType,
  type TSimulationType,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

export const ExperimentStep = {
  Info: 'info',
  ExperimentalSetup: 'experimental-setup',
  StimulationProtocol: 'stimulation-protocol',
  SynapticInput: 'synaptic-input',
  Recording: 'recording',
} as const;

export type ExperimentStepKeys = (typeof ExperimentStep)[keyof typeof ExperimentStep];

type Props = {
  type: TSimulationType;
  sessionId: string;
};

export function Menu({ sessionId, type }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const { id: modelId } = useParams<{ id: string }>();
  const step = searchParams.get('step') ?? ExperimentStep.Info;
  const launchSimulation = useSetAtom(launchSimulationAtom);
  const [, updatePanelId] = useAtom(headerTabsAtom);
  const onStepChange = (s: ExperimentStepKeys) => {
    const query = new URLSearchParams(searchParams);
    query.set('step', s);

    replace(`${pathname}?${query.toString()}`);
  };

  const spcKey = getSessionKey(PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const sesKey = getSessionKey(PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY, sessionId);
  const rlcKey = getSessionKey(PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const sscKey = getSessionKey(PREFIX_SYNAPTOME_SIMULATION_CONFIGURATION_SESSION_KEY, sessionId);
  const [currentInjectionConfig] = useAtom(StimulationProtocolConfigurationAtomFamily(spcKey));
  const [conditionsConfig] = useAtom(ExperimentalSetupConfigurationAtomFamily(sesKey));
  const [recordFromConfig] = useAtom(RecordLocationConfigurationAtomFamily(rlcKey));
  const [synaptomeConfig] = useAtom(SynaptomeConfigurationAtomFamily(sscKey));

  const onRun = () => {
    const protocol = currentInjectionConfig.stimulus.stimulus_protocol;
    let currentInjectionDuration = 0;
    if (protocol) {
      currentInjectionDuration = PROTOCOL_DETAILS[protocol].defaults.time.stop_time;
    }
    updatePanelId(WorkflowSimulatePanels.Results);
    launchSimulation(
      virtualLabId,
      projectId,
      modelId,
      sessionId,
      currentInjectionConfig,
      conditionsConfig,
      recordFromConfig,
      synaptomeConfig,
      type,
      conditionsConfig.max_time ?? currentInjectionDuration
    );
  };

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
          <RightOutlined
            className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
              '-rotate-180 transform text-white!': step === ExperimentStep.Info,
            })}
          />
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
          <RightOutlined
            className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
              '-rotate-180 transform text-white!': step === ExperimentStep.ExperimentalSetup,
            })}
          />
        </div>
      </Button>
      {type === SimulationType.SingleNeuronSynaptome && (
        <Button
          rounded
          variant="outline"
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn('w-full justify-start pr-2 shadow-md')}
          active={step === ExperimentStep.SynapticInput}
          onClick={() => onStepChange(ExperimentStep.SynapticInput)}
        >
          <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
            <div className="flex-shrink-0 font-bold">Synaptic Input</div>
            <RightOutlined
              className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                '-rotate-180 transform text-white!': step === ExperimentStep.SynapticInput,
              })}
            />
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
          <RightOutlined
            className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
              '-rotate-180 transform text-white!': step === ExperimentStep.StimulationProtocol,
            })}
          />
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
          <RightOutlined
            className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
              '-rotate-180 transform text-white!': step === ExperimentStep.Recording,
            })}
          />
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
              onClick={onRun}
            >
              <div className="flex-shrink-0 font-bold">Run experiment</div>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          <p className={cn('max-w-80 text-left text-base text-balance')}>
            Please fill all the required information <br /> along with experiment configurations.
            The simulation results will be matching only valid configurations.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
