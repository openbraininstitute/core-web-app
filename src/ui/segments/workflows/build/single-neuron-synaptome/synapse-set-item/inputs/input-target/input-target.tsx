import { Form, Select } from 'antd';

import { Label } from '../../label';

export interface InputTargetProps {
  targetOptions: { label: string; value: string }[];
  onTargetChange: (
    newTarget?: 'apic' | 'dend' | 'axon' | 'basal' | 'myelin' | 'soma' | undefined
  ) => Promise<void>;
}

export function InputTarget({ targetOptions, onTargetChange }: InputTargetProps) {
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
        onChange={onTargetChange}
      />
    </Form.Item>
  );
}
