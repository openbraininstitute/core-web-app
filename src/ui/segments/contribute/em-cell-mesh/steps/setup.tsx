'use client';

import { DatePicker, Form, Input, InputNumber } from 'antd';
import dayjs from 'dayjs';

import {
  EMCellMeshGenerationMethodDict,
  EMCellMeshTypeDict,
  type TEMCellMeshGenerationMethod,
  type TEMCellMeshType,
} from '@/api/entitycore/types/entities/em-cell-mesh';
import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { SelectPopoverFormItem } from '@/ui/molecules/select-popover';
import { EMCellMeshSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { EMDenseReconstructionDatasetSelector } from '@/ui/segments/contribute/shared/components/em-dense-reconstruction-dataset-selector';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export function Setup() {
  const form = Form.useFormInstance();
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();

  const GenerationMethodFormInput = SelectPopoverFormItem<TEMCellMeshGenerationMethod>({
    options: Object.entries(EMCellMeshGenerationMethodDict).map(([, value]) => ({
      label: value.label,
      value: value.key,
    })),
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
  });

  const EMCellMeshTypeFormInput = SelectPopoverFormItem<TEMCellMeshType>({
    options: Object.entries(EMCellMeshTypeDict).map(([, value]) => ({
      label: value.label,
      value: value.key,
    })),
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
  });

  return (
    <div className="flex flex-col gap-4">
      <Form.Item
        name={['setup', 'name']}
        label={renderLabel('Name', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(EMCellMeshSchema, 'setup.name', form),
          },
        ]}
      >
        <Input className="h-12 rounded-full" placeholder="Enter name" />
      </Form.Item>

      <Form.Item
        name={['setup', 'description']}
        label={renderLabel('Description', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(EMCellMeshSchema, 'setup.description', form),
          },
        ]}
      >
        <Input.TextArea rows={4} className="rounded-xl" placeholder="Enter description" />
      </Form.Item>

      <Form.Item
        name={['setup', 'brain_region_id']}
        label={renderLabel('Brain region', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(EMCellMeshSchema, 'setup.brain_region_id', form),
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

      <EMDenseReconstructionDatasetSelector schema={EMCellMeshSchema} />

      <Form.Item
        name={['setup', 'dense_reconstruction_cell_id']}
        label={renderLabel('Dense reconstruction cell id', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              EMCellMeshSchema,
              'setup.dense_reconstruction_cell_id',
              form
            ),
          },
        ]}
      >
        <InputNumber
          className="h-12 w-full rounded-full flex items-center [&_.ant-input-number-handler-wrap]:hidden"
          placeholder="Enter cell ID (int)"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'experiment_date']}
        label={renderLabel('Experiment date', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(EMCellMeshSchema, 'setup.experiment_date', form),
          },
        ]}
      >
        <DatePicker className="h-12 w-full rounded-full" format="DD/MM/YYYY" maxDate={dayjs()} />
      </Form.Item>

      <Form.Item
        name={['setup', 'release_version']}
        label={renderLabel('Release version', 'main')}
        rules={[
          {
            validator: createZodFieldValidator(EMCellMeshSchema, 'setup.release_version', form),
          },
        ]}
      >
        <InputNumber
          className="h-12 w-full rounded-full flex items-center [&_.ant-input-number-handler-wrap]:hidden"
          placeholder="Enter version (int)"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'generation_method']}
        label={renderLabel('Generation method', 'main')}
        rules={[
          {
            validator: createZodFieldValidator(EMCellMeshSchema, 'setup.generation_method', form),
          },
        ]}
      >
        <GenerationMethodFormInput />
      </Form.Item>

      <Form.Item
        name={['setup', 'level_of_detail']}
        label={renderLabel('Level of detail', 'main')}
        rules={[
          {
            validator: createZodFieldValidator(EMCellMeshSchema, 'setup.level_of_detail', form),
          },
        ]}
      >
        <InputNumber
          className="h-12 w-full rounded-full flex items-center [&_.ant-input-number-handler-wrap]:hidden"
          placeholder="Enter level (int)"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'mesh_type']}
        label={renderLabel('Mesh type', 'main')}
        rules={[
          {
            validator: createZodFieldValidator(EMCellMeshSchema, 'setup.mesh_type', form),
          },
        ]}
      >
        <EMCellMeshTypeFormInput />
      </Form.Item>
    </div>
  );
}
