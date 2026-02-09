'use client';

import { Form, Input } from 'antd';

import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export function Setup() {
  const form = Form.useFormInstance();
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();

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
          placeholder="Enter cell recording name"
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
          placeholder="Enter cell recording description"
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
        <BrainRegionDropdownWithFormItem
          clsx={{ trigger: 'rounded-full w-full h-12', content: 'z-[99999]' }}
          showIcon={false}
          charsPerLine={200}
          defaultBrainRegion={selectedBrainRegion as IBrainRegionHierarchy}
        />
      </Form.Item>
    </div>
  );
}
