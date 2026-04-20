import { DeleteOutlined, PlusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { P } from 'ts-pattern';

import { UIElementRender } from '.';
import ParameterSweep from './parameter-sweep';

import type { SetStateAction } from 'jotai';
import type { ConfigValue, SetAtom } from '@/features/scan-config/types';
import type { VoltageDuration as VoltageDurationSchema } from '../../types';

export interface VoltageDurationState {
  voltage: null | number | (number | null)[];
  duration: null | number | (number | null)[];
}

export function VoltageDuration({
  paramSchema,
  state,
  onChange,
  disabled,
}: {
  paramSchema: VoltageDurationSchema;
  state: VoltageDurationState[];
  onChange: (newValue: VoltageDurationState[]) => void;
  disabled: boolean;
}) {
  console.log(state);
  return (
    <div>
      <div className="flex flex-col gap-3 border-t border-gray-200">
        {state.map((v, i) => {
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex justify-between">
                <div className="text-neutral-3">STEP {i}</div>
                <DeleteOutlined
                  className="text-red-500"
                  onClick={() => onChange(state.toSpliced(i, 1))}
                />
              </div>

              <div className="border border-1 rounded-md border-neutral-3">
                <div>Votage</div>
                <ParameterSweep
                  value={v.voltage}
                  min={paramSchema.items.properties.voltage.anyOf[0].minimum}
                  max={paramSchema.items.properties.voltage.anyOf[0].maximum}
                  exclusiveMin={paramSchema.items.properties.voltage.anyOf[0].exclusiveMinimum}
                  exclusiveMax={paramSchema.items.properties.voltage.anyOf[0].exclusiveMaximum}
                  disabled={disabled}
                  k={`voltage-${i}`}
                  onChange={(newV) => onChange(state.with(i, { ...v, voltage: newV }))}
                />

                <div>Duration</div>
                <ParameterSweep
                  value={v.duration}
                  min={paramSchema.items.properties.duration.anyOf[0].minimum}
                  max={paramSchema.items.properties.duration.anyOf[0].maximum}
                  exclusiveMin={paramSchema.items.properties.duration.anyOf[0].exclusiveMinimum}
                  exclusiveMax={paramSchema.items.properties.duration.anyOf[0].exclusiveMaximum}
                  disabled={disabled}
                  k={`duration-${i}`}
                  onChange={(newV) => onChange(state.with(i, { ...v, duration: newV }))}
                />
              </div>
            </div>
          );
        })}
      </div>
      {!disabled && (
        <button
          type="button"
          className="rounded-full border border-gray-200 px-3 py-2 min-w-[150px] text-primary-8 font-bold flex justify-between float-right mt-2"
          onClick={() => {
            onChange([...state, { voltage: null, duration: null }]);
          }}
        >
          Add step
          <PlusOutlined className="text-primary-8! " />
        </button>
      )}
    </div>
  );
}
