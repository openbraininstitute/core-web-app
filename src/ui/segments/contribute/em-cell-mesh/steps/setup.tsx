'use client';

import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { EMCellMeshSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { EMDenseReconstructionDatasetSelector } from '@/ui/segments/contribute/shared/components/em-dense-reconstruction-dataset-selector';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';

export function Setup() {
  const form = Form.useFormInstance();
  const { projectId } = useWorkspace();

  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  const BrainRegionDropdown = BrainRegionDropdownWithFormItem({
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
    showIcon: false,
    charsPerLine: 200,
    defaultBrainRegion: defaultBrainRegion as IBrainRegionHierarchy,
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
        <BrainRegionDropdown />
      </Form.Item>

      {/* Replaced manual UUID Input with the Async Dropdown Selector */}
      <EMDenseReconstructionDatasetSelector schema={EMCellMeshSchema} />

      <Form.Item
        name={['setup', 'dense_reconstruction_cell_id']}
        label={renderLabel('Dense reconstruction cell id', 'main')}
      >
        <InputNumber
          className="h-12 w-full rounded-full flex items-center"
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

      <Form.Item name={['setup', 'release_version']} label={renderLabel('Release version', 'main')}>
        <InputNumber
          className="h-12 w-full rounded-full flex items-center"
          placeholder="Enter version (int)"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'generation_method']}
        label={renderLabel('Generation method', 'main')}
      >
        <Select
          className="h-12 w-full"
          placeholder="Select method"
          style={{ backgroundColor: 'white', borderRadius: '9999px' }}
        >
          <Select.Option value="marching_cubes">marching_cubes</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name={['setup', 'level_of_detail']} label={renderLabel('Level of detail', 'main')}>
        <InputNumber
          className="h-12 w-full rounded-full flex items-center"
          placeholder="Enter level (int)"
        />
      </Form.Item>

      <Form.Item name={['setup', 'mesh_type']} label={renderLabel('Mesh type', 'main')}>
        <Select className="h-12 w-full" placeholder="Select type" allowClear>
          <Select.Option value="static">static</Select.Option>
          <Select.Option value="dynamic">dynamic</Select.Option>
        </Select>
      </Form.Item>
    </div>
  );
}
