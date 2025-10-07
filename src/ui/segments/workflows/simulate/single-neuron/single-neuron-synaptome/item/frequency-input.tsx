'use client';

import { WarningFilled } from '@ant-design/icons';
import { Form, InputNumber } from 'antd';
import { useAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

import { PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { FrequencyInputConfigurationAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/molecules/tooltip';
import { ValidationError } from '@/ui/hooks/use-storage-atom-with-validation';
import {
  calculateRangeOutput,
  getSessionKey,
  label,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Switch } from '@/components/common/Switch';
import { isBrowser } from '@/utils/environment';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import type { UpdateSynapseSimulationProperty } from '@/types/small-scale-simulator/single-neuron';

const defaultStepFrequencies = { start: 5, stop: 20, step: 3 };

export function FrequencyFormItem({
  index,
  formName,
  onChange,
  simIndexWithVariableFrequency,
  sessionId,
}: {
  index: number;
  formName: string;
  simIndexWithVariableFrequency: number;
  sessionId: string;
  onChange: (change: UpdateSynapseSimulationProperty) => void;
}) {
  const breakpoint = useDefaultBreakpoint();
  const frequencyKey = getSessionKey(
    PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY,
    `${sessionId}_${index}`
  );
  const [frequencyConfig, setFrequencyConfig] = useAtom(
    FrequencyInputConfigurationAtomFamily(frequencyKey)
  );

  const { constantOrSteps, stepFrequencyState } = frequencyConfig;
  const [validationError, setValidationError] = useState<{
    message: string;
    path: PropertyKey[];
  } | null>(null);

  const disableFrequencyStepper =
    simIndexWithVariableFrequency !== -1 && simIndexWithVariableFrequency !== index;

  useEffect(() => {
    if (disableFrequencyStepper && constantOrSteps === 'step') {
      setFrequencyConfig({
        constantOrSteps: 'constant',
        stepFrequencyState: null,
      });
      onChange({
        id: index,
        key: 'frequency',
        newValue: 20,
      });
    }
  }, [disableFrequencyStepper, constantOrSteps, index, onChange, setFrequencyConfig]);

  const onSwitchChange = (hasSteps: boolean) => {
    if (hasSteps) {
      const newStepState = { ...defaultStepFrequencies };
      setFrequencyConfig({
        constantOrSteps: 'step',
        stepFrequencyState: newStepState,
      });
      try {
        onChange({
          id: index,
          key: 'frequency',
          newValue: calculateRangeOutput(newStepState.start, newStepState.stop, newStepState.step),
        });
      } catch (error) {
        log('error', 'Error calculating frequency range:', error);
        onChange({
          id: index,
          key: 'frequency',
          newValue: [],
        });
      }
    } else {
      setFrequencyConfig({
        constantOrSteps: 'constant',
        stepFrequencyState: null,
      });
      onChange({
        id: index,
        key: 'frequency',
        newValue: 20,
      });
      if (isBrowser()) {
        sessionStorage.removeItem(frequencyKey);
      }
    }
  };

  const onFrequencyStepChange = (start: number, stop: number, step: number) => {
    const newStepState = { start, stop, step };
    const newConfig = {
      constantOrSteps: 'step' as const,
      stepFrequencyState: newStepState,
    };

    let newValue: number[] = [];
    try {
      setFrequencyConfig(newConfig);
      setValidationError(null);
      newValue = calculateRangeOutput(start, stop, step);
      onChange({
        id: index,
        key: 'frequency',
        newValue,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        setValidationError({
          message: error.issues?.at(0)?.message ?? '',
          path: error.issues?.at(0)?.path ?? [],
        });
      } else {
        setValidationError({
          message: error instanceof Error ? error.message : 'Unknown error',
          path: ['form'],
        });
      }
      log('error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const calculatedFrequencies = useMemo(() => {
    if (!stepFrequencyState) {
      return null;
    }

    try {
      const stepFrequencies = calculateRangeOutput(
        stepFrequencyState.start,
        stepFrequencyState.stop,
        stepFrequencyState.step
      );
      return stepFrequencies;
    } catch (error) {
      log('error', 'Error calculating frequencies for display:', error);
      return [];
    }
  }, [stepFrequencyState]);

  const disableStepperContent = (
    <div className="text-left">
      You can only set one stepper across all the synaptic inputs and in the simulation protocols.
      <div className="mt-3">
        <h4 className="text-primary-4">Active stepper location</h4>
        <p>Synaptic inputs [{simIndexWithVariableFrequency + 1}]</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        {label('Frequency', false, cn('pb-0.5', { 'text-lg': constantOrSteps === 'step' }))}
        <div className="flex">
          {disableFrequencyStepper && (
            <Tooltip>
              <TooltipProvider>
                <TooltipTrigger>
                  <div className="text-primary-9 hover:text-primary-7 mr-2 text-sm">
                    <WarningFilled className="mr-2" />
                    Stepper already assigned
                  </div>
                </TooltipTrigger>
              </TooltipProvider>

              <TooltipContent
                side="bottom"
                sideOffset={5}
                className="text-primary-9 flex max-w-60 flex-col items-center justify-center gap-2 bg-white text-base shadow-lg"
                arrowClassName="bg-white"
              >
                {disableStepperContent}
              </TooltipContent>
            </Tooltip>
          )}

          <span
            className={cn(
              'text-primary-9 mr-2 text-sm font-light',
              disableFrequencyStepper && 'text-gray-400!'
            )}
          >
            Has steps
          </span>
          <Switch
            value={constantOrSteps === 'step'}
            onChange={(hasSteps) => onSwitchChange(hasSteps)}
            disabled={disableFrequencyStepper}
          />
        </div>
      </div>

      <div className="text-left">
        {constantOrSteps === 'constant' ? (
          <Form.Item
            name={[formName, 'frequency']}
            rules={[
              {
                required: true,
                message:
                  'Synapse frequency must be a single positive number (Hz) or a list of positive numbers if steps are used',
              },
            ]}
          >
            <InputNumber
              size={breakpoint === 'l' ? 'middle' : 'large'}
              className={cn(
                'border-neutral-2! [&_.ant-input-number-input]:text-primary-8! flex w-full items-center justify-between gap-2 rounded-sm! bg-white font-bold! [&_input]:placeholder:!font-light',
                '[&_.ant-input-number-suffix]:text-neutral-3 [&_.ant-input-number-suffix]:pointer-events-auto'
              )}
              step={0.01}
              min={0}
              onChange={(newValue) =>
                onChange({
                  id: index,
                  key: 'frequency',
                  newValue,
                })
              }
              suffix={<span className="normal-case">[hz]</span>}
            />
          </Form.Item>
        ) : (
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="flex items-start text-sm">
              <div className="flex h-[91px] flex-col items-start">
                {label('Start', false, 'pb-0.5')}
                <InputNumber
                  defaultValue={stepFrequencyState!.start}
                  placeholder="start"
                  size={breakpoint === 'l' ? 'middle' : 'large'}
                  className={cn(
                    'border-neutral-2! [&_.ant-input-number-input]:text-primary-8! flex w-full items-center justify-between gap-2 rounded-sm! bg-white font-bold! [&_input]:placeholder:!font-light',
                    '[&_.ant-input-number-suffix]:text-neutral-3 [&_.ant-input-number-suffix]:pointer-events-auto'
                  )}
                  min={0}
                  step={1}
                  onChange={(v) =>
                    onFrequencyStepChange(v!, stepFrequencyState?.stop!, stepFrequencyState?.step!)
                  }
                  suffix={<span className="normal-case">[hz]</span>}
                  status={validationError && validationError.path.includes('start') ? 'error' : ''}
                />
                {validationError && validationError.path.includes('start') && (
                  <div className="mt-1 text-xs text-red-500">{validationError.message}</div>
                )}
              </div>
              <div className="flex h-[80px] flex-col items-center justify-center">
                <hr className="mx-4 w-8 border border-gray-200" />
              </div>
              <div className="flex h-[91px] flex-col items-start">
                {label('stop', false, 'pb-0.5')}
                <InputNumber
                  defaultValue={stepFrequencyState!.stop}
                  size={breakpoint === 'l' ? 'middle' : 'large'}
                  className={cn(
                    'border-neutral-2! [&_.ant-input-number-input]:text-primary-8! flex w-full items-center justify-between gap-2 rounded-sm! bg-white font-bold! [&_input]:placeholder:!font-light',
                    '[&_.ant-input-number-suffix]:text-neutral-3 [&_.ant-input-number-suffix]:pointer-events-auto'
                  )}
                  min={0}
                  step={1}
                  placeholder="end"
                  onChange={(v) =>
                    onFrequencyStepChange(stepFrequencyState?.start!, v!, stepFrequencyState?.step!)
                  }
                  suffix={<span className="normal-case">[hz]</span>}
                  status={validationError && validationError.path.includes('stop') ? 'error' : ''}
                />
                {validationError && validationError.path.includes('stop') && (
                  <div className="mt-1 text-xs text-red-500">{validationError.message}</div>
                )}
              </div>
            </div>
            <div className="flex h-[91px] flex-col items-start text-sm">
              {label('N° of steps', false, 'pb-0.5')}
              <InputNumber
                defaultValue={stepFrequencyState!.step}
                size={breakpoint === 'l' ? 'middle' : 'large'}
                className={cn(
                  'border-neutral-2! [&_.ant-input-number-input]:text-primary-8! flex w-full items-center justify-between gap-2 rounded-sm! bg-white font-bold! [&_input]:placeholder:!font-light',
                  '[&_.ant-input-number-suffix]:text-neutral-3 [&_.ant-input-number-suffix]:pointer-events-auto'
                )}
                step={1}
                min={1}
                placeholder="step size"
                onChange={(v) =>
                  onFrequencyStepChange(stepFrequencyState?.start!, stepFrequencyState?.stop!, v!)
                }
                status={validationError && validationError.path.includes('step') ? 'error' : ''}
              />
              {validationError && validationError.path.includes('step') && (
                <div className="mt-1 text-xs text-red-500">{validationError.message}</div>
              )}
            </div>
          </div>
        )}
        {validationError && validationError.path.includes('form') && (
          <div className="mt-1 text-xs text-red-500">{validationError.message}</div>
        )}
        {calculatedFrequencies && (
          <div className="mt-4 max-w-full">
            {label('output values', false, 'pb-2')}
            <div className="flex w-full flex-wrap items-start justify-start gap-x-0.5 gap-y-3">
              {calculatedFrequencies.sort().map((f) => (
                <div
                  className="border-neutral-2 text-primary-8 mx-2 rounded-full border bg-white px-2 text-base shadow-md hover:font-bold"
                  key={f}
                >
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
