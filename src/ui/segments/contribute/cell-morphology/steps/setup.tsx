'use client';

import { InfoCircleFilled } from '@ant-design/icons';
import { DatePicker, Form, Input } from 'antd';
import dayjs from 'dayjs';

import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { BrainRegionSelector } from '@/ui/segments/contribute/shared/components/brain-region-selector';
import { LocationFields } from '@/ui/segments/contribute/shared/components/location-fields';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { cn } from '@/utils/css-class';

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
            validator: createZodFieldValidator(CellMorphologySchema, 'setup.name', form),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full! placeholder:text-sm"
          size="large"
          placeholder="Enter cell morphology name"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'description']}
        label={renderLabel('Description', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(CellMorphologySchema, 'setup.description', form),
          },
        ]}
      >
        <Input.TextArea
          rows={5}
          className="rounded-xl! placeholder:text-sm"
          placeholder="Enter cell morphology description"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'brain_region_id']}
        label={renderLabel('Brain region', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(CellMorphologySchema, 'setup.brain_region_id', form),
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
            validator: createZodFieldValidator(CellMorphologySchema, 'setup.experiment_date', form),
          },
        ]}
      >
        <DatePicker className="h-12 w-full rounded-full!" format="DD/MM/YYYY" maxDate={dayjs()} />
      </Form.Item>

      <Form.Item
        name={['setup', 'contact_email']}
        label={renderLabel('Contact email', 'main')}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(CellMorphologySchema, 'setup.contact_email', form),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full! placeholder:text-sm"
          placeholder="Enter contact email"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'published_in']}
        label={renderLabel('Published in', 'main')}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(CellMorphologySchema, 'setup.published_in', form),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full! placeholder:text-sm"
          placeholder="Enter published in"
        />
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
        <LocationFields schema={CellMorphologySchema} form={form} />
      </Form.Item>
    </div>
  );
}
