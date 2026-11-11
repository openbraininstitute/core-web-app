import { renderAsString, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { classNames } from '@/util/utils';

import type { SynaptomeConfig } from '@/types/small-scale-simulator/single-neuron';

type Props = {
  synapses: SynaptomeConfig;
};

function Field({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}) {
  return (
    <div className={classNames(' mr-10 mb-4', className)}>
      <div className="text-neutral-4 text-sm uppercase">{label}</div>
      <div>
        <span className="mr-2 font-bold text-primary-8">{value}</span>
        {unit && <span className="text-primary-8">[{unit}]</span>}
      </div>
    </div>
  );
}

export default function SynapticInputs({ synapses }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {synapses.map((synapse, index) => (
        // Same synaptic group (id) can be used multiple times in simulation. Therefore, appending index to key to create unique values
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={`${synapse.id}-${index}`}
          className="mr-2 border border-neutral-200 p-4"
        >
          <div>
            <div className="mb-6 flex items-center border-b border-neutral-200 py-2">
              <span
                className="mr-4 inline-block h-[14px] w-[14px]"
                style={{ backgroundColor: synapse.color }}
              />
              <h4>Synaptic Input {index + 1}</h4>
            </div>

            <Field label="Name" value="Synapses set" />

            <div className="flex">
              <Field
                label="Delay"
                value={renderEmptyOrValue(renderAsString(synapse.delay))}
                unit="ms"
                className="mr-10"
              />
              <Field
                label="Duration"
                value={renderEmptyOrValue(renderAsString(synapse.duration))}
                unit="ms"
                className="mr-10"
              />
              <Field
                label="Frequency"
                value={renderEmptyOrValue(renderAsString(synapse.frequency))}
                unit="Hz"
                className="mr-10"
              />
              <Field
                label="Weight scalar"
                value={renderEmptyOrValue(renderAsString(synapse.weight_scalar))}
              />
            </div>
          </div>
          <hr className="last:hidden" />
        </div>
      ))}
    </div>
  );
}
