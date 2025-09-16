'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { ConfigProvider, Form } from 'antd';
import { useResetAtom } from 'jotai/utils';

import SingleNeuron from '@/features/entities/neuron-simulation/experiment/containers/single-neuron';
import Synaptome from '@/features/entities/neuron-simulation/experiment/containers/synaptome';

import { recordingSourceForSimulationAtom } from '@/state/simulate/categories/recording-source-for-simulation';
import { currentInjectionSimulationConfigAtom } from '@/state/simulate/categories/current-injection-simulation';
import { synaptomeSimulationConfigAtom } from '@/state/simulate/categories/synaptome-simulation-config';
import { simulationExperimentalSetupAtom } from '@/state/simulate/categories/simulation-conditions';
import { defaultSteps, simulateStepTrackerAtom } from '@/state/simulate/single-neuron';
import { resetSimulationAtom } from '@/state/simulate/single-neuron-setter';

import type { SingleNeuronSynaptomePayload } from '@/features/entities/neuron-simulation/experiment/containers/synaptome';
import type { SimulationConfiguration } from '@/types/small-scale-simulator/single-neuron';
import type { SimulationStepTitle } from '@/types/small-scale-simulator/common';

type SynaptomeProps = {
  type: 'synaptome-simulation';
  payload: SingleNeuronSynaptomePayload;
};

type SingleNeuronProps = {
  type: 'single-neuron-simulation';
  payload?: never;
};

type Props = SynaptomeProps | SingleNeuronProps;

type ErrorField = {
  name: Array<string>;
  errors: Array<string>;
  warning: Array<string>;
};

function checkStepError(errorFields: Array<ErrorField>): Array<SimulationStepTitle> {
  const conditions = ['celsius', 'vinit', 'hypamp', 'seed', 'time_step', 'max_time'];
  const recoding = ['record_from'];
  const stimulation = ['inject_to', 'stimulus_type', 'stimulus_protocol', 'param_values'];
  const synapticInputs = ['id', 'delay', 'duration', 'frequency', 'weight_scalar'];
  const stepsHasErrors: Array<SimulationStepTitle> = [];
  errorFields.forEach((elt) => {
    const hasErrors = elt.errors.length > 0;
    const experimentalSetupErrors = elt.name.some((v) => conditions.includes(v));
    const recordingErrors = elt.name.some((v) => recoding.includes(v));
    const stimulationProtocolErrors = elt.name.some((v) => stimulation.includes(v));
    const synapticInputsErrors = elt.name.some((v) => synapticInputs.includes(v));
    if (hasErrors) {
      if (experimentalSetupErrors) stepsHasErrors.push('Experimental setup');
      if (synapticInputsErrors) stepsHasErrors.push('Synaptic inputs');
      if (stimulationProtocolErrors) stepsHasErrors.push('Stimulation protocol');
      if (recordingErrors) stepsHasErrors.push('Recording');
    }
  });

  return stepsHasErrors;
}

export default function Container({ type, payload }: Props) {
  const [form] = Form.useForm<SimulationConfiguration>();
  const [disableForm, setDisableSubmit] = useState(false);
  const recordFromConfig = useAtomValue(recordingSourceForSimulationAtom);
  const currentInjectionConfig = useAtomValue(currentInjectionSimulationConfigAtom);
  const synaptomeConfig = useAtomValue(synaptomeSimulationConfigAtom);
  const resetSimulation = useResetAtom(resetSimulationAtom);

  const conditionsConfig = useAtomValue(simulationExperimentalSetupAtom);

  const initialValues: SimulationConfiguration = useMemo(
    () => ({
      record_from: recordFromConfig,
      current_injection: currentInjectionConfig,
      conditions: conditionsConfig,
      ...(type === 'synaptome-simulation' ? { synapses: synaptomeConfig ?? undefined } : {}),
    }),
    [currentInjectionConfig, recordFromConfig, synaptomeConfig, conditionsConfig, type]
  );

  const [{ steps, current: currentSimulationStep }, updateSimulationStepsStatus] =
    useAtom(simulateStepTrackerAtom);

  const onValuesChange = async () => {
    try {
      await form.validateFields({ recursive: true });
    } catch (error) {
      const errorObject = error as { errorFields: Array<any> };
      if (errorObject.errorFields.length) {
        const list = checkStepError(errorObject.errorFields);
        setDisableSubmit(true);
        updateSimulationStepsStatus({
          current: currentSimulationStep,
          steps: steps.map((s) => {
            if (list.includes(s.title)) {
              return {
                title: s.title,
                status: 'error',
              };
            }
            return {
              title: s.title,
              status: s.status,
            };
          }),
        });
      } else {
        setDisableSubmit(false);
        updateSimulationStepsStatus({
          steps: defaultSteps,
          current: currentSimulationStep,
        });
      }
    }
  };

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  useEffect(() => {
    return resetSimulation;
  }, [resetSimulation]);

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden bg-white">
      <ConfigProvider theme={{ hashed: false, token: { borderRadius: 0 } }}>
        <Form
          form={form}
          name="simulation-configuration"
          autoComplete="off"
          layout="vertical"
          className="h-[calc(100%-46.5px)]"
          initialValues={{
            ...initialValues,
            name: undefined,
            description: undefined,
          }}
          onValuesChange={onValuesChange}
          requiredMark={false}
        >
          {type === 'single-neuron-simulation' && <SingleNeuron disable={disableForm} />}
          {type === 'synaptome-simulation' && <Synaptome disable={disableForm} payload={payload} />}
        </Form>
      </ConfigProvider>
    </div>
  );
}
