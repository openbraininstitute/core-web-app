import { UserOutlined } from '@ant-design/icons';
import { Form, Input } from 'antd';
import { z } from 'zod';

import { label } from '@/features/entities/neuron-simulation/experiment/elements/label';
import { renderDate } from '@/entity-configuration/definitions/renderer';
import { useSessionAtomValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

import type { SimulationConfigSteps } from '@/features/entities/neuron-simulation/experiment/elements/types';

type Props = {
  configStep: SimulationConfigSteps;
  onConfigStep: (value: SimulationConfigSteps) => void;
};

const configStepValidationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullish(),
});

export default function CreateBaseSimulationConfig({ configStep, onConfigStep }: Props) {
  const form = Form.useFormInstance();
  const session = useSessionAtomValue();
  const proceed = async () => {
    await form.validateFields(['name', 'description']);
    const formValidated = configStepValidationSchema.safeParse(
      form.getFieldsValue(['name', 'description'])
    );
    if (formValidated.success) {
      onConfigStep('simulation-config');
    }
  };

  return (
    <div
      className={classNames(
        'flex w-full flex-col items-start gap-14 p-10',
        configStep !== 'basic-config' ? 'hidden' : 'h-[calc(100vh-51px)]'
      )}
    >
      <h1 className="text-primary-8 text-3xl font-bold">Create new simulation experiment</h1>
      <div className="flex w-full flex-col">
        <div className="grid max-h-[50%] w-full grid-cols-2 gap-14">
          <Form.Item
            name="name"
            label={label('name')}
            rules={[{ required: true, message: 'Please provide a name!' }]}
            validateTrigger="onBlur"
          >
            <Input
              placeholder="Your model name"
              size="large"
              className="border-primary-8! text-primary-8! rounded-none border-0 border-b-[1.5px]! font-bold!"
            />
          </Form.Item>
        </div>
        <div className="grid max-h-[50%] w-full grid-cols-2 gap-14">
          <Form.Item name="description" label={label('Description')}>
            <Input.TextArea
              rows={5}
              placeholder="Your description"
              size="large"
              className="rounded-none border border-gray-400 p-2"
            />
          </Form.Item>
          <div className="grid grid-cols-2 items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-1">
              {label('created by', 'secondary')}
              <div className="text-primary-8 flex items-center justify-center gap-2">
                <UserOutlined className="h-3 w-3" />
                {session?.user.name}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {label('creation date', 'secondary')}
              <div className="text-primary-8">{renderDate(new Date().toISOString())}</div>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="bg-primary-8 fixed right-10 bottom-10 rounded-none px-7 py-3 text-lg text-white"
        onClick={proceed}
      >
        Start Configuring
      </button>
    </div>
  );
}
