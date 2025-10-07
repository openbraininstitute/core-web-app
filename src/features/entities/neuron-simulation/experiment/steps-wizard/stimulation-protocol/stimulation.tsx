import { Select, Form, Collapse, ConfigProvider } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import get from 'es-toolkit/compat/get';

import AmperageRange from '@/features/entities/neuron-simulation/experiment/steps-wizard/stimulation-protocol/amperage-range';
import SelectedIcon from '@/components/icons/SelectedIcon';

import { currentInjectionSimulationConfigAtom } from '@/state/simulate/categories/current-injection-simulation';
import { useCurrentInjectionSimulationConfig } from '@/state/simulate/categories';
import { secNamesAtom } from '@/state/simulate/single-neuron';
import {
  DEFAULT_STIMULUS_CONFIG,
  PROTOCOL_DETAILS,
  SIMULATION_COLORS,
  stimulusTypeParams,
} from '@/constants/simulate/single-neuron';

import type { StimulusModule } from '@/types/small-scale-simulator/single-neuron';

type Props = {
  modelId: string;
  projectId: string;
  virtualLabId: string;
};

type FormItemProps = {
  stimulationId: number;
};

export default function Stimulation({ modelId, projectId, virtualLabId }: Props) {
  const state = useAtomValue(currentInjectionSimulationConfigAtom);
  return (
    <ConfigProvider
      theme={{
        components: {
          Collapse: {
            headerPadding: 0,
            contentPadding: 0,
          },
        },
      }}
    >
      <Form.List name="current_injection">
        {(fields) => (
          <div className="flex flex-col gap-2">
            {fields.map((field) => (
              <Collapse
                key={field.key}
                defaultActiveKey={['1']}
                accordion
                ghost
                expandIcon={() => null}
                items={[
                  {
                    key: '1',
                    // TODO: return back dropdown when we have multiple stimulation
                    // label: (
                    //   <div className="flex w-fit items-center bg-primary-8 p-4 text-primary-4">
                    //     <span>Stimulation</span>{' '}
                    //     {/* <DownOutlined className="ml-8 text-primary-4" size={10} /> */}
                    //   </div>
                    // ),
                    // // TODO: return back deletion when we have multiple stimulation
                    // extra: (
                    //   <Button
                    //     onClick={() => {
                    //       remove(field.name);
                    //       removeDirectConfig(field.name);
                    //     }}
                    //     icon={<DeleteOutlined />}
                    //     className="border-none shadow-none"
                    //   />
                    // ),

                    children: (
                      <div className="border-primary-8 mt-[-12px] border p-6">
                        <StimulusLocation stimulationId={field.name} />
                        <StimulationMode stimulationId={field.name} />
                        <StimulationProtocol stimulationId={field.name} />
                        <Parameters
                          protocol={
                            state[field.name].stimulus.stimulus_protocol ??
                            DEFAULT_STIMULUS_CONFIG.stimulus_protocol!
                          }
                        />
                        <AmperageRange
                          stimulationId={field.name}
                          amplitudes={state[field.name].stimulus.amplitudes}
                          modelId={modelId}
                          protocol={
                            state[field.name].stimulus.stimulus_protocol ??
                            DEFAULT_STIMULUS_CONFIG.stimulus_protocol!
                          }
                          projectId={projectId}
                          virtualLabId={virtualLabId}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            ))}
          </div>
        )}
      </Form.List>
    </ConfigProvider>
  );
}

function StimulusLocation({ stimulationId }: FormItemProps) {
  const { setProperty } = useCurrentInjectionSimulationConfig();
  const secNames = useAtomValue(secNamesAtom);
  const state = useAtomValue(currentInjectionSimulationConfigAtom);
  return (
    <Form.Item
      name={[stimulationId, 'inject_to']}
      label={<span className="ml-2 text-gray-400 uppercase">Location</span>}
      rules={[{ required: true }]}
      labelAlign="left"
      className="mb-8 w-fit border-none"
    >
      <Select
        placeholder="Select stimulus location"
        value={state[stimulationId].inject_to}
        onChange={(newValue) =>
          setProperty({
            id: stimulationId,
            key: 'inject_to',
            newValue,
          })
        }
        variant="borderless"
        className="[&>.ant-select-selector>.ant-select-selection-item]:text-primary-8! text-left [&>.ant-select-selector>.ant-select-selection-item]:text-base! [&>.ant-select-selector>.ant-select-selection-item]:font-bold!"
      >
        {secNames.map((secName) => (
          <Select.Option key={secName} value={secName} className="[&_.prefix]:hidden!">
            <div
              className="prefix bg-primary-8 mr-2 inline-block h-[10px] w-[10px]"
              style={{ background: SIMULATION_COLORS[0] }}
            />{' '}
            {secName}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
}

function StimulationMode({ stimulationId }: FormItemProps) {
  const stimulusModeClone = structuredClone(stimulusTypeParams);
  const { setMode } = useCurrentInjectionSimulationConfig();
  return (
    <Form.Item
      name={[stimulationId, 'stimulus', 'stimulus_type']}
      label={<span className="ml-2 text-gray-400 uppercase">Stimulation Mode</span>}
      rules={[{ required: true }]}
      labelAlign="left"
      className="mb-8"
    >
      <Select
        options={[...stimulusModeClone.options]}
        onSelect={(newValue) =>
          setMode({
            id: stimulationId,
            newValue,
          })
        }
        className="[&>.ant-select-selector>.ant-select-selection-item]:text-primary-8! text-left [&>.ant-select-selector>.ant-select-selection-item]:text-base! [&>.ant-select-selector>.ant-select-selection-item]:font-bold!"
        variant="borderless"
      />
    </Form.Item>
  );
}

function StimulationProtocol({ stimulationId }: FormItemProps) {
  const { setProtocol } = useCurrentInjectionSimulationConfig();
  const currentInjectionConfig = useAtomValue(currentInjectionSimulationConfigAtom);
  return (
    <div>
      <div className="ml-2 text-left text-gray-400 uppercase">Protocol</div>
      <div className="mt-4 ml-2 flex items-baseline">
        <div className="mr-16 flex items-center uppercase">
          <SelectedIcon fill="white" className="mr-2" />
          <span className="text-primary-8 font-bold">
            {
              get(
                PROTOCOL_DETAILS,
                currentInjectionConfig[stimulationId].stimulus.stimulus_protocol!,
                null
              )?.label
            }
          </span>
        </div>
        <Form.Item
          name={[stimulationId, 'stimulus', 'stimulus_protocol']}
          label={null}
          rules={[{ required: true }]}
          labelAlign="left"
          className="mb-8"
        >
          <Select
            placeholder="Select stimulus protocol"
            onSelect={(newValue) => {
              setProtocol({
                id: stimulationId,
                newValue,
              });
            }}
            className="text-left [&>.ant-select-selector>.ant-select-selection-item]:text-gray-400!"
            variant="borderless"
            popupMatchSelectWidth={false}
            optionLabelProp="label"
          >
            {Object.entries(PROTOCOL_DETAILS).map(([_, details]) => (
              <Select.Option key={details.name} value={details.name} label="Select other protocol">
                {details.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </div>
    </div>
  );
}

function Parameters({ protocol }: { protocol: StimulusModule }) {
  const protocolDescription = PROTOCOL_DETAILS[protocol];

  if (!protocolDescription) {
    return null;
  }

  return (
    <div className="bg-[#FAFAFA] p-4 pt-2 text-left">
      <Collapse
        ghost
        expandIcon={() => null}
        items={[
          {
            key: '1',
            label: (
              <span className="w-fit text-gray-400 uppercase">
                Description <DownOutlined className="text-xs" />{' '}
              </span>
            ),
            className: 'ml-2 p-0',
            children: <div className="text-primary-8">{protocolDescription.description}</div>,
          },
        ]}
      />

      <div className="mt-8 ml-2 flex">
        <div className="mr-8 flex cursor-not-allowed flex-col">
          <span className="text-gray-400 uppercase">Delay</span>
          <div className="text-gray-400">
            <div className="text-primary-8 inline-block min-w-[80px] border border-gray-200 py-2 pr-2 text-right font-bold">
              {protocolDescription.defaults.time.delay}
            </div>{' '}
            [ms]
          </div>
        </div>

        <div className="mr-8 flex cursor-not-allowed flex-col">
          <span className="text-gray-400 uppercase">Duration</span>
          <div className="text-gray-400">
            <div className="text-primary-8 inline-block min-w-[80px] border border-gray-200 py-2 pr-2 text-right font-bold">
              {protocolDescription.defaults.time.duration}
            </div>{' '}
            [ms]
          </div>
        </div>

        <div className="mr-8 flex cursor-not-allowed flex-col">
          <span className="text-gray-400 uppercase">Stop Time</span>
          <div className="text-gray-400">
            <div className="text-primary-8 inline-block min-w-[80px] border border-gray-200 py-2 pr-2 text-right font-bold">
              {protocolDescription.defaults.time.stop_time}
            </div>{' '}
            [ms]
          </div>
        </div>
      </div>
    </div>
  );
}
