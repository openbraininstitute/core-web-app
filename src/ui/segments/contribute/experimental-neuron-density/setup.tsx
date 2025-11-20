import { Form, Input } from 'antd';

import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';
import {
  label,
  ExperimentalNeuronDensitySchema,
  zodFieldValidator,
} from '@/ui/segments/contribute/experimental-neuron-density/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';

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
        label={label('Name', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(ExperimentalNeuronDensitySchema, 'setup.name', form),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          size="large"
          placeholder="Enter experimental cell density name"
        />
      </Form.Item>
      <Form.Item
        name={['setup', 'description']}
        label={label('Description', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(
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
          placeholder="Enter experimental cell density description"
        />
      </Form.Item>
      <Form.Item
        name={['setup', 'brain_region_id']}
        label={label('Brain region', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(
              ExperimentalNeuronDensitySchema,
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
