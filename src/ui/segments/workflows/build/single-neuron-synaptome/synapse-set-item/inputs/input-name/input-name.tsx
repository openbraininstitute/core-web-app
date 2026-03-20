import { Form, Input } from 'antd';

import { Label } from '../../label';

export function InputName() {
  return (
    <Form.Item
      name={['name']}
      labelAlign="left"
      rules={[{ required: true, message: 'Please provide a name!' }]}
      validateTrigger="onBlur"
      label={<Label text="Name" required />}
    >
      <Input
        placeholder="Name your set"
        size="large"
        className="border-neutral-3! text-primary-9! rounded-md border-[1px]! placeholder:text-base placeholder:font-light"
      />
    </Form.Item>
  );
}
