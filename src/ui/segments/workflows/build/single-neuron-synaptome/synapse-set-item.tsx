'use client';

import {
  CloseOutlined,
  DeleteOutlined,
  InfoCircleFilled,
  LoadingOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { Form, Input, InputNumber, Select } from 'antd';
import findIndex from 'es-toolkit/compat/findIndex';
import groupBy from 'es-toolkit/compat/groupBy';
import map from 'es-toolkit/compat/map';
import { useAtom, useAtomValue } from 'jotai';
import { useSearchParams } from 'next/navigation';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Color } from 'three';
import {
  SingleNeuronSynaptomeConfigurationSchema,
  type TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import {
  getSingleNeuronSynaptomePlacement,
  validateSingleNeuronSynapseGenerationFormula,
} from '@/api/small-scale-simulator';
import { tryCatch } from '@/api/utils';
import { ArrowSyncFilled } from '@/components/icons/buttons';
import { SettingAdjustment } from '@/components/icons/SettingAdjustment';
import {
  sendDisplaySynapses3DEvent,
  sendRemoveSynapses3DEvent,
} from '@/components/neuron-viewer/hooks/events';
import { useAppNotification } from '@/components/notification';
import { SECTION_TARGET_MAPPING } from '@/features/entities/single-neuron-synaptome/build/elements/constants';
import { messages } from '@/i18n/en/synaptome';
import { createBubblesInstanced } from '@/services/bluenaas-single-cell/renderer-utils';
import { synapsesPlacementAtom } from '@/state/synaptome';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { neuronSectionNamesAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { classNames, getRandomIntInclusive } from '@/util/utils';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

type Props = {
  sessionId: string;
};

const label = (text: string, required: boolean = false, cls?: string) => (
  <span className={classNames('text-neutral-4/80 text-sm leading-5 font-light uppercase', cls)}>
    {text} {required && <sup className="text-lg text-red-400">*</sup>}
  </span>
);

function updateSeeds(
  synaptomeMap: Map<string, TSingleNeuronSynaptomeConfiguration>,
  getNewSeed: (oldSeed: number, key: string) => number
): Map<string, TSingleNeuronSynaptomeConfiguration> {
  return new Map(
    map(Array.from(synaptomeMap.entries()), ([key, config]) => [
      key,
      {
        ...config,
        seed: getNewSeed(config.seed, key),
      },
    ])
  );
}

export function SynapseSet({ sessionId }: Props) {
  const [form] = Form.useForm();
  const params = useSearchParams();
  const notification = useAppNotification();
  const { virtualLabId, projectId } = useWorkspace();
  const secNames = useAtomValue(neuronSectionNamesAtomFamily(sessionId));
  const [isFormValid, setIsFormValid] = useState(false);
  const [visualizeLoading, setLoadingVisualize] = useState(false);
  const [synapsesPlacement, setSynapsesPlacementAtom] = useAtom(synapsesPlacementAtom);
  const [displayExclusionRules, toggleDisplayExclusionRules] = useReducer((val) => !val, false);
  const [displayFormulaHelp, toggleFormulaHelp] = useReducer((val) => !val, false);
  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const setId = params.get('set');
  const modelId = sessionValue?.memodel?.id;
  const synapses = sessionValue?.synapseSets;
  const config = setId ? synapses?.get(setId) : undefined;

  const configRef = useRef(config);
  const previousSetIdRef = useRef<string | null>(null);

  const groupedSections = Object.keys(
    groupBy(secNames, (str) => {
      const bracketIndex = findIndex(str, (char) => char === '[');
      return bracketIndex !== -1 ? str.slice(0, bracketIndex) : str;
    })
  );

  const hasApic = groupedSections.includes('apic');

  const targetOptions = groupedSections.map((value) => ({
    value,
    label:
      value === 'dend' && !hasApic
        ? 'Dendrites'
        : SECTION_TARGET_MAPPING[value as keyof typeof SECTION_TARGET_MAPPING],
  }));

  const validateFormValues = async (values: TSingleNeuronSynaptomeConfiguration) => {
    try {
      await SingleNeuronSynaptomeConfigurationSchema.parseAsync(values);
      setIsFormValid(true);
    } catch (err) {
      log('error', 'synapse set validation error', err);
      setIsFormValid(false);
    }
  };

  const onValuesChange = (_: any, values: TSingleNeuronSynaptomeConfiguration) => {
    validateFormValues(values);
  };

  useEffect(() => {
    if (previousSetIdRef.current !== setId) {
      previousSetIdRef.current = setId;

      if (config) {
        form.resetFields();
        form.setFieldsValue(config);
        configRef.current = config;
      } else {
        form.resetFields();
        configRef.current = undefined;
      }
    }
  }, [setId, config, form]);

  const onHideSynapse = () => {
    if (config?.id) {
      const currentSynapsesPlacementConfig = synapsesPlacement?.[config.id];
      if (currentSynapsesPlacementConfig?.meshId) {
        sendRemoveSynapses3DEvent(config?.id, currentSynapsesPlacementConfig.meshId);
        setSynapsesPlacementAtom({
          ...synapsesPlacement,
          [config.id]: {
            ...currentSynapsesPlacementConfig,
            count: undefined,
            meshId: undefined,
          },
        });
      }
    }
  };

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

  const onTargetChange = async (newTarget?: keyof typeof SECTION_TARGET_MAPPING) => {
    if (config) {
      const tempSessionValue = sessionValue;
      const currentValues = form.getFieldsValue(true);
      if (newTarget === 'soma') {
        config.target = newTarget;
        config.formula = undefined;
        config.soma_synapse_count = 50;
        tempSessionValue?.synapseSets?.set(config.id, config);

        setSessionValue({
          ...tempSessionValue,
          seed: tempSessionValue?.seed ?? 100,
          synapseSets: tempSessionValue?.synapseSets,
        });
        form.setFieldsValue({ target: 'soma', formula: undefined, soma_synapse_count: 50 });
        await validateFormValues(currentValues);
      }
      if (config?.target === 'soma' && newTarget !== 'soma') {
        config.soma_synapse_count = undefined;
        config.target = newTarget;
        tempSessionValue?.synapseSets?.set(config.id, config);
        setSessionValue({
          ...tempSessionValue,
          seed: tempSessionValue?.seed ?? 100,
          synapseSets: tempSessionValue?.synapseSets,
        });
        form.setFieldsValue({ target: newTarget, soma_synapse_count: undefined });
        await validateFormValues(currentValues);
      }
    }
  };

  const showExclusionRules = () => {
    if (config && !config.exclusion_rules?.length && !displayExclusionRules) {
      addNewExclusionRule();
    }
    toggleDisplayExclusionRules();
  };

  const exclusionRuleNotFilled =
    config?.exclusion_rules?.some((p) => !p.distance_soma_gte && !p.distance_soma_lte) &&
    !displayExclusionRules;

  const onVisualizationError = async (response?: Error) => {
    const index =
      findIndex(
        Array.from(sessionValue?.synapseSets?.entries() ?? []),
        ([key]) => key === config?.id
      ) + 1;
    if (!response) {
      notification.error({
        message: messages.GenerationSynapsesFailed.replace('$$', index.toString()),
        placement: 'topRight',
      });
      return;
    }

    try {
      notification.error({
        message: 'Failed to generate synapses, The error occurred in the server',
        placement: 'topRight',
      });
    } catch {
      notification.error({
        message: messages.GenerationSynapsesFailed.replace('$$', index.toString()),
        placement: 'topRight',
      });
    }
  };

  const onApplyChanges = async (values: TSingleNeuronSynaptomeConfiguration) => {
    if (config) {
      setLoadingVisualize(true);
      onHideSynapse();
      const seed = sessionValue?.seed!;
      try {
        const configSet = {
          color: config.color,
          id: config.id,
          seed: config.seed,
          name: values.name,
          formula: values.formula,
          target: values.target,
          type: values.type,
          exclusion_rules: values.exclusion_rules ?? null,
          soma_synapse_count: values.soma_synapse_count,
        };
        const { data, error } = await tryCatch(
          getSingleNeuronSynaptomePlacement({
            modelId: modelId!,
            ctx: { virtualLabId, projectId },
            payload: {
              seed,
              config: configSet,
            },
          })
        );

        if (error) return onVisualizationError(error);

        const synapsePositions = data.synapses
          .flat()
          .flatMap((p) => p.synapses)
          .map((o) => o.coordinates);

        const mesh = createBubblesInstanced(synapsePositions, new Color(config.color));
        sendDisplaySynapses3DEvent(config.id, mesh);

        const newSynapseSet = new Map(sessionValue?.synapseSets);
        const newSynapseCount = new Map(sessionValue?.synapseCount);
        newSynapseSet.set(config.id, configSet);
        newSynapseCount.set(config.id, synapsePositions.length);

        setSessionValue({
          ...sessionValue,
          seed: sessionValue?.seed ?? 100,
          synapseSets: newSynapseSet,
          synapseCount: newSynapseCount,
        });

        setSynapsesPlacementAtom({
          ...synapsesPlacement,
          [config.id]: {
            sectionSynapses: data.synapses,
            count: synapsePositions.length,
            meshId: mesh.uuid,
            synapsePlacementConfigId: config.id,
          },
        });

        configRef.current = configSet;
      } catch (_error) {
        return onVisualizationError();
      } finally {
        setLoadingVisualize(false);
      }
    }
  };

  const onChangeSeed = (value: number | null) => {
    setSessionValue({
      ...sessionValue,
      seed: value ?? 100,
      synapseSets: updateSeeds(
        sessionValue?.synapseSets ?? new Map(),
        () => Number(value) + getRandomIntInclusive(0, Number(value))
      ),
    });
    Array.from(sessionValue?.synapseSets?.entries() ?? []).forEach(([, v]) => {
      const mesh = synapsesPlacement?.[v.id]?.meshId;
      if (mesh) {
        sendRemoveSynapses3DEvent(v.id, mesh);
      }
    });
  };

  return (
    <div className="secondary-scrollbar h-full w-full overflow-x-hidden overflow-y-auto select-none">
      <div className="mb-4 flex w-full items-end justify-end px-3">
        <div className="flex items-center gap-2">
          {label('seed', true)}
          <InputNumber
            placeholder="Set a seed"
            defaultValue={sessionValue?.seed}
            size="large"
            min={0}
            precision={0}
            onChange={onChangeSeed}
            value={sessionValue?.seed}
            className="border-neutral-3! [&_.ant-input-number-input]:text-primary-9! max-w-[100px] rounded-md border-[1px]! font-bold"
          />
        </div>
      </div>
      <Form
        form={form}
        onValuesChange={onValuesChange}
        id="synapse-set-config"
        className={cn(
          'flex w-full flex-col items-center justify-between gap-2 text-lg font-bold',
          '[&_.ant-form-item-explain-error]:text-sm [&_.ant-form-item-explain-error]:font-light!'
        )}
        layout="vertical"
        requiredMark={false}
        onFinish={onApplyChanges}
      >
        <div className="mb-4 w-full px-3">
          <Form.Item hidden name="id">
            <input hidden readOnly />
          </Form.Item>
          <Form.Item hidden name="color">
            <input hidden readOnly />
          </Form.Item>
          <Form.Item hidden name="seed">
            <input hidden readOnly />
          </Form.Item>
          <Form.Item
            name={['name']}
            labelAlign="left"
            rules={[{ required: true, message: 'Please provide a name!' }]}
            validateTrigger="onBlur"
            label={label('Name', true)}
          >
            <Input
              placeholder="Name your set"
              size="large"
              className="border-neutral-3! text-primary-9! rounded-md border-[1px]! placeholder:text-base placeholder:font-light"
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item
              name={['target']}
              rules={[{ required: false, message: 'Please select a target!' }]}
              validateTrigger="onBlur"
              label={label('Target')}
              className="[&_.ant-select-arrow]:text-primary-8 [&_.ant-form-item-row]:mb-0 [&_.ant-form-item-row]:inline-block [&_.ant-form-item-row]:w-full [&_.ant-select-selector]:border-0!"
            >
              <Select
                allowClear
                placeholder="Select a target"
                size="large"
                className="border-neutral-3! [&_.ant-select-selection-item]:text-primary-9! rounded-md border-[1px]! [&_.ant-select-selection-item]:font-bold [&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!"
                popupClassName="[&_.ant-select-item-option-content]:text-primary-9!"
                disabled={!targetOptions.length}
                options={targetOptions}
                onChange={onTargetChange}
              />
            </Form.Item>
            <Form.Item
              name={['type']}
              rules={[{ required: true, message: 'Please select at least one type!' }]}
              label={label('Type', true)}
              validateTrigger="onBlur"
              className="[&_.ant-select-arrow]:text-primary-8 [&_.ant-form-item-row]:mb-0 [&_.ant-form-item-row]:inline-block [&_.ant-form-item-row]:w-full [&_.ant-select-selector]:border-0!"
            >
              <Select
                allowClear
                placeholder="Select a type"
                size="large"
                className="border-neutral-3! [&_.ant-select-selection-item]:text-primary-9! rounded-md border-[1px]! [&_.ant-select-selection-item]:font-bold [&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!"
                popupClassName="[&_.ant-select-item-option-content]:text-primary-9!"
                options={[
                  { value: 110, label: 'Excitatory Synapses' },
                  { value: 10, label: 'Inhibitory Synapses' },
                ]}
              />
            </Form.Item>
          </div>

          <div className="flex w-full items-start gap-4">
            {config?.target === 'soma' ? (
              <div className="w-full">
                <div className="flex w-full flex-col">
                  <div className={classNames('flex w-full items-center gap-2 pb-[8px]')}>
                    {label('Synapse Count', true)}
                  </div>
                  <Form.Item
                    id="soma_synapse_count"
                    name={['soma_synapse_count']}
                    rules={[
                      {
                        required: true,
                        message: 'Please provide a valid count for synapses on soma',
                      },
                    ]}
                    validateTrigger="onBlur"
                  >
                    <InputNumber
                      name="soma_synapse_count"
                      size="large"
                      className="border-neutral-3! [&_input]:text-primary-9! w-full rounded-md border-[1px]! placeholder:text-base placeholder:font-light"
                      min={0}
                      max={1000}
                    />
                  </Form.Item>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <div className="flex w-full flex-col">
                  <div
                    className={classNames(
                      'flex w-full items-center gap-2 pb-[8px]',
                      displayFormulaHelp && 'justify-between'
                    )}
                  >
                    {label('Synapse distribution formula', true, 'normal-case')}
                    {displayFormulaHelp ? (
                      <CloseOutlined className="text-gray-300" onClick={toggleFormulaHelp} />
                    ) : (
                      <InfoCircleFilled className="text-gray-300" onClick={toggleFormulaHelp} />
                    )}
                  </div>
                  <p
                    className={classNames(
                      'transition-height text-sm font-light text-gray-400',
                      displayFormulaHelp ? 'mb-4 h-full opacity-100' : 'mb-0 h-0 opacity-0'
                    )}
                  >
                    Supports advanced math functions (e.g., sin(x), log(x), ...). <br />
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-7"
                      href="https://docs.sympy.org/latest/index.html"
                    >
                      https://docs.sympy.org/latest/index.html
                    </a>
                  </p>
                </div>
                <input hidden readOnly name="distribution" value="formula" />
                <Form.Item
                  name={['formula']}
                  extra={<small className="font-light">x: distance from soma (µm)</small>}
                  rules={[
                    {
                      required: true,
                      message: 'Please provide a valid distribution formula!',
                      async validator(_, value) {
                        if (config?.target === 'soma') {
                          return Promise.resolve();
                        }
                        if (value) {
                          const result = await validateSingleNeuronSynapseGenerationFormula(value);
                          if (!result) return Promise.reject();
                          return Promise.resolve();
                        }
                        if (!value) return Promise.reject();
                      },
                    },
                  ]}
                  validateTrigger="onBlur"
                  className="[&_.ant-form-item-required]:w-full"
                >
                  <Input
                    placeholder="0.03*x*x + 0.004"
                    size="large"
                    className={classNames(
                      '[&_.ant-input]:text-primary-8 text-base font-bold italic [&_input]:placeholder:text-base! [&_input]:placeholder:font-light!',
                      '[&_.ant-input]:border-neutral-2 [&_.ant-input]:border [&_.ant-input]:border-r-0 [&_.ant-input]:py-2',
                      '[&_.ant-input-group-addon]:border-neutral-2 [&_.ant-input-group-addon]:border [&_.ant-input-group-addon]:py-2',
                      '[&_.ant-input-group-addon]: [&_.ant-input-group-addon]:border-l-0 [&_.ant-input-group-addon]:bg-white'
                    )}
                    addonAfter={
                      <span className="whitespace-nowrap text-gray-400 not-italic">
                        Synapses/µm
                      </span>
                    }
                  />
                </Form.Item>
              </div>
            )}
          </div>

          <div
            className={classNames(
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
                  <p className="text-sm font-light text-pink-700">
                    Some exclusion rules are missing.
                  </p>
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
              className={classNames(
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

                                      if (
                                        !gteValue &&
                                        gteValue !== 0 &&
                                        !lteValue &&
                                        lteValue !== 0
                                      ) {
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
                                      if (
                                        !gteValue &&
                                        gteValue !== 0 &&
                                        !lteValue &&
                                        lteValue !== 0
                                      ) {
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

          <div className="z-30 mt-4 flex items-center justify-end">
            <Button
              type="submit"
              rounded
              disabled={!isFormValid || visualizeLoading}
              size="lg"
              variant="success"
              className="shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-3">
                <div>Apply changes</div>
                {visualizeLoading ? (
                  <LoadingOutlined />
                ) : (
                  <ArrowSyncFilled className="size-5 text-lg" />
                )}
              </div>
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
