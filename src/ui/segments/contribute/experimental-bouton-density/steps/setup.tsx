'use client';

import { Form, Input } from 'antd';

import { ExperimentalBoutonDensitySchema } from '@/ui/segments/contribute/experimental-bouton-density/schema';
import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  renderLabel,
  createZodFieldValidator,
  RequiredFieldMarker,
} from '@/ui/segments/contribute/shared/helpers';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

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
    <div className="h-full w-full">
      <Form.Item
        name={['setup', 'name']}
        label={renderLabel('Name', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(ExperimentalBoutonDensitySchema, 'setup.name', form),
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
              ExperimentalBoutonDensitySchema,
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
              ExperimentalBoutonDensitySchema,
              'setup.brain_region_id',
              form
            ),
          },
        ]}
      >
        <BrainRegionDropdown />
      </Form.Item>
    </div>
  );
}
