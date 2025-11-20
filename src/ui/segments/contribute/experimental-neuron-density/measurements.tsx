// measurements.tsx

import { Form, InputNumber, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Card } from '@/ui/molecules/card';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import {
  label,
  ExperimentalNeuronDensitySchema,
  zodFieldValidator,
} from '@/ui/segments/contribute/experimental-neuron-density/helpers';

export function Measurements() {
  const form = Form.useFormInstance();

  const NAME_OPTIONS = [
    'mean',
    'median',
    'mode',
    'variance',
    'data_point',
    'sample_size',
    'standard_error',
    'standard_deviation',
    'raw',
    'minimum',
    'maximum',
    'sum',
  ].map((value) => ({
    label: value.replace('_', ' '),
    value,
  }));

  // Initializing with undefined/null is fine, as the submit-entity.tsx fix handles the payload corruption.
  const defaultMeasurement = { name: null, value: null, unit: '1/mm³' };
  return (
    <div className="h-full w-full">
      <Form.List name="measurements">
        {}
        {(fields, { add: _add, remove: _remove }) => (
          <>
            <div className="flex flex-col gap-4">
              {}
              {fields.map((field, _index) => (
                <Card key={field.key} className="p-4">
                  <div className="flex w-full flex-row items-start justify-between gap-4">
                    <div className="flex w-full flex-col gap-y-4">
                      {/* Measurement Name */}
                      <Form.Item
                        name={[field.name, 'name']}
                        key={`${field.key}-name`}
                        label={label('Name', 'main', <sup className="text-destructive">*</sup>)}
                        rules={[
                          {
                            validator: zodFieldValidator(
                              ExperimentalNeuronDensitySchema,
                              `measurements.${field.name}.name`, // Dynamic Zod path
                              form
                            ),
                          },
                        ]}
                      >
                        <Select
                          className="h-12 w-full"
                          placeholder="Select data type"
                          options={NAME_OPTIONS}
                        />
                      </Form.Item>

                      {/* Measurement Value */}
                      <Form.Item
                        name={[field.name, 'value']}
                        key={`${field.key}-value`}
                        label={label(
                          'Value in cells/mm³',
                          'main',
                          <sup className="text-destructive">*</sup>
                        )}
                        rules={[
                          {
                            validator: zodFieldValidator(
                              ExperimentalNeuronDensitySchema,
                              `measurements.${field.name}.value`, // Dynamic Zod path
                              form
                            ),
                          },
                        ]}
                        getValueFromEvent={(value) => (value === null ? undefined : value)}
                      >
                        <InputNumber
                          placeholder="Enter cells/mm³"
                          size="large"
                          className="h-12 w-full rounded-full placeholder:text-sm"
                          controls={false}
                        />
                      </Form.Item>

                      {/* Hidden Field for Unit - MUST use Input for the string value */}
                      <Form.Item
                        // FIX: Manually pass props to avoid Prop spreading error
                        name={[field.name, 'unit']}
                        key={`${field.key}-unit`}
                        hidden
                      >
                        <Input style={{ display: 'none' }} />
                      </Form.Item>
                    </div>
                    {/* Delete Button */}
                    {fields.length > 0 && (
                      <div className="mt-8 ml-2 flex h-12 flex-shrink-0 items-center">
                        <Button
                          rounded
                          variant="destructive"
                          size="lg"
                          type="button"
                          className="size-12"
                          // Manually remove item for stable state update
                          onClick={() => {
                            const current = (form.getFieldValue('measurements') ||
                              []) as Array<any>;
                            const newMeasurements = current.filter((_, i) => i !== field.name);
                            form.setFieldValue('measurements', newMeasurements);
                          }}
                        >
                          <DeleteOutlined />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Add Button */}
            <div className="mt-4 flex items-center justify-end gap-x-2">
              <Button
                rounded
                type="button"
                variant="outline"
                size="lg"
                // Manually add item for stable state update
                onClick={() => {
                  const current = (form.getFieldValue('measurements') || []) as Array<any>;
                  form.setFieldValue('measurements', [...current, defaultMeasurement]);
                }}
                className={cn(
                  'text-primary-6 bg-background disabled:bg-neutral-1 hover:bg-neutral-1',
                  'hover:border-primary-7 hover:text-primary-7 w-max',
                  'disabled:text-label shrink-0',
                  'not-disabled:bg-primary-9 not-disabled:text-white!',
                  'not-disabled:hover:bg-primary-8'
                )}
              >
                <span>Add measurement</span>
                <PlusOutlined />
              </Button>
            </div>
          </>
        )}
      </Form.List>
    </div>
  );
}
