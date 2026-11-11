import { Form, Input, Select } from 'antd';
import { camelCase, get, startCase, toPairs } from 'es-toolkit/compat';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { DefaultInjectionColor } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { AmperageConfiguration } from '@/ui/segments/workflows/simulate/single-neuron/shared/amperage-configuration';
import {
  PROTOCOL_DETAILS,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  neuronSectionNamesAtomFamily,
  SimulationStatus,
  StimulationConfigurationAtomFamily,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  createZodValidator,
  getSessionKey,
  label,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  StimulationConfigurationSchema,
  StimulationMode,
  type TProtocolDetails,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

type Props = {
  sessionId: string;
  memodelId: string;
};

export function StimulationProtocol({ sessionId, memodelId }: Props) {
  const [form] = Form.useForm();
  const breakpoint = useDefaultBreakpoint();
  const sections = useAtomValue(neuronSectionNamesAtomFamily(sessionId));

  const spcKey = getSessionKey(STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const [spcState, updateSPC] = useAtom(StimulationConfigurationAtomFamily(spcKey));
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));

  useEffect(() => {
    form.setFieldsValue(spcState);
  }, [spcState, form]);

  const onValuesChange = (changedValues: any): void => {
    try {
      const updatedState = { ...spcState };
      let hasChanges = false;

      if (changedValues.inject_to !== undefined) {
        updatedState.inject_to = changedValues.inject_to;
        hasChanges = true;
      }

      if (changedValues.stimulus) {
        updatedState.stimulus = {
          ...updatedState.stimulus,
          ...changedValues.stimulus,
        };
        hasChanges = true;
      }

      if (hasChanges) {
        try {
          const validatedValues = StimulationConfigurationSchema.parse(updatedState);
          updateSPC(validatedValues);
        } catch (validationError) {
          updateSPC(updatedState as any);
          log(
            'debug',
            'Stimulation protocol partial update (validation pending):',
            validationError
          );
        }
      }
    } catch (error) {
      log('error', 'Stimulation protocol onValuesChange error:', error);
    }
  };

  const disableForm =
    simulationStatus?.status === SimulationStatus.LAUNCHED ||
    simulationStatus?.status === SimulationStatus.SAVING;

  return (
    <div
      id="stimulation-protocol"
      data-testid="stimulation-protocol"
      className="secondary-scrollbar mb-4 flex h-full w-full flex-col gap-4 overflow-x-hidden overflow-y-auto px-5 select-none"
    >
      <Form
        scrollToFirstError
        key={spcKey}
        form={form}
        layout="vertical"
        initialValues={spcState}
        className={cn(
          'relative flex w-full flex-col items-start select-none [&_.ant-form-item-explain-error]:text-sm! [&_.ant-form-item-label]:pb-0.5!',
          '[&_.ant-select-selector]:rounded-md! [&_.ant-select-selector]:border-none! [&_.ant-select-selector]:shadow-none!'
        )}
        onValuesChange={onValuesChange}
        validateTrigger={['onChange']}
        requiredMark={false}
        data-testid="stimulation-protocol-form"
        disabled={disableForm}
      >
        <Form.Item
          name="inject_to"
          label={label('Location', true)}
          labelAlign="left"
          className="[&_.ant-select-arrow]:text-primary-8 w-full [&_.ant-form-item-row]:mb-0 [&_.ant-form-item-row]:inline-block [&_.ant-form-item-row]:w-full [&_.ant-select-selector]:border-0!"
          rules={[
            {
              validator: createZodValidator(
                StimulationConfigurationSchema.shape.inject_to,
                'Injection target section is required'
              ),
            },
          ]}
        >
          <Select
            showSearch
            placeholder="Section name"
            options={sections.map((sec) => ({ label: sec, value: sec }))}
            className={cn(
              'border-neutral-3! [&_.ant-select-selection-item]:text-primary-9! w-full rounded-md border-[1px]! [&_.ant-select-selection-item]:font-bold [&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!',
              '[&_.ant-select-selector]:rounded-md! [&_.ant-select-selector]:border-none! [&_.ant-select-selector]:shadow-none!'
            )}
            classNames={{ popup: { root: '[&_.ant-select-item-option-content]:text-primary-9!' } }}
            placement="bottomLeft"
            disabled={!sections.length || disableForm}
            size={breakpoint === 'l' ? 'middle' : 'large'}
            prefix={
              <div
                className="prefix bg-primary-8 border-label mt-2.5 mr-2 inline-block size-3.5 rounded-full border"
                style={{ background: DefaultInjectionColor }}
              />
            }
          />
        </Form.Item>
        <Form.Item
          name={['stimulus', 'stimulus_type']}
          label={label('Stimulation Mode', true)}
          labelAlign="left"
          className="[&_.ant-select-arrow]:text-primary-8 w-full [&_.ant-form-item-row]:mb-0 [&_.ant-form-item-row]:inline-block [&_.ant-form-item-row]:w-full [&_.ant-select-selector]:border-0!"
          rules={[
            {
              validator: createZodValidator(
                StimulationConfigurationSchema.shape.stimulus.shape.stimulus_type,
                'Stimulation mode is required'
              ),
            },
          ]}
        >
          <Select
            placeholder="Section name"
            disabled={disableForm}
            options={Object.entries(StimulationMode)
              .filter(([, value]) => value.enabled)
              .map(([, option]) => ({
                label: option.label,
                value: option.value,
              }))}
            className={cn(
              'border-neutral-3! [&_.ant-select-selection-item]:text-primary-9! w-full rounded-md border-[1px]! [&_.ant-select-selection-item]:font-bold [&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!',
              '[&_.ant-select-selector]:rounded-md! [&_.ant-select-selector]:border-none! [&_.ant-select-selector]:shadow-none!'
            )}
            classNames={{ popup: { root: '[&_.ant-select-item-option-content]:text-primary-9!' } }}
            placement="bottomLeft"
            size={breakpoint === 'l' ? 'middle' : 'large'}
          />
        </Form.Item>
        <div className="ml-2 text-left text-gray-400 uppercase">Protocol</div>
        <div className="border-neutral-2 w-full rounded-2xl border px-3 py-4">
          <Form.Item
            name={['stimulus', 'stimulus_protocol']}
            label={null}
            rules={[
              {
                validator: createZodValidator(
                  StimulationConfigurationSchema.shape.stimulus.shape.stimulus_protocol,
                  'Stimulus protocol is required'
                ),
              },
            ]}
            labelAlign="left"
            className="[&_.ant-select-arrow]:text-primary-8 w-full [&_.ant-form-item-row]:mb-0 [&_.ant-form-item-row]:inline-block [&_.ant-form-item-row]:w-full [&_.ant-select-selector]:border-0!"
          >
            <Select
              placeholder="Select stimulus protocol"
              options={Object.entries(PROTOCOL_DETAILS).map(([_, option]) => ({
                label: option.label,
                value: option.name,
              }))}
              className={cn(
                'border-neutral-3! [&_.ant-select-selection-item]:text-primary-9! w-full rounded-md border-[1px]! [&_.ant-select-selection-item]:font-bold [&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!',
                '[&_.ant-select-selector]:rounded-md! [&_.ant-select-selector]:border-none! [&_.ant-select-selector]:shadow-none!'
              )}
              classNames={{
                popup: { root: '[&_.ant-select-item-option-content]:text-primary-9!' },
              }}
              placement="bottomLeft"
              size={breakpoint === 'l' ? 'middle' : 'large'}
            />
          </Form.Item>
          <div className="grid grid-cols-3 gap-3">
            {toPairs(
              (
                get(PROTOCOL_DETAILS, `${spcState.stimulus.stimulus_protocol}`, {
                  defaults: {},
                }) as TProtocolDetails
              ).defaults?.time ?? {}
            ).map(([key, value]) => (
              <div key={`${key}/${value}`} className="">
                <div>{label(startCase(camelCase(key)), false)}</div>
                <Input
                  readOnly
                  value={value}
                  defaultValue={value}
                  suffix="ms"
                  className={cn(
                    'text-primary-9 [&_.ant-input-suffix]:text-neutral-3 cursor-none border-none font-bold shadow-none outline-0 select-none focus-within:border-none focus-within:shadow-none hover:border-none',
                    '[&_input]:cursor-default [&_input]:select-none'
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </Form>
      <AmperageConfiguration sessionId={sessionId} memodelId={memodelId} />
    </div>
  );
}
