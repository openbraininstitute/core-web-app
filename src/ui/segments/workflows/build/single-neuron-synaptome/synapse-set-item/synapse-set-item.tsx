'use client';

import { Form } from 'antd';
import findIndex from 'es-toolkit/compat/findIndex';
import groupBy from 'es-toolkit/compat/groupBy';
import { useAtomValue } from 'jotai';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  SingleNeuronSynaptomeConfigurationSchema,
  type TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { SECTION_TARGET_MAPPING } from '@/features/entities/single-neuron-synaptome/build/elements/constants';
import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { neuronSectionNamesAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import { ButtonApplyChanges } from './button-apply-changes';
import { useApplyChangesHandler } from './hooks';
import { InputName } from './inputs/input-name';
import { InputSeed } from './inputs/input-seed';
import { InputSynapseCount } from './inputs/input-synapse-count';
import { InputTarget } from './inputs/input-target';
import { InputType } from './inputs/input-type';
import { SynapsesFilter } from './synapses-filter';

type Props = {
  sessionId: string;
};

export function SynapseSet({ sessionId }: Props) {
  const [form] = Form.useForm();
  const params = useSearchParams();
  const secNames = useAtomValue(neuronSectionNamesAtomFamily(sessionId));
  const [isFormValid, setIsFormValid] = useState(false);
  const [visualizeLoading, setVisualizeLoading] = useState(false);
  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const setId = params.get('set');
  const synapses = sessionValue?.synapseSets;
  const config = setId ? synapses?.get(setId) : undefined;

  const configRef = useRef(config);
  const previousSetIdRef = useRef<string | null>(null);

  const groupedSections = Object.keys(
    groupBy(secNames, (str) => {
      const bracketIndex = findIndex(str, (char) => char === '[');
      return bracketIndex !== -1 ? str.slice(0, bracketIndex) : str;
    })
  );

  const hasApic = groupedSections.includes('apic');

  const targetOptions = groupedSections.map((value) => ({
    value,
    label:
      value === 'dend' && !hasApic
        ? 'Dendrites'
        : SECTION_TARGET_MAPPING[value as keyof typeof SECTION_TARGET_MAPPING],
  }));

  const validateFormValues = async (values: TSingleNeuronSynaptomeConfiguration) => {
    try {
      await SingleNeuronSynaptomeConfigurationSchema.parseAsync(values);
      setIsFormValid(true);
    } catch (err) {
      log('error', 'synapse set validation error', err);
      setIsFormValid(false);
    }
  };

  const onValuesChange = (_: any, values: TSingleNeuronSynaptomeConfiguration) => {
    validateFormValues(values);
  };

  useEffect(() => {
    if (previousSetIdRef.current !== setId) {
      previousSetIdRef.current = setId;

      if (config) {
        form.resetFields();
        form.setFieldsValue(config);
        configRef.current = config;
      } else {
        form.resetFields();
        configRef.current = undefined;
      }
    }
  }, [setId, config, form]);

  const onTargetChange = async (newTarget?: keyof typeof SECTION_TARGET_MAPPING) => {
    if (config) {
      const tempSessionValue = sessionValue;
      const currentValues = form.getFieldsValue(true);
      if (newTarget === 'soma') {
        config.target = newTarget;
        config.formula = undefined;
        config.soma_synapse_count = 50;
        tempSessionValue?.synapseSets?.set(config.id, config);

        setSessionValue({
          ...tempSessionValue,
          seed: tempSessionValue?.seed ?? 100,
          synapseSets: tempSessionValue?.synapseSets,
        });
        form.setFieldsValue({ target: 'soma', formula: undefined, soma_synapse_count: 50 });
        await validateFormValues(currentValues);
      }
      if (config?.target === 'soma' && newTarget !== 'soma') {
        config.soma_synapse_count = undefined;
        config.target = newTarget;
        tempSessionValue?.synapseSets?.set(config.id, config);
        setSessionValue({
          ...tempSessionValue,
          seed: tempSessionValue?.seed ?? 100,
          synapseSets: tempSessionValue?.synapseSets,
        });
        form.setFieldsValue({ target: newTarget, soma_synapse_count: undefined });
        await validateFormValues(currentValues);
      }
    }
  };

  const handleApplyChanges = useApplyChangesHandler(
    sessionId,
    sessionValue,
    setSessionValue,
    setVisualizeLoading,
    config,
    configRef
  );

  return (
    <div className="secondary-scrollbar h-full w-full overflow-x-hidden overflow-y-auto select-none">
      <InputSeed sessionValue={sessionValue} setSessionValue={setSessionValue} />
      <Form
        form={form}
        onValuesChange={onValuesChange}
        id="synapse-set-config"
        className={cn(
          'flex w-full flex-col items-center justify-between gap-2 text-lg font-bold',
          '[&_.ant-form-item-explain-error]:text-sm [&_.ant-form-item-explain-error]:font-light!'
        )}
        layout="vertical"
        requiredMark={false}
        onFinish={handleApplyChanges}
      >
        <div className="mb-4 w-full px-3">
          {renderHiddenItems('id', 'color', 'seed')}
          <InputName />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputTarget targetOptions={targetOptions} onTargetChange={onTargetChange} />
            <InputType />
          </div>
          <InputSynapseCount target={config?.target} />
          <SynapsesFilter form={form} config={config} />
          <ButtonApplyChanges isFormValid={isFormValid} visualizeLoading={visualizeLoading} />
        </div>
      </Form>
    </div>
  );
}

function renderHiddenItems(...names: string[]) {
  return (
    <>
      {names.map((name) => (
        <Form.Item key={name} hidden name={name}>
          <input hidden readOnly />
        </Form.Item>
      ))}
    </>
  );
}
