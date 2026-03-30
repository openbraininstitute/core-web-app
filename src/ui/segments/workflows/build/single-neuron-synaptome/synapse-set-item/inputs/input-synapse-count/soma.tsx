import { Form, InputNumber } from 'antd';

import { Label } from '../../label';

export function InputSynapseCountSoma() {
  return (
    <div className="w-full">
      <div className="flex w-full flex-col">
        <div className="flex w-full items-center gap-2 pb-[8px]">
          {<Label text="Synapse Count" required />}
        </div>
        <Form.Item
          id="soma_synapse_count"
          name={['soma_synapse_count']}
          rules={[
            {
              required: true,
              message: 'Please provide a valid count for synapses on soma',
            },
          ]}
          validateTrigger="onBlur"
        >
          <InputNumber
            name="soma_synapse_count"
            size="large"
            className="border-neutral-3! [&_input]:text-primary-9! w-full rounded-md border-[1px]! placeholder:text-base placeholder:font-light"
            min={0}
            max={1000}
          />
        </Form.Item>
      </div>
    </div>
  );
}
