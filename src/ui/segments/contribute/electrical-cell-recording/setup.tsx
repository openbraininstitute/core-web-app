import { DatePicker, Form, Input, InputNumber, Select, Space } from 'antd';

import { InfoCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ILicense } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import { BrainRegionDropdownWithFormItem } from '@/features/brain-region-dropdown/form-dropdown';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';
import {
  label,
  ElectricalCellRecordingSchema,
  zodFieldValidator,
} from '@/ui/segments/contribute/electrical-cell-recording/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import { getElectricalRecordingStimulus } from '@/api/entitycore/queries/general/electricalrecordingstimulus';

// Options for the dropdown menus
const RECORDING_TYPE_OPTIONS = ['intracellular', 'extracellular', 'both', 'unknown'].map(
  (value) => ({ label: value.replace('_', ' '), value })
);

const RECORDING_ORIGIN_OPTIONS = ['in_vivo', 'in_vitro', 'in_silico', 'unknown'].map((value) => ({
  label: value.replace('_', ' '),
  value,
}));

const RECORDING_LOCATION_OPTIONS = ['dend', 'axon', 'soma', 'apic'].map((value) => ({
  label: value.replace('_', ' '),
  value,
}));

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

  const ElectricalRecordingStimulusDropdown = AsyncSelectFormItem<PaginationFilter, ILicense>({
    dataKey: ['electricalrecordingstimulus'],
    queryFn: getElectricalRecordingStimulus,
    getOptionLabel: (l) => l.name,
    getOptionValue: (l) => l.id,
    placeholder: 'Select an electrical recording stimulus...',
    searchPlaceholder: 'Search stimuli...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: false,
  });

  return (
    <div className="h-full w-full">
      <Form.Item
        name={['setup', 'name']}
        label={label('Name', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(ElectricalCellRecordingSchema, 'setup.name', form),
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
        label={label('Description', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(ElectricalCellRecordingSchema, 'setup.description', form),
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
        label={label('Brain region', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.brain_region_id',
              form
            ),
          },
        ]}
      >
        <BrainRegionDropdown />
      </Form.Item>
      <Form.Item
        name={['setup', 'experiment_date']}
        label={label('Experiment date', 'main')}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.experiment_date',
              form
            ),
          },
        ]}
      >
        <DatePicker className="h-12 w-full rounded-full" format="DD/MM/YYYY" maxDate={dayjs()} />
      </Form.Item>
      <Form.Item
        name={['setup', 'contact_email']}
        label={label('Contact email', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.contact_email',
              form
            ),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          placeholder="Enter contact email"
        />
      </Form.Item>
      <Form.Item
        name={['setup', 'published_in']}
        label={label('Published in', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(ElectricalCellRecordingSchema, 'setup.published_in', form),
          },
        ]}
      >
        <Input className="h-12 rounded-full placeholder:text-sm" placeholder="Enter published in" />
      </Form.Item>
      <Form.Item
        label={label('Location (x, y, z)', 'main')}
        tooltip={{
          icon: <InfoCircleFilled />,
          className: '[&_svg]:text-primary-8!',
          rootClassName: cn(
            '[&_.ant-tooltip-inner]:bg-white [&_.ant-tooltip-inner]:text-primary-8 ',
            '[&_.ant-tooltip-arrow]:before:bg-white'
          ),
          title: (
            <div className="flex items-center gap-1">
              <p>Learn more about this field</p>
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/40800985/"
                rel="noopener noreferrer"
                target="_blank"
                className="text-primary-9 underline"
              >
                here
              </a>
            </div>
          ),
        }}
      >
        <Space.Compact className="flex gap-2">
          <Form.Item
            name={['setup', 'location', 'x']}
            required={false}
            validateTrigger={['onChange', 'onBlur']}
            rules={[
              {
                validator: zodFieldValidator(
                  ElectricalCellRecordingSchema,
                  'setup.location.x',
                  form
                ),
              },
            ]}
            className="w-1/3"
          >
            <InputNumber
              placeholder="X (microns)"
              size="large"
              className="h-12 w-full rounded-full placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden"
            />
          </Form.Item>
          <Form.Item
            name={['setup', 'location', 'y']}
            required={false}
            validateTrigger={['onChange', 'onBlur']}
            rules={[
              {
                validator: zodFieldValidator(
                  ElectricalCellRecordingSchema,
                  'setup.location.y',
                  form
                ),
              },
            ]}
            className="w-1/3"
          >
            <InputNumber
              placeholder="Y (microns)"
              size="large"
              className="h-12 w-full rounded-full placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden"
            />
          </Form.Item>
          <Form.Item
            name={['setup', 'location', 'z']}
            required={false}
            validateTrigger={['onChange', 'onBlur']}
            rules={[
              {
                validator: zodFieldValidator(
                  ElectricalCellRecordingSchema,
                  'setup.location.z',
                  form
                ),
              },
            ]}
            className="w-1/3"
          >
            <InputNumber
              placeholder="Z (microns)"
              size="large"
              className="h-12 w-full rounded-full placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden"
            />
          </Form.Item>
        </Space.Compact>
      </Form.Item>

      <Form.Item
        name={['setup', 'ljp']}
        label={label('Liquid junction potential', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(ElectricalCellRecordingSchema, 'setup.ljp', form),
          },
        ]}
      >
        <InputNumber
          className="w-full rounded-xl placeholder:text-sm"
          placeholder="Enter ljp value (mV)"
          min={-150}
          max={150}
          step={0.1}
          addonAfter="mV" // Optional: Clearly display the unit
        />
      </Form.Item>

      {/* --- Newly Added Optional Fields --- */}

      <Form.Item
        name={['setup', 'recording_location']}
        label={label('Recording location', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.recording_location',
              form
            ),
          },
        ]}
      >
        <Select
          className="h-12 w-full"
          placeholder="Select recording type"
          options={RECORDING_LOCATION_OPTIONS}
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'recording_type']}
        label={label('Recording type', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.recording_type',
              form
            ),
          },
        ]}
      >
        <Select
          className="h-12 w-full"
          placeholder="Select recording type"
          options={RECORDING_TYPE_OPTIONS}
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'recording_origin']}
        label={label('Recording origin', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.recording_origin',
              form
            ),
          },
        ]}
      >
        <Select
          className="h-12 w-full"
          placeholder="Select recording origin"
          options={RECORDING_ORIGIN_OPTIONS}
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'stimuli_id']}
        label={label('Stimulus', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(ElectricalCellRecordingSchema, 'setup.stimuli_id', form),
          },
        ]}
      >
        <ElectricalRecordingStimulusDropdown />
      </Form.Item>

      <Form.Item
        name={['setup', 'temperature']}
        label={label('Temperature', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(ElectricalCellRecordingSchema, 'setup.temperature', form),
          },
        ]}
      >
        <InputNumber
          className="h-12 w-full rounded-full placeholder:text-sm"
          size="large"
          placeholder="Enter temperature (°C)"
          step={0.1}
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'comment']}
        label={label('Comment', 'main')}
        rules={[
          {
            required: false,
            validator: zodFieldValidator(ElectricalCellRecordingSchema, 'setup.comment', form),
          },
        ]}
      >
        <Input.TextArea
          rows={3}
          className="rounded-xl placeholder:text-sm"
          placeholder="Add any relevant notes"
        />
      </Form.Item>
    </div>
  );
}
