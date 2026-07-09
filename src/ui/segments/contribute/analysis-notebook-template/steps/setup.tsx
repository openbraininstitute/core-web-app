'use client';

import { Form, Input, Select } from 'antd';
import { useCallback } from 'react';

import { getAnalysisNotebookTemplates } from '@/api/entitycore/queries/analysis-notebook-template';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  AnalysisNotebookTemplateSchema,
  ScaleEnum,
  type TAnalysisNotebookTemplateForm,
} from '@/ui/segments/contribute/analysis-notebook-template/schema';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';

const SCALE_OPTIONS = ScaleEnum.options.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));

export function Setup() {
  const form = Form.useFormInstance<TAnalysisNotebookTemplateForm>();
  const { projectId, virtualLabId } = useWorkspace();

  const validateNameUniqueness = useCallback(
    async (_: unknown, value: string) => {
      if (!value) return;

      const response = await getAnalysisNotebookTemplates({
        filters: { name: value },
        context: { projectId, virtualLabId },
      });

      if (response.data && response.data.length > 0) {
        throw new Error('A notebook template with this name already exists');
      }
    },
    [projectId, virtualLabId]
  );

  return (
    <div className="h-full w-full">
      <Form.Item
        name={['setup', 'name']}
        label={renderLabel('Name', 'main', RequiredFieldMarker)}
        validateDebounce={500}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(AnalysisNotebookTemplateSchema, 'setup.name', form),
          },
          {
            validator: validateNameUniqueness,
          },
        ]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          size="large"
          placeholder="Enter notebook template name"
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
          placeholder="Enter notebook template description"
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

      <Form.Item name={['setup', 'assignment_id']} label={renderLabel('Assignment ID', 'main')}>
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          size="large"
          placeholder="Optional — assignment ID this notebook grades"
        />
      </Form.Item>
    </div>
  );
}
