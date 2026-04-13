import { DeleteOutlined } from '@ant-design/icons';

import { UIElementRender } from '.';
import ParameterSweep from './parameter-sweep';

import type { VoltageDuration as VoltageDurationSchema } from '../../types';

export function VoltageDuration({ paramSchema }: { paramSchema: VoltageDurationSchema }) {
  console.log(paramSchema);
  const values = [1, 2, 3];

  return (
    <div className="flex flex-col gap-3">
      {values.map((v) => {
        return (
          <div key={v} className="flex flex-col gap-1">
            <div className="flex justify-between">
              <div className="text-neutral-3">STEP {v}</div>
              <DeleteOutlined className="text-red-500" />
            </div>

            <div className="border border-1 rounded-md border-neutral-3">
              <div>
                Votage
                <ParameterSweep />
              </div>

              <div>Duration</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
