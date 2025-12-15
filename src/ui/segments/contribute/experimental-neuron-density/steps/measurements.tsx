// measurements.tsx

import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Form, InputNumber, Space } from 'antd';

import type { TMeasurement } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import { MeasurementStatistic } from '@/api/entitycore/types/shared/global';
import { createZodFieldValidator, renderLabel } from '@/ui/segments/contribute/shared';
import { SelectPopoverFormItem } from '@/ui/molecules/select-popover';
import { Button } from '@/ui/molecules/button';
import { Card } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

// CHANGE 1: Define the fixed unit string
const FIXED_UNIT = '1/mm³';

export function Measurements() {
  const form = Form.useFormInstance();

  const NAME_OPTIONS = Object.values(MeasurementStatistic).map((stat) => ({
    label: stat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: stat,
  }));

  // REMOVED: UNIT_OPTIONS is no longer needed

  const NameOptionsFormInput = SelectPopoverFormItem({
    options: NAME_OPTIONS,
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
  });

  // REMOVED: UnitOptionsFormInput is no longer needed

  return (
    <div className="h-full w-full">
      <Form.List
        name="measurements"
        initialValue={[{ name: undefined, unit: FIXED_UNIT, value: undefined }]}
      >
        {(fields, { remove }) => (
          <>
            <div className="flex flex-col gap-4">
              {fields.map((field) => {
                // CHANGE 2: Ensure unit is set to FIXED_UNIT when field is rendered
                const currentUnit = form.getFieldValue(['measurements', field.name, 'unit']);
                if (!currentUnit) {
                  form.setFieldValue(['measurements', field.name, 'unit'], FIXED_UNIT);
                }

                return (
                  <Card key={field.key} className="relative gap-0 p-5 shadow-sm!" borderless>
                    <div className="flex w-full items-end justify-center gap-x-4">
                      <Space.Compact className="flex w-full gap-2">
                        <Form.Item
                          name={[field.name, 'name']}
                          label={renderLabel(
                            'Name',
                            'main',
                            <sup className="text-destructive">*</sup>
                          )}
                          rules={[
                            {
                              validator: createZodFieldValidator(
                                ExperimentalNeuronDensitySchema,
                                `measurements.${field.name}.name`,
                                form
                              ),
                            },
                          ]}
                          className="flex-1"
                        >
                          <NameOptionsFormInput />
                        </Form.Item>

                        {/* REMOVED: The Form.Item for 'unit' is deleted here */}

                        <Form.Item
                          name={[field.name, 'value']}
                          label={renderLabel(
                            'Value (cells/mm³)',
                            'main',
                            <sup className="text-destructive">*</sup>
                          )}
                          rules={[
                            {
                              validator: createZodFieldValidator(
                                ExperimentalNeuronDensitySchema,
                                `measurements.${field.name}.value`,
                                form
                              ),
                            },
                          ]}
                          getValueFromEvent={(value) => (value === null ? undefined : value)}
                          className="flex-1"
                        >
                          <InputNumber
                            placeholder="Enter value"
                            size="large"
                            className="h-12 w-full rounded-full! placeholder:text-sm"
                            controls={false}
                          />
                        </Form.Item>
                        <Form.Item label={<div className="h-[14px]" />}>
                          <Button
                            rounded
                            type="button"
                            variant="icon"
                            size="lg"
                            disabled={fields.length === 1}
                            className="hover:bg-neutral-1 bg-background disabled:text-label hover:text-destructive size-12"
                            onClick={() => remove(field.name)}
                          >
                            <DeleteOutlined />
                          </Button>
                        </Form.Item>
                      </Space.Compact>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-end gap-x-2">
              <Button
                rounded
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  const current = form.getFieldValue('measurements') as Array<TMeasurement>;
                  form.setFieldValue('measurements', [
                    ...(current ?? []),
                    // CHANGE 3: Initialize new measurement with the fixed unit
                    { name: undefined, unit: FIXED_UNIT, value: undefined },
                  ]);
                }}
                disabled={(() => {
                  const measurements = form.getFieldValue('measurements') as Array<TMeasurement>;
                  return measurements?.some((measurement) => {
                    // CHANGE 4: Only check name and value (2 fields) for partial fill
                    const filledFields = [measurement.name, measurement.value].filter(
                      (field) => field !== undefined && field !== null && field !== ''
                    );
                    // If partially filled (some but not all fields), disable the button
                    return filledFields.length > 0 && filledFields.length < 2;
                  });
                })()}
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
