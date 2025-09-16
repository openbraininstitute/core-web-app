import { WarningFilled } from '@ant-design/icons';
import { useEffect, useReducer } from 'react';
import { useAtomValue } from 'jotai';
import { InputNumber } from 'antd';

import isEqual from 'lodash/isEqual';
import dynamic from 'next/dynamic';

import { synaptomeSimulationConfigAtom } from '@/state/simulate/categories/synaptome-simulation-config';
import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { useCurrentInjectionSimulationConfig } from '@/state/simulate/categories';
import { StimulusModule } from '@/types/small-scale-simulator/single-neuron';
import { secNamesAtom } from '@/state/simulate/single-neuron';
import { Switch } from '@/components/common/Switch';
import {
  calculateRangeOutput,
  DEFAULT_PROTOCOL,
  MAX_AMPERAGE_STEPS,
  PROTOCOL_DETAILS,
} from '@/constants/simulate/single-neuron';
import { classNames } from '@/util/utils';

const StimuliPreviewPlot = dynamic(
  () =>
    import('@/features/entities/neuron-simulation/experiment/visualization/stimuli-preview-plot'),
  {
    ssr: false,
  }
);

const getInitialAmperageState = (protocol: StimulusModule) => {
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

type AmperageActionType = {
  type:
    | 'start'
    | 'end'
    | 'stepValue'
    | 'checkConsistency'
    | 'reset-for-protocol'
    | 'constant-value';
  payload: any;
};

type AmperageStateType = {
  protocol: StimulusModule;
  start: number;
  end: number;
  stepValue: number;
  computed: number[];
  error: null | string;
};

type Props = {
  stimulationId: number;
  amplitudes: number[] | number;
  modelId: string;
  protocol: StimulusModule;
  projectId: string;
  virtualLabId: string;
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

export default function AmperageRange({
  amplitudes,
  stimulationId,
  modelId,
  protocol,
  projectId,
  virtualLabId,
}: Props) {
  const morphologySections = useAtomValue(secNamesAtom);
  const synapsesConfig = useAtomValue(synaptomeSimulationConfigAtom);

  const synapseIdxWithFrequencyRange =
    synapsesConfig?.findIndex((synConfig) => Array.isArray(synConfig.frequency)) ?? -1;

  const disableStepper = synapseIdxWithFrequencyRange !== -1;
  const [amperageState, dispatch] = useReducer(rangeReducer, {
    ...getInitialAmperageState(DEFAULT_PROTOCOL),
  });

  const { setAmplitudes } = useCurrentInjectionSimulationConfig();
  useEffect(() => {
    if (isEqual(amperageState.computed, amplitudes)) return;
    setAmplitudes({
      id: stimulationId,
      newValue: disableStepper ? amperageState.computed[0] : amperageState.computed,
    });
  }, [
    amperageState.computed,
    amperageState.error,
    amplitudes,
    setAmplitudes,
    stimulationId,
    disableStepper,
  ]);

  useEffect(() => {
    dispatch({ type: 'reset-for-protocol', payload: protocol });
  }, [protocol]);

  useEffect(() => {
    // If user sets a synapse with frequency range, automatically convert amplitude to a constant value
    if (disableStepper) {
      dispatch({
        type: 'constant-value',
        payload: PROTOCOL_DETAILS[protocol].defaults.current.min,
      });
    } else {
      dispatch({ type: 'reset-for-protocol', payload: protocol });
    }
  }, [disableStepper, protocol]);

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
    <>
      <div className="mt-8 mb-3 flex items-center justify-between text-left text-base">
        <span className="ml-2 text-gray-400 uppercase">Amperage</span>
        {amperageState.error && (
          <i className="text-error ml-2 text-base font-light">{amperageState.error}</i>
        )}

        {synapsesConfig?.length ? (
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
                  className={classNames(
                    'text-primary-9 mr-2 text-sm font-light',
                    disableStepper && 'text-gray-400!'
                  )}
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
            placeholder="start"
            min={-100}
            max={100}
            value={amperageState.start}
            size="small"
            className="[&_.ant-input-number-input]:text-primary-8! mx-2 h-8 min-w-18 [&_.ant-input-number-input]:pr-8! [&_.ant-input-number-input]:text-right! [&_.ant-input-number-input]:font-bold!"
            onChange={(newVal) => dispatch({ type: 'constant-value', payload: newVal })}
            onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
            aria-label="constant amplitude"
          />
          <span className="text-gray-400">[nA]</span>
        </div>
      ) : (
        <div className="ml-2 flex items-center justify-between gap-6 text-base">
          <div className="flex items-center">
            <div>
              <span className="text-primary-8 font-bold">Start</span>
              <InputNumber
                placeholder="start"
                step={0.1}
                min={-100}
                max={100}
                size="small"
                className="[&_.ant-input-number-input]:text-primary-8! mx-2 h-8 min-w-18 [&_.ant-input-number-input]:pr-8! [&_.ant-input-number-input]:text-right! [&_.ant-input-number-input]:font-bold!"
                value={amperageState.start}
                onChange={(newVal) => dispatch({ type: 'start', payload: newVal })}
                onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
                aria-label="start"
              />
              <span className="text-gray-400">[nA]</span>
            </div>
            <hr className="mx-4 w-8 border border-gray-200" />
            <div>
              <span className="text-primary-8 font-bold">Stop</span>
              <InputNumber
                placeholder="end"
                step={0.1}
                min={-100}
                max={1000}
                size="small"
                className="[&_.ant-input-number-input]:text-primary-8! mx-2 h-8 min-w-18 [&_.ant-input-number-input]:pr-8! [&_.ant-input-number-input]:text-right! [&_.ant-input-number-input]:font-bold!"
                value={amperageState.end}
                onChange={(newVal) => dispatch({ type: 'end', payload: newVal })}
                onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
              />
              <span className="text-gray-400">[nA]</span>
            </div>
          </div>

          <div>
            <span className="text-primary-8 font-bold">N° of steps</span>
            <InputNumber
              placeholder="step size"
              step={1}
              min={0}
              max={500}
              size="small"
              className="[&_.ant-input-number-input]:text-primary-8! mx-2 h-8 min-w-10 [&_.ant-input-number-handler-wrap]:opacity-100! [&_.ant-input-number-input]:pr-8! [&_.ant-input-number-input]:text-right! [&_.ant-input-number-input]:font-bold!"
              value={amperageState.stepValue}
              onChange={(newVal) => dispatch({ type: 'stepValue', payload: newVal })}
              onBlur={() => dispatch({ type: 'checkConsistency', payload: null })}
            />
          </div>
        </div>
      )}

      {!amperageState.error && Boolean(morphologySections.length) && (
        <StimuliPreviewPlot
          amplitudes={amperageState.computed}
          protocol={amperageState.protocol}
          modelId={modelId}
          projectId={projectId}
          virtualLabId={virtualLabId}
        />
      )}
    </>
  );
}
