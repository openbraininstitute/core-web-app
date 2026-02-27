import { Form, Select } from 'antd';
import findIndex from 'es-toolkit/compat/findIndex';
import groupBy from 'es-toolkit/compat/groupBy';
import { useAtomValue } from 'jotai';

import { SECTION_TARGET_MAPPING } from '@/features/entities/single-neuron-synaptome/build/elements/constants';
import { neuronSectionNamesAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';

import { Label } from '../../label';

import type { ConfigTarget } from '../../types';

export interface InputTargetProps {
  sessionId: string;
  value: ConfigTarget | undefined;
  onChange: (newTarget?: ConfigTarget) => Promise<void>;
}

export function InputTarget({ value, onChange, sessionId }: InputTargetProps) {
  const secNames = useAtomValue(neuronSectionNamesAtomFamily(sessionId));
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

  return (
    <Form.Item
      name={['target']}
      rules={[{ required: false, message: 'Please select a target!' }]}
      validateTrigger="onBlur"
      label={<Label text="Target" />}
      className="[&_.ant-select-arrow]:text-primary-8 [&_.ant-form-item-row]:mb-0 [&_.ant-form-item-row]:inline-block [&_.ant-form-item-row]:w-full [&_.ant-select-selector]:border-0!"
    >
      <Select
        allowClear
        placeholder="Select a target"
        size="large"
        className="border-neutral-3! [&_.ant-select-selection-item]:text-primary-9! rounded-md border! [&_.ant-select-selection-item]:font-bold [&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!"
        classNames={{
          popup: { root: '[&_.ant-select-item-option-content]:text-primary-9!' },
        }}
        disabled={!targetOptions.length}
        options={targetOptions}
        onChange={onChange}
        value={value}
      />
    </Form.Item>
  );
}
