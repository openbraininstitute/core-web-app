'use client';

import { Button, Form, Input, Select } from 'antd';
import { useAtomValue, useSetAtom } from 'jotai';
import { useMemo, useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state.session';
import {
  brainRegionsWithRepresentationAtom,
  setSelectedBrainRegionAtomGetter,
} from '@/state/brain-regions';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';

import type { WorkspaceContext } from '@/types/common';

type Params = {
  params: Promise<WorkspaceContext>;
};

export default function NewMEModelPage(props: Params) {
  const { projectId, virtualLabId } = use(props.params);
  const { push: navigate } = useRouter();
  const [form] = Form.useForm();

  const stateId = useMemo(() => `bme-${crypto.randomUUID()}`, []);
  const { setSessionValue, sessionValue, removeSessionValue } = useBuildMeModelSessionState({
    stateId,
    virtualLabId,
    projectId,
  });

  const contributors = useAtomValue(virtualLabProjectUsersAtomFamily({ projectId, virtualLabId }))
    ?.data?.users;
  const [isFormValid, setIsFormValid] = useState(false);
  const brainRegions = useAtomValue(brainRegionsWithRepresentationAtom);
  const setBrainRegion = useSetAtom(setSelectedBrainRegionAtomGetter('build'));

  const onValuesChange = () => {
    form
      .validateFields()
      .then(() => {
        setIsFormValid(true);
      })
      .catch((error) => {
        if (error.errorFields.length > 0) {
          setIsFormValid(false);
        } else {
          setIsFormValid(true);
        }
      });
  };

  const onSubmit = () => {
    const values = form.getFieldsValue();
    const brainRegion = brainRegions?.find((br) => br.id === values.brainRegion);

    if (values.brainRegion && !brainRegion) return;

    // if a brain region is selected and found, set it as selected brain region on sidebar
    if (brainRegion) {
      setBrainRegion(brainRegion.id, brainRegion.title, brainRegion.leaves || []);
    }

    setSessionValue({
      virtualLabId,
      projectId,
      name: values.name,
      description: values.description,
      brainRegion: brainRegion && { id: brainRegion.id, title: brainRegion.title },
    });

    const params = new URLSearchParams();
    params.set('s', stateId);

    navigate(`new/configure?${params.toString()}`);
  };

  const brainRegionOptions = useMemo(
    () => brainRegions?.map((brainRegion) => ({ label: brainRegion.title, value: brainRegion.id })),
    [brainRegions]
  );

  return (
    <div className="m-10 flex h-full flex-col gap-5">
      <div className="text-primary-8 text-3xl font-bold">Build a new single neuron model</div>
      <div className="flex flex-row gap-4">
        <div className="flex-1 grow flex-col gap-4">
          <Form
            className="flex flex-col gap-4"
            form={form}
            layout="vertical"
            autoComplete="off"
            preserve={false}
            onValuesChange={onValuesChange}
            initialValues={{
              name: sessionValue.name,
              description: sessionValue.description,
              brainRegion: sessionValue.brainRegion?.id,
            }}
          >
            <Form.Item
              hasFeedback
              label={<span className="text-primary-8">NAME</span>}
              name="name"
              validateTrigger="onBlur"
              rules={[{ required: true, message: 'Please fill the name' }]}
            >
              <Input placeholder="Your model name..." />
            </Form.Item>
            <Form.Item
              hasFeedback
              label={<span className="text-primary-8">DESCRIPTION</span>}
              name="description"
            >
              <Input.TextArea placeholder="Your description..." showCount />
            </Form.Item>
            <Form.Item
              hasFeedback
              label={<span className="text-primary-8">BRAIN REGION</span>}
              name="brainRegion"
            >
              <Select
                placeholder="Select brain region"
                optionFilterProp="label"
                allowClear
                showSearch
                options={brainRegionOptions}
              />
            </Form.Item>
          </Form>
        </div>
        <div className="text-primary-7 mr-10 flex-1">
          <div className="text-neutral-4 uppercase">Created by</div>
          <div className="mt-2">
            <ul>{contributors?.map(({ id, name }) => <li key={id}>{name}</li>)}</ul>
          </div>
        </div>
        <div className="text-primary-7 mr-10 flex-1">
          <div className="text-neutral-4 uppercase">Creation Date</div>
          <div className="mt-2">{new Intl.DateTimeFormat('fr-CH').format(new Date())}</div>
        </div>
      </div>
      <div>
        <Button
          type="primary"
          htmlType="submit"
          disabled={!isFormValid}
          size="large"
          onClick={onSubmit}
          className="bg-primary-8 absolute right-0 bottom-0 m-10 rounded-none"
        >
          Start building
        </Button>
      </div>
    </div>
  );
}
