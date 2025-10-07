'use client';

import { ConfigProvider, Form, Input, Select } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import omit from 'es-toolkit/compat/omit';

import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
  DEFAULT_BRAIN_REGION_QUERY_ID,
  useBrainRegionHierarchy,
  useSetSelectedBrainRegion,
} from '@/features/brain-region-hierarchy/context';
import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state-session';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { resolveDataKey } from '@/utils/key-builder';
import { renderDate } from '@/entity-configuration/definitions/renderer';
import { label } from '@/components/form-label';
import { ensureArray } from '@/utils/array';
import { classNames } from '@/util/utils';

import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type { WorkspaceContext } from '@/types/common';

type Params = {
  params: Promise<WorkspaceContext>;
};

export default function NewMEModelPage({ params: promisedParams }: Params) {
  const [isFormValid, setIsFormValid] = useState(false);
  const { projectId, virtualLabId } = use(promisedParams);
  const { updateSelectedBrainRegion } = useSetSelectedBrainRegion();
  const { push: navigate } = useRouter();
  const [form] = Form.useForm();

  const stateId = useMemo(() => `bme-${crypto.randomUUID()}`, []);
  const { setSessionValue, sessionValue } = useBuildMeModelSessionState({
    stateId,
    virtualLabId,
    projectId,
  });
  const brainRegionHierarchy = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
  const contributors = useAtomValue(virtualLabProjectUsersAtomFamily({ projectId, virtualLabId }))
    ?.data?.users;
  const dataKey = resolveDataKey({ projectId, section: 'build' });

  const { node, updateHierarchyConfig } = useBrainRegionHierarchy({
    dataKey,
  });

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
    const brainRegion = brainRegionHierarchy?.options.find((o) => o.value === values.brainRegion);
    // delete all building me-models session
    if (typeof window !== 'undefined') {
      for (const key of Object.keys(window.sessionStorage)) {
        if (key.startsWith('bme')) {
          window.sessionStorage.removeItem(key);
        }
      }
    }

    if (!values.brainRegion && !node) return;

    setSessionValue({
      virtualLabId,
      projectId,
      name: values.name,
      description: values.description,
      brainRegion: brainRegion?.data ?? (node as unknown as BrainRegionHierarchyBase),
    });

    const params = new URLSearchParams();
    params.set('s', stateId);
    params.set(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      String(brainRegion?.data?.annotation_value ?? node?.annotation_value ?? '')
    );
    params.set(DEFAULT_BRAIN_REGION_QUERY_ID, brainRegion?.data?.id ?? node?.id ?? '');

    navigate(`new/configure?${params.toString()}`);
  };

  return (
    <div className="m-10 flex h-full flex-col gap-5">
      <div className="text-primary-8 text-3xl font-bold">Build a new single neuron model</div>
      <div className="grid w-full grid-rows-[max-content_1fr] gap-x-20 gap-y-10 md:grid-cols-2 md:gap-y-0">
        <div className="order-2 flex w-full flex-col gap-y-5 md:order-1">
          <ConfigProvider theme={{ token: { borderRadius: 0 } }}>
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
                name: sessionValue.name,
                description: sessionValue.description,
                brainRegion: sessionValue.brainRegion?.id,
              }}
            >
              <Form.Item
                hasFeedback
                label={label('name', 'main', <sup className="text-base text-red-500">*</sup>)}
                name="name"
                validateTrigger="onBlur"
                rules={[{ required: true, message: 'Please provide a name!' }]}
              >
                <Input
                  placeholder="your model name"
                  size="large"
                  className="border-neutral-2! text-primary-8! rounded-sm! font-bold! [&_input]:placeholder:!font-light"
                />
              </Form.Item>
              <Form.Item hasFeedback label={label('Description', 'main')} name="description">
                <Input.TextArea
                  rows={5}
                  placeholder="your description"
                  size="large"
                  className="border-neutral-2! text-primary-8! rounded-sm! p-2 [&_textarea]:placeholder:!font-light"
                />
              </Form.Item>
              <Form.Item hasFeedback label={label('brain region', 'main')} name="brainRegion">
                <Select
                  allowClear
                  showSearch
                  placeholder="Select brain region"
                  optionFilterProp="label"
                  onSelect={(_, option) => {
                    updateHierarchyConfig(option.data);
                    updateSelectedBrainRegion(omit(option.data, 'children'));
                  }}
                  size="large"
                  options={brainRegionHierarchy?.options}
                  className="border-neutral-2! text-primary-8! rounded-sm! [&_.ant-select-selector]:!rounded-sm"
                />
              </Form.Item>
            </Form>
          </ConfigProvider>
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
      <div>
        <button
          type="button"
          className={classNames(
            'bg-primary-8 fixed right-10 bottom-10 rounded-none px-7 py-4 text-white',
            'disabled:text-primary-7 disabled:border-primary-7 disabled:cursor-not-allowed disabled:border disabled:bg-white'
          )}
          onClick={onSubmit}
          disabled={!isFormValid}
        >
          Start building
        </button>
      </div>
    </div>
  );
}
