'use client';

import { Form, Input } from 'antd';

import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import { BrainRegionSelector } from '@/ui/segments/contribute/shared/components/brain-region-selector';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';

export function Setup() {
  const form = Form.useFormInstance();

  return (
    <div className="h-full w-full">
      <Form.Item
        name={['setup', 'name']}
        label={renderLabel('Name', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(ExperimentalNeuronDensitySchema, 'setup.name', form),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          size="large"
          placeholder="Enter neuron density name"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'description']}
        label={renderLabel('Description', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              ExperimentalNeuronDensitySchema,
              'setup.description',
              form
            ),
          },
        ]}
      >
        <Input.TextArea
          rows={5}
          className="rounded-xl placeholder:text-sm"
          placeholder="Enter neuron density description"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'brain_region_id']}
        label={renderLabel('Brain region', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              ExperimentalNeuronDensitySchema,
              'setup.brain_region_id',
              form
            ),
          },
        ]}
      >
        <BrainRegionSelector />
      </Form.Item>
    </div>
  );
}
