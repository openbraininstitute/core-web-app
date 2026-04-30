'use client';

import { Form, Input, Select } from 'antd';

import { AnalysisNotebookTemplateSchema } from '@/ui/segments/contribute/analysis-notebook-template/schema';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { EntityGroupDict } from '@/ui/segments/workflows/config';

const SCALE_OPTIONS = Object.values(EntityGroupDict).map((value) => ({
  label: value,
  value: value.toLowerCase(),
}));

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
          className="rounded-full! h-12 [&_.ant-select-selector]:rounded-full!"
          size="large"
          placeholder="Select scale"
          options={SCALE_OPTIONS}
        />
      </Form.Item>
    </div>
  );
}
