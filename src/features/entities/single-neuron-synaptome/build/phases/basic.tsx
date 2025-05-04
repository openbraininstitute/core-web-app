import { UserOutlined } from '@ant-design/icons';
import { Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { z } from 'zod';

import useBuildSingleNeuronSynaptomeSessionState from '@/features/entities/single-neuron-synaptome/build/create.state-session';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { renderDate } from '@/entity-configuration/definitions/renderer';
import { label } from '@/components/form-label';
import { ensureArray } from '@/utils/array';
import { classNames } from '@/util/utils';

import type { SynaptomeModelConfiguration } from '@/types/synaptome';
import type { WorkspaceContext } from '@/types/common';

const configStepValidationSchema = z.object({
  name: z.string().nonempty().min(2),
  description: z.string().nullish(),
});

type Props = WorkspaceContext & {
  stateId: string;
};

export default function BaseConfiguration({ virtualLabId, projectId, stateId }: Props) {
  const form = Form.useFormInstance<SynaptomeModelConfiguration>();
  const name = Form.useWatch('name', form);
  const description = Form.useWatch('description', form);
  const [basicHasErrors, setBasicHasErrors] = useState(false);

  const { phase, updateQueryConfig, setSessionValue, sessionValue } =
    useBuildSingleNeuronSynaptomeSessionState({
      virtualLabId,
      projectId,
      stateId,
    });

  const { getFieldsValue, getFieldValue, validateFields } = Form.useFormInstance();
  const contributors = useAtomValue(virtualLabProjectUsersAtomFamily({ projectId, virtualLabId }))
    ?.data?.users;

  const gotoMeModelSelection = async () => {
    await validateFields(['name', 'description']);
    const { success } = await configStepValidationSchema.safeParseAsync(
      getFieldsValue(['name', 'description'])
    );
    if (success) {
      setSessionValue({
        name: getFieldValue('name') || '',
        description: getFieldValue('description') || '',
        selectedRows: sessionValue?.selectedRows || null,
      });
      await updateQueryConfig({
        stateId,
        phase: 'me-model',
      });
    }
  };

  useEffect(() => {
    (async () => {
      const { success, error } = await configStepValidationSchema.safeParseAsync({
        name,
        description,
      });

      if (success) {
        setBasicHasErrors(false);
      } else if (error) {
        setBasicHasErrors(true);
      }
    })();
  }, [name, description, setBasicHasErrors]);

  return (
    <div
      className={classNames(
        'flex w-full flex-col items-start gap-14 p-10',
        phase !== 'basic' ? 'hidden' : 'h-[calc(100vh-51px)]'
      )}
    >
      <h1 className="text-primary-8 text-3xl font-bold">Build new synaptome model</h1>
      <div className="grid w-full grid-rows-[max-content_1fr] gap-x-20 gap-y-10 md:grid-cols-2 md:gap-y-0">
        <div className="order-2 flex w-full flex-col gap-y-5 md:order-1">
          <Form.Item
            name="name"
            label={label('name', 'main', <sup className="text-base text-red-500">*</sup>)}
            rules={[{ required: true, message: 'Please provide a name!' }]}
            validateTrigger="onBlur"
            className="text-primary-8!"
          >
            <Input
              placeholder="Your model name"
              size="large"
              className="border-neutral-2! text-primary-8! rounded-sm! font-bold! placeholder:font-light"
            />
          </Form.Item>
          <Form.Item name="description" label={label('Description', 'main')}>
            <Input.TextArea
              rows={5}
              placeholder="Your description"
              size="large"
              className="border-neutral-2! text-primary-8! rounded-sm! p-2"
            />
          </Form.Item>
        </div>
        <div className="order-1 grid grid-cols-2 items-start justify-between gap-2 md:order-2">
          <div className="flex flex-col items-start gap-1">
            {label('created by', 'secondary')}
            <div className="text-primary-8 flex flex-col items-start justify-center gap-2">
              {ensureArray({ input: contributors }).map((user) => (
                <div className="font-bold" key={`contributor-${user.id}`}>
                  <UserOutlined className="mr-1 h-3 w-3" />
                  {user.name ?? user.username}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {label('creation date', 'secondary')}
            <div className="text-primary-8 font-bold">{renderDate(new Date().toISOString())}</div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className={classNames(
          'bg-primary-8 fixed right-10 bottom-10 rounded-none px-7 py-4 text-white',
          'disabled:text-primary-7 disabled:border-primary-7 disabled:cursor-not-allowed disabled:border disabled:bg-white'
        )}
        disabled={basicHasErrors}
        onClick={gotoMeModelSelection}
      >
        Start building
      </button>
    </div>
  );
}
