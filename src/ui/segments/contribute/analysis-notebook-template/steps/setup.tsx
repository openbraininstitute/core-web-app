'use client';

import { Form, Input, Select } from 'antd';

import { AnalysisNotebookTemplateSchema } from '@/ui/segments/contribute/analysis-notebook-template/schema';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';

const SCALE_OPTIONS = [
  { label: 'Subcellular', value: 'subcellular' },
  { label: 'Cellular', value: 'cellular' },
  { label: 'Circuit', value: 'circuit' },
  { label: 'System', value: 'system' },
];

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
            validator: createZodFieldValidator(AnalysisNotebookTemplateSchema, 'setup.name', form),
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
              AnalysisNotebookTemplateSchema,
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
        name={['setup', 'scale']}
        label={renderLabel('Scale', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(AnalysisNotebookTemplateSchema, 'setup.scale', form),
          },
        ]}
      >
        <Select
          className="h-12"
          size="large"
          placeholder="Select scale"
          options={SCALE_OPTIONS}
        />
      </Form.Item>

    </div>
  );
}
