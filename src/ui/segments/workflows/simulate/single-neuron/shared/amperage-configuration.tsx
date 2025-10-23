import { useEffect, useMemo, useCallback } from 'react';
import { InputNumber, Switch, Form } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import isEqual from 'es-toolkit/compat/isEqual';
import isNil from 'es-toolkit/compat/isNil';

import { StimuliPreviewPlot } from '@/ui/segments/workflows/simulate/single-neuron/shared/stimuli-preview-plot';
import { AmperageBaseSchema } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/molecules/tooltip';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  calculateRangeOutput,
  createZodValidator,
  getSessionKey,
  label,
  MAX_AMPERAGE_STEPS,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  DEFAULT_STIMULUS_CONFIG,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
  AMPERAGE_CONFIGURATION_SESSION_KEY,
  PROTOCOL_DETAILS,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  StimulationConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
  AmperageStateAtomFamily,
  simulationStatusAtomFamily,
  SimulationStatus,
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
      if (isNil(newVal)) {
        newState.error = 'Start value is required';
      } else {
        newState.error = null;
      }
      break;
    case 'end':
      newState.end = newVal;
      if (isNil(newVal)) {
        newState.error = 'End value is required';
      } else {
        newState.error = null;
      }
      break;
    case 'stepValue':
      if (isNil(newVal)) {
        newState.stepValue = newVal!;
        newState.error = 'Step value is required';
        break;
      }
      if (newVal < 0) {
        newState.stepValue = 0;
        break;
      }
      newState.stepValue = newVal;
      newState.error = null;
      break;
    case 'reset-for-protocol':
      Object.assign(newState, { ...getInitialAmperageState(newVal) });
      break;
    case 'constant-value':
      // handle null/undefined values gracefully - let Form validation handle the error display
      if (isNil(newVal)) {
        newState.start = newVal!;
        newState.end = newVal!;
        newState.computed = [];
        newState.error = 'Amperage value is required';
        break;
      }
      if (typeof newVal !== 'number') {
        newState.start = newVal;
        newState.end = newVal;
        newState.computed = [];
        newState.error = 'Amperage value must be a valid number';
        break;
      }
      newState.start = newVal;
      newState.end = newVal;
      newState.stepValue = 1;
      try {
        newState.computed = calculateRangeOutput(newState.start, newState.end, newState.stepValue);
        newState.error = null;
      } catch (error) {
        log('error', 'Error calculating constant amperage:', error);
        newState.computed = [];
        newState.error = 'Error calculating amperage value';
      }
      break;
    case 'checkConsistency':
      if (isNil(state.start)) {
        newState.error = 'Start value is required';
        break;
      }
      if (isNil(state.end)) {
        newState.error = 'End value is required';
        break;
      }
      if (isNil(state.stepValue)) {
        newState.error = 'Step value is required';
        break;
      }

      if (
        typeof state.start !== 'number' ||
        typeof state.end !== 'number' ||
        typeof state.stepValue !== 'number'
      ) {
        newState.error = 'All values must be valid numbers';
        break;
      }

      if (state.start > state.end) {
        newState.error = 'Start should be less than end';
        break;
      } else if (state.end < state.start) {
        newState.error = 'End should be greater than start';
        break;
      }

      try {
        newState.computed = calculateRangeOutput(newState.start, newState.end, newState.stepValue);

        if (newState.computed.length > MAX_AMPERAGE_STEPS) {
          newState.error = `There should be a maximum of ${MAX_AMPERAGE_STEPS} amperages in a simulation. Currently there are ${newState.computed.length}`;
        } else {
          newState.error = null;
        }
      } catch (error) {
        log('error', 'Error calculating range output:', error);
        newState.error = 'Error calculating amperage values';
        newState.computed = [];
      }
      break;
    default:
      throw new Error('Action not found', action.type);
  }
  return newState;
}

export function AmperageConfiguration({ sessionId, memodelId }: Props) {
  const [form] = Form.useForm();
  const breakpoint = useDefaultBreakpoint();
  const sscKey = getSessionKey(SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const spcKey = getSessionKey(STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const acKey = getSessionKey(AMPERAGE_CONFIGURATION_SESSION_KEY, sessionId);

  const [sscState] = useAtom(SynaptomeConfigurationAtomFamily(sscKey));
  const [spcState, updateSPC] = useAtom(StimulationConfigurationAtomFamily(spcKey));
  const [amperageState, setAmperageState] = useAtom(AmperageStateAtomFamily(acKey));

  const synapseIdxWithFrequencyRange = sscState.findIndex((s) => Array.isArray(s.frequency)) ?? -1;
  const disableStepper = synapseIdxWithFrequencyRange !== -1;
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));

  const disableForm =
    simulationStatus?.status === SimulationStatus.LAUNCHED ||
    simulationStatus?.status === SimulationStatus.SAVING;

  const dispatch = useCallback(
    (action: AmperageActionType) => {
      try {
        setAmperageState((currentState) => {
          try {
            return rangeReducer(currentState, action);
          } catch (error) {
            log('error', 'Error in amperage reducer for action:', action.type, error);
            // return current state with error set to prevent crashes
            return {
              ...currentState,
              error: 'An unexpected error occurred while processing amperage values',
            };
          }
        });
      } catch (error) {
        log('error', 'Critical error in amperage dispatch', error);
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

  // sync form values with atom state
  useEffect(() => {
    form.setFieldsValue({
      constantAmperage: amperageState.start,
      startAmperage: amperageState.start,
      endAmperage: amperageState.end,
      stepValue: amperageState.stepValue,
    });
  }, [form, amperageState.start, amperageState.end, amperageState.stepValue]);

  // clear validation errors when switching between modes
  useEffect(() => {
    if (disableStepper) {
      // frequency mode: clear step field errors
      form.setFields([
        { name: 'startAmperage', errors: [] },
        { name: 'endAmperage', errors: [] },
        { name: 'stepValue', errors: [] },
      ]);
    } else {
      // step mode: clear constant amperage errors
      form.setFields([{ name: 'constantAmperage', errors: [] }]);
    }
  }, [form, disableStepper]);

  useEffect(() => {
    // initialize state for protocol if it hasn't been set, or protocol changed
    if (amperageState.protocol !== protocol) {
      dispatch({ type: 'reset-for-protocol', payload: protocol });
    } else if (disableStepper) {
      // if user sets a synapse with frequency range, automatically
      // convert amplitude to a constant value
      dispatch({
        type: 'constant-value',
        payload: PROTOCOL_DETAILS[protocol].defaults.current.min,
      });
    }
  }, [protocol, disableStepper, dispatch, amperageState.protocol]);

  useEffect(() => {
    if (isEqual(amperageState.computed, amplitudes)) return;

    // don't update if computed values are empty or invalid
    if (!amperageState.computed.length || amperageState.error) {
      return;
    }

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
                arrowClassName="bg-white"
              >
                {disableStepper ? disableStepperContent : amperageCannotBeConstant}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </div>
      <Form
        form={form}
        layout="vertical"
        className="[&_.ant-form-item-explain-error]:text-sm!"
        disabled={disableForm}
      >
        {synapseIdxWithFrequencyRange !== -1 ? (
          <div className="text-left">
            <Form.Item
              name="constantAmperage"
              rules={
                disableStepper
                  ? [
                      {
                        validator: createZodValidator(
                          AmperageBaseSchema.shape.start,
                          'Amperage value is required'
                        ),
                      },
                    ]
                  : [] // No validation when stepper is enabled
              }
              validateStatus={amperageState.error ? 'error' : ''}
              help={amperageState.error}
            >
              <InputNumber
                size={breakpoint === 'l' ? 'middle' : 'large'}
                min={-100}
                max={100}
                value={amperageState.start}
                className="text-primary-9 [&_.ant-input-suffix]:text-neutral-3 w-full font-bold"
                onChange={(newVal) => {
                  // always dispatch, let the reducer handle null/undefined values gracefully
                  dispatch({ type: 'constant-value', payload: newVal });
                }}
                onBlur={() => {
                  // only check consistency if we have valid values
                  if (!isNil(amperageState.start)) {
                    dispatch({ type: 'checkConsistency', payload: null });
                  }
                }}
                aria-label="constant amplitude"
                placeholder="Enter amperage value"
              />
            </Form.Item>
            <span className="text-gray-400">[nA]</span>
          </div>
        ) : (
          <div className="my-4 flex w-full flex-col items-center justify-center gap-3.5">
            <div className="flex w-full items-center justify-center gap-3">
              <div className="flex w-max min-w-36 flex-col items-start justify-start">
                <Form.Item
                  label={label('start', true)}
                  name="startAmperage"
                  // no validation when frequency stepper is enabled
                  rules={
                    !disableStepper
                      ? [
                          {
                            validator: createZodValidator(
                              AmperageBaseSchema.shape.start,
                              'Start value is required'
                            ),
                          },
                        ]
                      : []
                  }
                  validateStatus={
                    amperageState.error &&
                    (amperageState.error.includes('Start') ||
                      amperageState.error.includes('Start value is required'))
                      ? 'error'
                      : ''
                  }
                  help={
                    amperageState.error &&
                    (amperageState.error.includes('Start') ||
                      amperageState.error.includes('Start value is required'))
                      ? amperageState.error
                      : ''
                  }
                >
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
                    onBlur={() => {
                      // only check consistency if we have valid values
                      if (
                        !isNil(amperageState.start) &&
                        !isNil(amperageState.end) &&
                        !isNil(amperageState.stepValue)
                      ) {
                        dispatch({ type: 'checkConsistency', payload: null });
                      }
                    }}
                  />
                </Form.Item>
              </div>
              <div className="w-full grow">
                {label('line', false, 'text-transparent sr-only')}
                <hr className="w-full border border-gray-200" />
              </div>
              <div className="flex w-max min-w-36 flex-col items-start justify-end">
                <Form.Item
                  label={label('stop', true)}
                  name="endAmperage"
                  className="self-end"
                  rules={
                    !disableStepper
                      ? [
                          {
                            validator: createZodValidator(
                              AmperageBaseSchema.shape.end,
                              'End value is required'
                            ),
                          },
                        ]
                      : [] // No validation when frequency stepper is enabled
                  }
                  validateStatus={
                    amperageState.error &&
                    (amperageState.error.includes('End') ||
                      amperageState.error.includes('End value is required'))
                      ? 'error'
                      : ''
                  }
                  help={
                    amperageState.error &&
                    (amperageState.error.includes('End') ||
                      amperageState.error.includes('End value is required'))
                      ? amperageState.error
                      : ''
                  }
                >
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
                    onBlur={() => {
                      if (
                        !isNil(amperageState.start) &&
                        !isNil(amperageState.end) &&
                        !isNil(amperageState.stepValue)
                      ) {
                        dispatch({ type: 'checkConsistency', payload: null });
                      }
                    }}
                  />
                </Form.Item>
              </div>
            </div>
            <div className="flex w-full flex-col items-start justify-start">
              <Form.Item
                label={label('N° of steps', true)}
                name="stepValue"
                rules={
                  !disableStepper
                    ? [
                        {
                          validator: createZodValidator(
                            AmperageBaseSchema.shape.stepValue,
                            'Step value is required'
                          ),
                        },
                      ]
                    : [] // No validation when frequency stepper is enabled
                }
                validateStatus={
                  amperageState.error &&
                  (amperageState.error.includes('Step') ||
                    amperageState.error.includes('maximum of'))
                    ? 'error'
                    : ''
                }
                help={
                  amperageState.error &&
                  (amperageState.error.includes('Step') ||
                    amperageState.error.includes('maximum of'))
                    ? amperageState.error
                    : ''
                }
              >
                <InputNumber
                  size={breakpoint === 'l' ? 'middle' : 'large'}
                  placeholder="number of steps"
                  step={1}
                  min={1}
                  max={500}
                  className="[&_input]:text-primary-9! [&_.ant-input-suffix]:text-neutral-2! w-full font-bold"
                  value={amperageState.stepValue}
                  onChange={(newVal) => dispatch({ type: 'stepValue', payload: newVal })}
                  onBlur={() => {
                    // Only check consistency if we have valid values
                    if (
                      !isNil(amperageState.start) &&
                      !isNil(amperageState.end) &&
                      !isNil(amperageState.stepValue)
                    ) {
                      dispatch({ type: 'checkConsistency', payload: null });
                    }
                  }}
                />
              </Form.Item>
            </div>
          </div>
        )}
        <StimuliPreviewPlot
          amplitudes={amperageState.computed}
          protocol={amperageState.protocol}
          memodelId={memodelId}
        />
      </Form>
    </div>
  );
}
