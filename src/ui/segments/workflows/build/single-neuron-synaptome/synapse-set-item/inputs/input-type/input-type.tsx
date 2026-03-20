import { Form, Select } from 'antd';

import { Label } from '../../label';

export function InputType() {
  return (
    <Form.Item
      name={['type']}
      rules={[{ required: true, message: 'Please select at least one type!' }]}
      label={<Label text="Type" required />}
      validateTrigger="onBlur"
      className="[&_.ant-select-arrow]:text-primary-8 [&_.ant-form-item-row]:mb-0 [&_.ant-form-item-row]:inline-block [&_.ant-form-item-row]:w-full [&_.ant-select-selector]:border-0!"
    >
      <Select
        allowClear
        placeholder="Select a type"
        size="large"
        className="border-neutral-3! [&_.ant-select-selection-item]:text-primary-9! rounded-md border-[1px]! [&_.ant-select-selection-item]:font-bold [&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!"
        classNames={{
          popup: { root: '[&_.ant-select-item-option-content]:text-primary-9!' },
        }}
        options={[
          { value: 110, label: 'Excitatory Synapses' },
          { value: 10, label: 'Inhibitory Synapses' },
        ]}
      />
    </Form.Item>
  );
}
