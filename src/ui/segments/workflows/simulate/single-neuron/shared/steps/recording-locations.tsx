import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Checkbox, Form, InputNumber, Select } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import z from 'zod';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import {
  buildDefaultRecordingLocation,
  getSimulationColor,
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  neuronSectionNamesAtomFamily,
  RecordLocationConfigurationAtomFamily,
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  getSessionKey,
  label,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  type NeuronLocation,
  NeuronLocationSchema,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import { getColorFromGeneratedPalette } from './webgl-neuron-selector/colors';

type Props = {
  sessionId: string;
};

type RecordItemProps = {
  index: number;
  name: number | string;
  disable: boolean;
  disableDelete: boolean;
  sections: Array<string>;
  onRemove: (idx: number) => void;
  record?: NeuronLocation;
};

function ColorMarker({ color }: { color?: string }) {
  return (
    <div className="flex h-11 items-center justify-center">
      <div
        style={{
          display: 'inline-block',
          width: '1em',
          height: '1em',
          border: '1px solid currentColor',
          borderRadius: '50%',
          background: color,
          verticalAlign: 'center',
        }}
      />
    </div>
  );
}

function RecordItem({
  index,
  name,
  disable,
  disableDelete,
  sections,
  record,
  onRemove,
}: RecordItemProps) {
  const breakpoint = useDefaultBreakpoint();
  return (
    <div className="flex w-full flex-col items-start justify-start pr-2">
      <div className="grid w-full grid-cols-[.5fr_.5fr_.5fr_max-content] items-start justify-center gap-4">
        <Form.Item
          label={label(`Recording ${index + 1}`, true)}
          labelAlign="left"
          className="[&_.ant-select-arrow]:text-primary-8 [&_.ant-form-item-row]:mb-0 [&_.ant-form-item-row]:inline-block [&_.ant-form-item-row]:w-full [&_.ant-select-selector]:border-0!"
          name={[name, 'section']}
          rules={[
            {
              validator: async (_rule, value) => {
                try {
                  await NeuronLocationSchema.pick({ section: true }).shape.section.parseAsync(
                    value
                  );
                } catch (error) {
                  return Promise.reject(
                    error instanceof z.ZodError
                      ? error.issues.at(0)?.message
                      : 'Section is required'
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Select
            showSearch
            placeholder="Section name"
            options={sections.map((sec) => ({ label: sec, value: sec }))}
            className={cn(
              '[&_.ant-select-selection-item]:font-bold [&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!',
              '[&_.ant-select-selector]:rounded-md! [&_.ant-select-selector]:border-none! [&_.ant-select-selector]:shadow-none!',
              'border-neutral-3! [&_.ant-select-selection-item]:text-primary-9! rounded-md border-[1px]!'
            )}
            popupClassName="[&_.ant-select-item-option-content]:text-primary-9!"
            placement="bottomLeft"
            disabled={disable}
            size={breakpoint === 'l' ? 'middle' : 'large'}
            title={`origin = ${record?.origin}`}
            prefix={
              <ColorMarker
                color={
                  record?.origin === 'injection' ? '#fff' : getColorFromGeneratedPalette(index)
                }
              />
            }
          />
        </Form.Item>
        <Form.Item
          label={label('offset', true)}
          labelAlign="left"
          name={[name, 'offset']}
          rules={[
            {
              validator: async (_rule, value) => {
                try {
                  await NeuronLocationSchema.pick({ offset: true }).shape.offset.parseAsync(value);
                } catch (error) {
                  return Promise.reject(
                    error instanceof z.ZodError ? error.issues.at(0)?.message : 'Offset is required'
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber<number>
            size={breakpoint === 'l' ? 'middle' : 'large'}
            className={cn(
              'border-neutral-2! [&_.ant-input-number-input]:text-primary-8! flex w-full items-center',
              '[&_.ant-input-number-suffix]:text-neutral-3 [&_.ant-input-number-suffix]:pointer-events-auto',
              'justify-between gap-2 rounded-sm! bg-white font-bold! [&_input]:placeholder:!font-light'
            )}
            step={0.01}
            disabled={disable}
            min={0}
            max={1}
            suffix={
              <div className="pointer-events-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoCircleOutlined className="hover:text-primary-8 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={5}
                    className="text-primary-9 z-50 max-w-80 rounded-md bg-white px-2 py-2 font-light shadow-md"
                    arrowClassName="bg-white"
                  >
                    <p>
                      The recording position relative to the section. <br />0 being the start of the
                      section and 1 being the end
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            }
          />
        </Form.Item>
        <Form.Item
          label={label('record currents', false)}
          labelAlign="left"
          name={[name, 'record_currents']}
          valuePropName="checked"
          rules={[
            {
              validator: async (_rule, value) => {
                try {
                  await NeuronLocationSchema.pick({
                    record_currents: true,
                  }).shape.record_currents.parseAsync(value);
                } catch (error) {
                  return Promise.reject(
                    error instanceof z.ZodError
                      ? error.issues.at(0)?.message
                      : 'This field is required'
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
          className="[&_.ant-form-item-control-input]:h-11"
        >
          <Checkbox className="h-full" disabled={disable} />
        </Form.Item>
        {!disableDelete && (
          <Form.Item className="flex items-center justify-center" label={<></>} labelAlign="left">
            <Button
              variant="ghost"
              type="button"
              disabled={disableDelete}
              onClick={() => onRemove(index)}
              className="hover:bg-neutral-2 size-4! w-10 cursor-pointer p-4"
            >
              <DeleteOutlined className="size-4" />
            </Button>
          </Form.Item>
        )}
      </div>
    </div>
  );
}

export function Recording({ sessionId }: Props) {
  const [form] = Form.useForm();
  const breakpoint = useDefaultBreakpoint();

  const key = getSessionKey(RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const [state, update] = useAtom(RecordLocationConfigurationAtomFamily(key));
  const morphologySectionNames = useAtomValue(neuronSectionNamesAtomFamily(sessionId));
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));

  useEffect(() => {
    form.setFieldsValue({ record_from: state });
  }, [state, form]);

  const onAdd = () => {
    try {
      const colorIndex = state.length;
      const newRecording = { ...buildDefaultRecordingLocation(getSimulationColor(colorIndex)) };

      const updatedState = [...state, newRecording];
      update(updatedState);
      form.setFieldValue('record_from', updatedState);
    } catch (error) {
      log('error', error);
    }
  };

  const onRemove = (index: number) => {
    try {
      if (state.length <= 1) return;
      const updatedState = state.filter((_, i) => i !== index);
      update(updatedState);
      form.setFieldValue('record_from', updatedState);
    } catch (error) {
      log('error', error);
    }
  };

  const onValuesChange = (changedValues: any, allValues: any) => {
    try {
      if (changedValues.record_from) {
        const recordFrom = allValues.record_from;
        if (Array.isArray(recordFrom)) {
          update(recordFrom);
        }
      }
    } catch (error) {
      log('error', error);
    }
  };

  const disableForm =
    simulationStatus?.status === SimulationStatus.LAUNCHED ||
    simulationStatus?.status === SimulationStatus.SAVING;

  return (
    <div
      id="recording-container"
      data-testid="recording-container"
      className="mb-4 flex h-full min-h-0 w-full flex-col overflow-x-hidden overflow-y-hidden select-none"
    >
      <Form
        scrollToFirstError
        key={key}
        form={form}
        layout="vertical"
        initialValues={{ record_from: state }}
        className={cn(
          'secondary-scrollbar relative flex h-auto w-full flex-col items-start overflow-x-hidden overflow-y-auto',
          'select-none [&_.ant-form-item-explain-error]:text-sm! [&_.ant-form-item-label]:pb-0.5!'
        )}
        onValuesChange={onValuesChange}
        validateTrigger={['onChange']}
        requiredMark={false}
        id="recording-form"
        data-testid="recording-form"
        disabled={disableForm}
      >
        <Form.List name="record_from">
          {(fields) =>
            fields.map((f, index) => (
              <RecordItem
                key={`recording-${f.name}`}
                index={index}
                name={f.name}
                disable={!morphologySectionNames.length || disableForm}
                disableDelete={fields.length <= 1 || disableForm}
                sections={morphologySectionNames}
                onRemove={onRemove}
                record={state.at(index)}
              />
            ))
          }
        </Form.List>
      </Form>
      <Button
        rounded
        title="Add new Record Location"
        onClick={onAdd}
        disabled={!morphologySectionNames.length || disableForm}
        type="button"
        variant="outline"
        className="disabled:bg-neutral-1 disabled:text-label mt-2 mb-1 w-max shadow-sm"
        size={breakpoint === 'l' ? 'md' : 'lg'}
      >
        Add recording
      </Button>
    </div>
  );
}
