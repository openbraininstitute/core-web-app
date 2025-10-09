import React from 'react';
import { Select, Form, InputNumber, Button, Checkbox } from 'antd';
import { useAtomValue } from 'jotai';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import isNil from 'lodash/isNil';

import { NeuronLocationOriginDict } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { useRecordingSourceForSimulation } from '@/state/simulate/categories';
import { RecordLocation } from '@/types/small-scale-simulator/single-neuron';
import { getSimulationColor } from '@/constants/simulate/single-neuron';
import { secNamesAtom } from '@/state/simulate/single-neuron';
import { classNames } from '@/util/utils';

import Styles from './recording.module.css';

type RecordItemProps = {
  index: number;
  name: number | string;
  disable: boolean;
  disableDelete: boolean;
  sections: Array<string>;
  onAddSource: (index: number, updatedLocation: Partial<RecordLocation>) => void;
  onRemove: (idx: number) => void;
};

function RecordItem({
  index,
  name,
  disable,
  disableDelete,
  sections,
  onAddSource,
  onRemove,
}: RecordItemProps) {
  return (
    <div className="w-full [&:last-of-type_div.divider]:hidden">
      <div className="flex w-full flex-col items-start justify-start">
        <h3 className="text-neutral-4 mb-1 text-lg uppercase">Recording {index + 1}</h3>
        <div className={Styles.recordItemLine}>
          <div>
            {/**
             * We add 1 to the index because the first color is already used by the current injection.
             */}
            <ColorMarker index={index + 1} />
            <Form.Item name={[name, 'section']} rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Section name"
                onChange={(v) => onAddSource(index, { section: v })}
                options={sections.map((sec) => ({ label: sec, value: sec }))}
                className="[&_.ant-select-selection-item]:text-primary-8! w-full [&_.ant-select-selection-item]:text-left! [&_.ant-select-selection-item]:font-bold"
                placement="bottomLeft"
                disabled={disable}
                size="large"
              />
            </Form.Item>
          </div>
          <div>
            <div className="text-neutral-4 flex h-11 items-center justify-center align-middle text-base">
              <span className="mr-2 uppercase">segment</span>
              <CustomPopover
                message="The recording position relative to the section. 0 being the start of the section and 1 being the end."
                placement="bottomRight"
                when={['hover']}
              >
                <InfoCircleOutlined className="cursor-pointer" />
              </CustomPopover>
            </div>
            <Form.Item
              name={[name, 'offset']}
              rules={[
                { required: true, message: 'Required field' },
                {
                  type: 'number',
                  min: 0,
                  max: 1,
                  message: 'Section segment should be between 0 and 1',
                },
              ]}
            >
              <InputNumber<number>
                min={0}
                max={1}
                step={0.01}
                className="[&_.ant-input-number-input]:text-primary-8! w-full [&_.ant-input-number-input]:font-bold"
                onChange={(v) => {
                  if (!isNil(v)) {
                    onAddSource(index, { offset: v });
                  }
                }}
                size="large"
                disabled={disable}
              />
            </Form.Item>
          </div>
          <div>
            <Form.Item name={[name, 'recordCurrents']}>
              <Checkbox
                onChange={(evt) => onAddSource(index, { record_currents: evt.target.checked })}
              >
                Record currents
              </Checkbox>
            </Form.Item>
          </div>
          <div className="flex h-11 items-center justify-end">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              disabled={disableDelete}
              onClick={() => onRemove(index)}
            />
          </div>
        </div>
      </div>
      <div className="divider bg-neutral-3 my-4 h-px w-full" />
    </div>
  );
}

export default function Recording() {
  const {
    state,
    setSource,
    add: addRecordLocation,
    remove: removeRecordLocation,
  } = useRecordingSourceForSimulation();
  const sectionNames = useAtomValue(secNamesAtom);

  return (
    <div className="flex w-full flex-col items-start">
      <Form.List name="record_from">
        {(fields) =>
          fields.map((f, index) => (
            <RecordItem
              key={`recording-${f.name}`}
              index={index}
              name={f.name}
              disable={!sectionNames.length}
              disableDelete={fields.length <= 1}
              onAddSource={setSource}
              sections={sectionNames}
              onRemove={removeRecordLocation}
            />
          ))
        }
      </Form.List>
      <button
        title="Add new Record Location"
        onClick={() => {
          addRecordLocation({
            section: sectionNames[0],
            offset: 0.5,
            record_currents: false,
            origin: NeuronLocationOriginDict.recording,
            color: getSimulationColor(state.length),
          });
        }}
        disabled={!sectionNames.length}
        type="button"
        className={classNames(
          'border-primary-8 text-primary-8 mt-4 border bg-white px-6 py-3 text-lg font-bold',
          'hover:border-neutral-4 hover:bg-neutral-4 hover:text-white',
          'disabled:pointer-events-none disabled:border-gray-100 disabled:bg-gray-100 disabled:text-gray-400'
        )}
      >
        Add recording
      </button>
    </div>
  );
}

/**
 * Represents the color of the matching label.
 */
function ColorMarker({ index }: { index: number }) {
  return (
    <div className="flex h-11 items-center justify-center">
      <div
        style={{
          display: 'inline-block',
          width: '1em',
          height: '1em',
          border: '1px solid currentColor',
          borderRadius: '50%',
          background: getSimulationColor(index),
          verticalAlign: 'center',
        }}
      />
    </div>
  );
}
