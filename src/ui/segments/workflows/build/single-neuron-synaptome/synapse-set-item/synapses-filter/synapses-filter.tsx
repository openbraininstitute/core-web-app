import { CloseOutlined, DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Form, type FormInstance, InputNumber } from 'antd';
import React from 'react';

import { SettingAdjustment } from '@/components/icons/SettingAdjustment';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export interface SynapsesFilterProps {
  className?: string;
  form: FormInstance;
  config?: {
    exclusion_rules?:
      | {
          id: string;
          distance_soma_gte?: number | null | undefined;
          distance_soma_lte?: number | null | undefined;
        }[]
      | null;
  };
}

export function SynapsesFilter({ className, form, config }: SynapsesFilterProps) {
  const [displayExclusionRules, toggleDisplayExclusionRules] = React.useReducer(
    (val) => !val,
    false
  );
  const showExclusionRules = () => {
    if (config && !config.exclusion_rules?.length && !displayExclusionRules) {
      addNewExclusionRule();
    }
    toggleDisplayExclusionRules();
  };
  const exclusionRuleNotFilled =
    config?.exclusion_rules?.some((p) => !p.distance_soma_gte && !p.distance_soma_lte) &&
    !displayExclusionRules;
  const addNewExclusionRule = () => {
    const id = crypto.randomUUID();
    const currentRules = form.getFieldValue(['exclusion_rules']) || [];
    const newRuleIndex = currentRules.length;

    form.setFieldValue(
      ['exclusion_rules'],
      [
        ...currentRules,
        {
          id,
          distance_soma_gte: null,
          distance_soma_lte: null,
        },
      ]
    );

    setTimeout(() => {
      form
        .validateFields([
          ['exclusion_rules', newRuleIndex, 'distance_soma_gte'],
          ['exclusion_rules', newRuleIndex, 'distance_soma_lte'],
        ])
        .catch(() => {});
    }, 0);
  };

  return (
    <div
      className={cn(
        className,
        'border-neutral-3 w-full border',
        displayExclusionRules
          ? 'rounded-2xl p-4 text-gray-400'
          : 'text-primary-8 rounded-full py-1 pr-1 pl-4'
      )}
    >
      <button
        id="exclusion-rules-header"
        className="flex w-full items-center justify-between gap-4"
        onClick={showExclusionRules}
        type="button"
      >
        <div className="text-left text-lg font-medium">
          Filter synapses{' '}
          {Boolean(config?.exclusion_rules?.length) && (
            <span className="text-sm font-light text-gray-500">
              ({config?.exclusion_rules?.length})
            </span>
          )}
          {exclusionRuleNotFilled && (
            <p className="text-sm font-light text-pink-700">Some exclusion rules are missing.</p>
          )}
        </div>
        <div className="flex items-center justify-center rounded-full p-2 hover:bg-gray-200">
          {displayExclusionRules ? (
            <CloseOutlined />
          ) : (
            <SettingAdjustment className="text-primary-8 h-5 w-5" />
          )}
        </div>
      </button>
      <div
        id="exclusion-rules-body"
        className={cn(
          'w-full rounded-2xl',
          displayExclusionRules
            ? 'mt-4 flex h-full flex-col opacity-100'
            : 'invisible h-0 opacity-0'
        )}
      >
        <Form.List name={['exclusion_rules']}>
          {(fields, { remove: removeRule }) => (
            <div className="flex w-full flex-col gap-3">
              {fields.map((f, indx) => {
                return (
                  <div key={f.key} className="w-full rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-neutral-4 text-lg font-light capitalize">
                        rule {indx + 1}
                      </div>
                      <Button
                        aria-label="Delete rule"
                        onClick={() => {
                          removeRule(indx);
                        }}
                        variant="ghost"
                        className="hover:bg-neutral-2 h-[30px]! w-[30px]! rounded-md"
                      >
                        <DeleteOutlined className="text-primary-8 h-5 w-5" />
                      </Button>
                    </div>
                    <div className="text-primary-8 mb-4 text-left text-lg font-bold">
                      Exclude synapses that are:
                      <p className="text-base font-light">where the distance from soma is:</p>
                    </div>
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                      <div className="flex w-full flex-col items-start justify-start gap-1">
                        <div className="text-primary-8 flex w-full items-start justify-start text-sm font-light">
                          greater or equal to
                        </div>
                        <Form.Item
                          className="mb-2"
                          name={[f.name, 'distance_soma_gte']}
                          validateTrigger={['onChange', 'onBlur']}
                          rules={[
                            {
                              validator: (_, value) => {
                                const allValues = form.getFieldsValue();
                                const currentRule = allValues.exclusion_rules?.[f.name];
                                const gteValue = value;
                                const lteValue = currentRule?.distance_soma_lte;

                                if (!gteValue && gteValue !== 0 && !lteValue && lteValue !== 0) {
                                  return Promise.reject(
                                    new Error('At least one distance value must be provided')
                                  );
                                }

                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <InputNumber
                            placeholder="Enter a value..."
                            className="[&_input]:text-primary-9! w-full"
                            size="large"
                            min={0}
                            onChange={() => {
                              // Trigger validation on the other field when this changes
                              form.validateFields([
                                ['exclusion_rules', f.name, 'distance_soma_lte'],
                              ]);
                            }}
                          />
                        </Form.Item>
                      </div>
                      <div className="flex w-full flex-col items-start justify-center gap-1">
                        <div className="text-primary-8 flex w-full items-start justify-start text-sm font-light">
                          less or equal to
                        </div>
                        <Form.Item
                          className="mb-2"
                          name={[f.name, 'distance_soma_lte']}
                          validateTrigger={['onChange', 'onBlur']}
                          rules={[
                            {
                              validator: (_, value) => {
                                const allValues = form.getFieldsValue();
                                const currentRule = allValues.exclusion_rules?.[f.name];
                                const lteValue = value;
                                const gteValue = currentRule?.distance_soma_gte;

                                // At least one field must be provided
                                if (!gteValue && gteValue !== 0 && !lteValue && lteValue !== 0) {
                                  return Promise.reject(
                                    new Error('At least one distance value must be provided')
                                  );
                                }

                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <InputNumber
                            placeholder="Enter a value..."
                            className="[&_input]:text-primary-9! w-full"
                            size="large"
                            min={0}
                            onChange={() => {
                              // Trigger validation on the other field when this changes
                              form.validateFields([
                                ['exclusion_rules', f.name, 'distance_soma_gte'],
                              ]);
                            }}
                          />
                        </Form.Item>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Form.List>
        <Button
          rounded
          type="button"
          variant="outline"
          onClick={addNewExclusionRule}
          aria-label="Add new rule"
          className="mt-3 max-w-max"
        >
          <PlusCircleOutlined />
          Add rule
        </Button>
      </div>
    </div>
  );
}
