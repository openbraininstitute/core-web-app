import { WarningFilled } from '@ant-design/icons';
import { useEffect, useMemo, useReducer } from 'react';
import { InputNumber, Switch } from 'antd';
import { useAtom } from 'jotai';
import isEqual from 'lodash/isEqual';

import StimuliPreviewPlot from '@/ui/segments/workflows/simulate/single-neuron/shared/stimuli-preview-plot';
import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  calculateRangeOutput,
  getSessionKey,
  label,
  MAX_AMPERAGE_STEPS,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  DEFAULT_PROTOCOL,
  DEFAULT_STIMULUS_CONFIG,
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  PREFIX_SYNAPTOME_SIMULATION_CONFIGURATION_SESSION_KEY,
  PROTOCOL_DETAILS,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  StimulationProtocolConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { cn } from '@/utils/css-class';

import type {
  AmperageActionType,
  AmperageStateType,
  TStimulusModuleValue,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

type Props = {
  sessionId: string;
  memodelId: string;
};

const getInitialAmperageState = (protocol: TStimulusModuleValue) => {
  const { min: start, max: end, step } = PROTOCOL_DETAILS[protocol].defaults.current;
  return {
    protocol,
    start,
    end,
    stepValue: step,
    computed: calculateRangeOutput(start, end, step),
    error: null as string | null,
  };
};

function rangeReducer(state: AmperageStateType, action: AmperageActionType) {
  const newState = { ...state } satisfies AmperageStateType;
  const newVal = action.payload;
  switch (action.type) {
    case 'start':
      newState.start = newVal;
      break;
    case 'end':
      newState.end = newVal;
      break;
    case 'stepValue':
      if (newVal < 0) {
        newState.stepValue = 0;
        break;
      }
      newState.stepValue = newVal;
      break;
    case 'reset-for-protocol':
      Object.assign(newState, { ...getInitialAmperageState(newVal) });
      break;
    case 'constant-value':
      newState.start = newVal;
      newState.end = newVal;
      newState.stepValue = 1;
      newState.computed = calculateRangeOutput(newState.start, newState.end, newState.stepValue);
      break;
    case 'checkConsistency':
      if (state.start > state.end) {
        newState.error = 'Start should be less than end';
        break;
      } else if (state.end < state.start) {
        newState.error = 'End should be greater than start';
        break;
      }

      newState.computed = calculateRangeOutput(newState.start, newState.end, newState.stepValue);

      if (newState.computed.length > MAX_AMPERAGE_STEPS) {
        newState.error = `There should be a maximum of ${MAX_AMPERAGE_STEPS} amperages in a simulation. Currently there are ${newState.computed.length}`;
      } else {
        newState.error = null;
      }
      break;
    default:
      throw new Error('Action not found', action.type);
  }
  return newState;
}

export function AmperageConfiguration({ sessionId, memodelId }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const sscKey = getSessionKey(PREFIX_SYNAPTOME_SIMULATION_CONFIGURATION_SESSION_KEY, sessionId);
  const spcKey = getSessionKey(PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const [sscState] = useAtom(SynaptomeConfigurationAtomFamily(sscKey));
  const [spcState, updateSPC] = useAtom(StimulationProtocolConfigurationAtomFamily(spcKey));
  const synapseIdxWithFrequencyRange = sscState.findIndex((s) => Array.isArray(s.frequency)) ?? -1;
  const disableStepper = synapseIdxWithFrequencyRange !== -1;

  const [amperageState, dispatch] = useReducer(rangeReducer, {
    ...getInitialAmperageState(DEFAULT_PROTOCOL),
  });

  const protocol =
    spcState.stimulus.stimulus_protocol ?? DEFAULT_STIMULUS_CONFIG.stimulus_protocol!;

  const amplitudes = useMemo(
    () =>
      Array.isArray(spcState.stimulus.amplitudes)
        ? spcState.stimulus.amplitudes
        : [spcState.stimulus.amplitudes],
    [spcState.stimulus.amplitudes]
  );

  useEffect(() => {
    dispatch({ type: 'reset-for-protocol', payload: protocol });
  }, [protocol]);

  useEffect(() => {
    // If user sets a synapse with frequency range, automatically
    // convert amplitude to a constant value
    if (disableStepper) {
      dispatch({
        type: 'constant-value',
        payload: PROTOCOL_DETAILS[protocol].defaults.current.min,
      });
    } else {
      dispatch({ type: 'reset-for-protocol', payload: protocol });
    }
  }, [disableStepper, protocol]);

  useEffect(() => {
    if (isEqual(amperageState.computed, amplitudes)) return;
    updateSPC({
      ...spcState,
      stimulus: {
        ...spcState.stimulus,
        amplitudes: disableStepper ? amperageState.computed[0] : amperageState.computed,
      },
    });
  }, [
    amperageState.computed,
    amperageState.error,
    amplitudes,
    disableStepper,
    spcState,
    updateSPC,
  ]);

  const disableStepperContent = (
    <div className="text-left">
      You can only set one stepper across all the synaptic inputs and in the simulation protocols.
      <div className="mt-8">
        <h4 className="text-primary-3">Active stepper location</h4>
        <p>Synaptic inputs [{synapseIdxWithFrequencyRange + 1}]</p>
      </div>
    </div>
  );
  const amperageCannotBeConstant = (
    <div className="text-left">
      Since no synaptic inputs have a stepper, current should have steps.
    </div>
  );

  return (
    <div className="h-full w-full" id="amperage-settings" data-testid="amperage-settings">
      <div className="mt-8 mb-3 flex items-center justify-between text-left text-base">
        <span className="text-gray-400 uppercase">Amperage</span>
        {amperageState.error && (
          <i className="text-error ml-2 text-base font-light">{amperageState.error}</i>
        )}

        {sscState?.length ? (
          <div className="flex">
            {disableStepper && (
              <CustomPopover message={disableStepperContent} when="hover">
                <div className="text-primary-9 mr-2 text-sm">
                  <WarningFilled className="mr-2" />
                  Stepper already assigned
                </div>
              </CustomPopover>
            )}

            <CustomPopover
              message={disableStepper ? disableStepperContent : amperageCannotBeConstant}
              when="hover"
            >
              <div className="flex">
                <span
                  className={cn('text-primary-9 mr-2 text-sm font-light', {
                    'text-gray-400!': disableStepper,
                  })}
                >
                  Has steps
                </span>
                <Switch value={!disableStepper} disabled onChange={() => {}} />
              </div>
            </CustomPopover>
          </div>
        ) : null}
      </div>
      {synapseIdxWithFrequencyRange !== -1 ? (
        <div className="text-left">
          <InputNumber
            required
            size={breakpoint === 'l' ? 'middle' : 'large'}
            min={-100}
            max={100}
            value={amperageState.start}
            className="text-primary-9 [&_.ant-input-suffix]:text-neutral-3 w-full font-bold"
            onChange={(newVal) => dispatch({ type: 'constant-value', payload: newVal })}
            onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
            aria-label="constant amplitude"
          />
          <span className="text-gray-400">[nA]</span>
        </div>
      ) : (
        <div className="my-4 flex w-full flex-col items-center justify-center gap-3.5">
          <div className="flex w-full items-center justify-center gap-5">
            <div className="flex w-max flex-3/7 flex-col items-start justify-start">
              {label('start', true)}
              <InputNumber
                size={breakpoint === 'l' ? 'middle' : 'large'}
                placeholder="start"
                step={0.1}
                min={-100}
                max={100}
                value={amperageState.start}
                onChange={(newVal) => dispatch({ type: 'start', payload: newVal })}
                className="text-primary-9 [&_.ant-input-suffix]:text-neutral-3 w-full font-bold"
                aria-label="start"
                suffix="[nA]"
                onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
              />
            </div>
            <div className="w-full flex-1/7">
              {label('line', false, 'text-transparent')}
              <hr className="w-full border border-gray-200" />
            </div>
            <div className="flex w-max flex-3/7 flex-col items-start justify-start">
              {label('stop', true)}
              <InputNumber
                size={breakpoint === 'l' ? 'middle' : 'large'}
                placeholder="end"
                step={0.1}
                min={-100}
                max={1000}
                value={amperageState.end}
                onChange={(newVal) => dispatch({ type: 'end', payload: newVal })}
                suffix="[nA]"
                className="text-primary-9 [&_.ant-input-suffix]:text-neutral-3 w-full font-bold"
                onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
              />
            </div>
          </div>
          <div className="flex w-full flex-col items-start justify-start">
            {label('N° of steps', true)}
            <InputNumber
              size={breakpoint === 'l' ? 'middle' : 'large'}
              placeholder="end"
              step={1}
              min={0}
              max={500}
              className="text-primary-9 [&_.ant-input-suffix]:text-neutral-3 w-full font-bold"
              value={amperageState.stepValue}
              onChange={(newVal) => dispatch({ type: 'stepValue', payload: newVal })}
              onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
            />
          </div>
        </div>
      )}
      <StimuliPreviewPlot
        amplitudes={amperageState.computed}
        protocol={amperageState.protocol}
        memodelId={memodelId}
      />
    </div>
  );
}
