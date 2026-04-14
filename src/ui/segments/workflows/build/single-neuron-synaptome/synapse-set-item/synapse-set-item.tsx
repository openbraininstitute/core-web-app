'use client';

import { Form } from 'antd';
import { useState } from 'react';

import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { cn } from '@/utils/css-class';

import { AddNewSet } from './add-new-set';
import { ButtonApplyChanges } from './button-apply-changes';
import { useApplyChangesHandler } from './hooks';
import { useConfig } from './hooks/config';
import { InputName } from './inputs/input-name';
import { InputSeed } from './inputs/input-seed';
import { InputSynapseCount } from './inputs/input-synapse-count';
import { InputTarget } from './inputs/input-target';
import { InputType } from './inputs/input-type';
import { SynapsesFilter } from './synapses-filter';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { ConfigTarget } from './types';

type Props = {
  sessionId: string;
};

export function SynapseSet({ sessionId }: Props) {
  const [visualizeLoading, setVisualizeLoading] = useState(false);
  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const { form, config, updateConfig, isFormValid } = useConfig(sessionId);
  const onValuesChange = (_: unknown, values: TSingleNeuronSynaptomeConfiguration) => {
    updateConfig(values);
  };
  const onTargetChange = async (target?: ConfigTarget) => {
    if (!config) return;

    if (target === 'soma') {
      updateConfig({
        name: config.name || target,
        target,
        formula: undefined,
        soma_synapse_count: 50,
      });
    } else {
      updateConfig({
        name: config.name || target,
        target,
        soma_synapse_count: undefined,
      });
    }
  };
  const handleApplyChanges = useApplyChangesHandler(
    sessionId,
    config,
    sessionValue,
    setSessionValue,
    setVisualizeLoading
  );

  if (!config) return <AddNewSet />;

  return (
    <div className="secondary-scrollbar h-full w-full overflow-x-hidden overflow-y-auto select-none">
      <InputSeed
        color={config.color}
        sessionValue={sessionValue}
        setSessionValue={setSessionValue}
      />
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
            <InputTarget sessionId={sessionId} value={config?.target} onChange={onTargetChange} />
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
