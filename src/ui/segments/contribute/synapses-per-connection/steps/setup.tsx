// setup.tsx

'use client';

import { Form, Input } from 'antd';

import { BrainRegionSelector } from '@/ui/segments/contribute/shared/components/brain-region-selector';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { ExperimentalSynapsesPerConnectionSchema } from '@/ui/segments/contribute/synapses-per-connection/schema';
import { PostMTypeClassificationSelector } from '@/ui/segments/contribute/synapses-per-connection/steps/post-mtype-selector';
import { PreMTypeClassificationSelector } from '@/ui/segments/contribute/synapses-per-connection/steps/pre-mtype-selector';

function BrainRegionFormField({ name, label }: { name: string; label: string }) {
  const form = Form.useFormInstance();

  return (
    <Form.Item
      name={name}
      label={renderLabel(label, 'main', RequiredFieldMarker)}
      validateTrigger={['onChange', 'onBlur']}
      rules={[
        {
          required: true,
          message: `${label} is required.`,
        },
        {
          validator: createZodFieldValidator(ExperimentalSynapsesPerConnectionSchema, name, form),
        },
      ]}
    >
      <BrainRegionSelector />
    </Form.Item>
  );
}

export function Setup() {
  const form = Form.useFormInstance();

  return (
    <div className="flex flex-col gap-4">
      {/* Name field, now top-level */}
      <Form.Item
        name="name"
        label={renderLabel('Name', 'main', RequiredFieldMarker)}
        validateTrigger={['onChange', 'onBlur']}
        rules={[
          {
            required: true,
            message: 'Name is required.',
          },
          {
            validator: createZodFieldValidator(
              ExperimentalSynapsesPerConnectionSchema,
              'name',
              form
            ),
          },
        ]}
      >
        <Input
          size="large"
          className="h-12 rounded-full! placeholder:text-sm"
          placeholder="Enter name"
        />
      </Form.Item>

      {/* Description field, now top-level (optional) */}
      <Form.Item
        name="description"
        label={renderLabel('Description', 'main')}
        validateTrigger={['onChange', 'onBlur']}
        rules={[
          {
            validator: createZodFieldValidator(
              ExperimentalSynapsesPerConnectionSchema,
              'description',
              form
            ),
          },
        ]}
      >
        <Input.TextArea
          rows={5}
          className="rounded-xl placeholder:text-sm"
          placeholder="Enter cell recording description"
        />
      </Form.Item>
      <BrainRegionFormField name="brain_region_id" label="Brain region" />
      {/* Pre brain region: Required field, top-level */}
      <BrainRegionFormField name="pre_region_id" label="Pre brain region" />
      <PreMTypeClassificationSelector schema={ExperimentalSynapsesPerConnectionSchema} />
      {/* Post brain region: Required field, top-level */}
      <BrainRegionFormField name="post_region_id" label="Post brain region" />
      <PostMTypeClassificationSelector schema={ExperimentalSynapsesPerConnectionSchema} />
    </div>
  );
}
