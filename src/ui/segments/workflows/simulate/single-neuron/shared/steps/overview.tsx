'use client';

import { useSession } from 'next-auth/react';
import { Form, Input } from 'antd';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import z from 'zod';

import { OverviewConfigurationAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { OverviewConfigSchema } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import {
  getSessionKey,
  label,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { makeDateToAppFormat } from '@/util/date';
import { log } from '@/utils/logger';

type Props = {
  sessionId: string;
};

export function Info({ sessionId }: Props) {
  const { data } = useSession();
  const [form] = Form.useForm();

  const key = getSessionKey(PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY, sessionId);
  const [state, update] = useAtom(OverviewConfigurationAtomFamily(key));

  useEffect(() => {
    form.setFieldsValue({
      name: state.name,
      description: state.description,
    });
  }, [state, form]);

  const onValuesChange = (changedValues: any, allValues: any) => {
    try {
      const validatedData = OverviewConfigSchema.parse(allValues);
      update(validatedData);
    } catch (error) {
      log('error', error);
    }
  };

  return (
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
        name: state.name,
        description: state.description,
      }}
    >
      <Form.Item
        hasFeedback
        label={label('name', true)}
        name="name"
        validateTrigger="onBlur"
        rules={[
          {
            validator: async (_rule, value) => {
              try {
                await OverviewConfigSchema.pick({ name: true }).shape.name.parseAsync(value);
              } catch (error) {
                return Promise.reject(
                  error instanceof z.ZodError ? error.errors.at(0)?.message : 'Name is required'
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input
          placeholder="your model name"
          size="large"
          className="border-neutral-2! text-primary-8! rounded-sm! font-bold! [&_input]:placeholder:!font-light"
        />
      </Form.Item>
      <Form.Item
        hasFeedback
        label={label('Description', false)}
        name="description"
        rules={[
          {
            validator: async (_rule, value) => {
              try {
                await OverviewConfigSchema.pick({ description: true }).shape.description.parseAsync(
                  value
                );
              } catch (error) {
                return Promise.reject(
                  error instanceof z.ZodError ? error.errors.at(0)?.message : 'Invalid description'
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input.TextArea
          rows={5}
          placeholder="your description"
          size="large"
          className="border-neutral-2! text-primary-8! rounded-sm! p-2 [&_textarea]:placeholder:!font-light"
        />
      </Form.Item>
      <div className="flex flex-col gap-10 select-none">
        <div className="flex flex-col">
          <div>{label('Created by', false)}</div>
          <div className="text-neutral-4 font-bold">{data?.user.name ?? data?.user.username}</div>
        </div>
        <div className="flex flex-col">
          <div>{label('created at', false)}</div>
          <div className="text-neutral-4 font-bold">
            {makeDateToAppFormat(new Date().toISOString())}
          </div>
        </div>
      </div>
    </Form>
  );
}
