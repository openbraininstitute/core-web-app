import { useEffect, useMemo, useCallback } from 'react';
import { InputNumber, Switch } from 'antd';
import { useAtom } from 'jotai';
import isEqual from 'lodash/isEqual';

import { StimuliPreviewPlot } from '@/ui/segments/workflows/simulate/single-neuron/shared/stimuli-preview-plot';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/molecules/tooltip';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  calculateRangeOutput,
  getSessionKey,
  label,
  MAX_AMPERAGE_STEPS,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  DEFAULT_STIMULUS_CONFIG,
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
  PREFIX_AMPERAGE_CONFIGURATION_SESSION_KEY,
  PROTOCOL_DETAILS,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  StimulationConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
  AmperageStateAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

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
  const sscKey = getSessionKey(PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const spcKey = getSessionKey(PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const acKey = getSessionKey(PREFIX_AMPERAGE_CONFIGURATION_SESSION_KEY, sessionId);

  const [sscState] = useAtom(SynaptomeConfigurationAtomFamily(sscKey));
  const [spcState, updateSPC] = useAtom(StimulationConfigurationAtomFamily(spcKey));
  const [amperageState, setAmperageState] = useAtom(AmperageStateAtomFamily(acKey));

  const synapseIdxWithFrequencyRange = sscState.findIndex((s) => Array.isArray(s.frequency)) ?? -1;
  const disableStepper = synapseIdxWithFrequencyRange !== -1;

  const dispatch = useCallback(
    (action: AmperageActionType) => {
      try {
        setAmperageState((currentState) => rangeReducer(currentState, action));
      } catch (error) {
        log('error', 'Error in amperage reducer', error);
      }
    },
    [setAmperageState]
  );

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
    // Initialize state for protocol if it hasn't been set, or protocol changed
    if (amperageState.protocol !== protocol) {
      dispatch({ type: 'reset-for-protocol', payload: protocol });
    } else if (disableStepper) {
      // If user sets a synapse with frequency range, automatically
      // convert amplitude to a constant value
      dispatch({
        type: 'constant-value',
        payload: PROTOCOL_DETAILS[protocol].defaults.current.min,
      });
    }
  }, [protocol, disableStepper, dispatch, amperageState.protocol]);

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
      <div className="mt-3">
        <h4 className="text-primary-4">Active stepper location</h4>
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
        {sscState?.length ? (
          <div className="flex">
            <Tooltip>
              <TooltipProvider>
                <TooltipTrigger>
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
                </TooltipTrigger>
              </TooltipProvider>

              <TooltipContent
                side="bottom"
                sideOffset={5}
                className="text-primary-9 flex max-w-60 flex-col items-center justify-center gap-2 bg-white text-base shadow-lg"
              >
                {disableStepper ? disableStepperContent : amperageCannotBeConstant}
              </TooltipContent>
            </Tooltip>
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
                className="[&_input]:text-primary-9! [&_.ant-input-suffix]:text-neutral-3 w-full font-bold"
                aria-label="start"
                suffix="[nA]"
                onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
                status={
                  amperageState.error &&
                  amperageState.error.includes('Start should be less than end')
                    ? 'error'
                    : ''
                }
              />
              {amperageState.error &&
                amperageState.error.includes('Start should be less than end') && (
                  <div className="mt-1 text-xs text-red-500">{amperageState.error}</div>
                )}
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
                className="[&_input]:text-primary-9! [&_.ant-input-suffix]:text-neutral-2! w-full font-bold"
                onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
                status={
                  amperageState.error &&
                  amperageState.error.includes('End should be greater than start')
                    ? 'error'
                    : ''
                }
              />
              {amperageState.error &&
                amperageState.error.includes('End should be greater than start') && (
                  <div className="mt-1 text-xs text-red-500">{amperageState.error}</div>
                )}
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
              className="[&_input]:text-primary-9! [&_.ant-input-suffix]:text-neutral-2! w-full font-bold"
              value={amperageState.stepValue}
              onChange={(newVal) => dispatch({ type: 'stepValue', payload: newVal })}
              onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
              status={
                amperageState.error && amperageState.error.includes('maximum of') ? 'error' : ''
              }
            />
            {amperageState.error && amperageState.error.includes('maximum of') && (
              <div className="mt-1 text-xs text-red-500">{amperageState.error}</div>
            )}
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
