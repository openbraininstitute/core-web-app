'use client';

import { InfoCircleFilled } from '@ant-design/icons';
import { DatePicker, Form, Input, InputNumber, Space } from 'antd';
import dayjs from 'dayjs';
import { upperFirst } from 'es-toolkit/compat';

import {
  ElectricalRecordingOrigin,
  ElectricalRecordingOriginDictionary,
  RecordingType,
} from '@/api/entitycore/types/entities/electrical-cell-recording';
import { SelectPopoverFormItem } from '@/ui/molecules/select-popover';
import {
  ElectricalCellRecordingSchema,
  RECORDING_LOCATION_OPTIONS,
} from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { BrainRegionSelector } from '@/ui/segments/contribute/shared/components/brain-region-selector';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { cn } from '@/utils/css-class';

export function Setup() {
  const form = Form.useFormInstance();

  const RecordingTypeFormInput = SelectPopoverFormItem<typeof RecordingType>({
    options: Object.values(RecordingType).map(({ key, label }) => ({
      value: key,
      label: upperFirst(label),
    })),
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
    placeholder: 'Select recording type',
  });

  const RecordingOriginFormInput = SelectPopoverFormItem<typeof ElectricalRecordingOrigin>({
    options: Object.values(ElectricalRecordingOrigin)
      .filter((o) => o.key !== ElectricalRecordingOriginDictionary.InSilico)
      .map(({ key, label }) => ({
        value: key,
        label: upperFirst(label),
      })),
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
    placeholder: 'Select recording origin',
  });

  const RecordingLocationFormInput = SelectPopoverFormItem({
    options: RECORDING_LOCATION_OPTIONS,
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
    placeholder: 'Select recording location',
  });

  return (
    <div className="h-full w-full">
      <Form.Item
        name={['setup', 'name']}
        label={renderLabel('Name', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(ElectricalCellRecordingSchema, 'setup.name', form),
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
              ElectricalCellRecordingSchema,
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
              ElectricalCellRecordingSchema,
              'setup.brain_region_id',
              form
            ),
          },
        ]}
      >
        <BrainRegionSelector />
      </Form.Item>

      <Form.Item
        name={['setup', 'experiment_date']}
        label={renderLabel('Experiment date', 'main')}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
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
        label={renderLabel('Contact email', 'main')}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(
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
        label={renderLabel('Published in', 'main')}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.published_in',
              form
            ),
          },
        ]}
      >
        <Input className="h-12 rounded-full placeholder:text-sm" placeholder="Enter published in" />
      </Form.Item>

      <Form.Item
        label={renderLabel('Location (x, y, z)', 'main')}
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
                validator: createZodFieldValidator(
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
                validator: createZodFieldValidator(
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
                validator: createZodFieldValidator(
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
        label={renderLabel('Liquid junction potential', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(ElectricalCellRecordingSchema, 'ljp', form),
          },
        ]}
      >
        <InputNumber
          className={cn(
            'h-12 w-full rounded-full! placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden',
            '[&_.ant-input-number-in-form-item]:rounded-l-full!',
            '[&_.ant-input-number-group-addon]:rounded-r-full!'
          )}
          placeholder="Enter ljp value (mV)"
          min={-150}
          max={150}
          step={0.1}
          defaultValue={0.0}
          size="large"
          addonAfter="mV"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'recording_location']}
        label={renderLabel('Recording location', 'main')}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.recording_location',
              form
            ),
          },
        ]}
      >
        <RecordingLocationFormInput />
      </Form.Item>

      <Form.Item
        name={['setup', 'recording_type']}
        label={renderLabel('Recording type', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.recording_type',
              form
            ),
          },
        ]}
      >
        <RecordingTypeFormInput />
      </Form.Item>

      <Form.Item
        name={['setup', 'recording_origin']}
        label={renderLabel('Recording origin', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.recording_origin',
              form
            ),
          },
        ]}
      >
        <RecordingOriginFormInput />
      </Form.Item>

      <Form.Item
        name={['setup', 'temperature']}
        label={renderLabel('Temperature', 'main')}
        required={false}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(
              ElectricalCellRecordingSchema,
              'setup.temperature',
              form
            ),
          },
        ]}
      >
        <InputNumber
          className={cn(
            'h-12 w-full rounded-full! placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden',
            '[&_.ant-input-number-in-form-item]:rounded-l-full!',
            '[&_.ant-input-number-group-addon]:rounded-r-full!'
          )}
          size="large"
          placeholder="Enter temperature"
          step={0.1}
          addonAfter="°C"
        />
      </Form.Item>

      <Form.Item
        name="comment"
        label={renderLabel('Comment', 'main')}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(ElectricalCellRecordingSchema, 'comment', form),
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
