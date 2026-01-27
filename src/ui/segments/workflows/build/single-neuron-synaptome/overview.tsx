'use client';

import { Form, Input } from 'antd';
import { useSession } from 'next-auth/react';

import {
  label,
  useBuildSingleNeuronSynaptomeSessionState,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { makeDateToAppFormat } from '@/util/date';

type Props = {
  sessionId: string;
};

export function Info({ sessionId }: Props) {
  const { data } = useSession();
  const [form] = Form.useForm();

  const { setSessionValue, sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  const onValuesChange = (changedValues: { name: string; description?: string }) => {
    setSessionValue({ ...sessionValue, seed: sessionValue?.seed ?? 100, ...changedValues });
  };

  return (
    <div className="grid h-full w-full grid-cols-2 gap-4">
      <Form
        name="single-model-configuration-form"
        className="flex flex-col gap-4"
        form={form}
        layout="vertical"
        autoComplete="off"
        preserve={false}
        requiredMark="optional"
        onValuesChange={onValuesChange}
        initialValues={{
          name: sessionValue?.name,
          description: sessionValue?.description,
        }}
      >
        <Form.Item
          hasFeedback
          label={label('name', 'secondary', <sup className="text-base text-red-500">*</sup>)}
          name="name"
          validateTrigger="onBlur"
          rules={[{ required: true, message: 'Please provide a name!' }]}
        >
          <Input
            placeholder="your model name"
            size="large"
            className="border-neutral-2! text-primary-8! rounded-sm! font-bold! [&_input]:placeholder:font-light!"
          />
        </Form.Item>
        <Form.Item hasFeedback label={label('Description', 'secondary')} name="description">
          <Input.TextArea
            rows={5}
            placeholder="your description"
            size="large"
            className="border-neutral-2! text-primary-8! rounded-sm! p-2 [&_textarea]:placeholder:!font-light"
          />
        </Form.Item>
        <div className="flex flex-col gap-10 select-none">
          <div className="flex flex-col">
            <div>{label('Created by', 'secondary')}</div>
            <div className="text-neutral-4 font-bold">
              {data?.user?.name ?? data?.user?.username}
            </div>
          </div>
          <div className="flex flex-col">
            <div>{label('created at', 'secondary')}</div>
            <div className="text-neutral-4 font-bold">
              {makeDateToAppFormat(new Date().toISOString())}
            </div>
          </div>
        </div>
      </Form>
      <div className="bg-background w-full rounded-2xl" />
    </div>
  );
}
