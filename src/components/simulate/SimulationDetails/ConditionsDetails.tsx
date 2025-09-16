import { SimulationExperimentalSetup } from '@/types/small-scale-simulator/single-neuron';

type Props = {
  conditions: SimulationExperimentalSetup;
};

function Field({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="text-primary-7 mr-10 mb-4 text-sm">
      <div className="text-neutral-4 uppercase">{label}</div>
      <div>
        <span className="mr-2 font-bold">{value}</span>
        <span className="text-neutral-4">{unit}</span>
      </div>
    </div>
  );
}

export default function ConditionsDetails({ conditions }: Props) {
  return (
    <div className="flex">
      <div className="min-w-[200px]">
        <Field label="Temperature" value={`${conditions.celsius}`} unit="°C" />
        <Field label="Simulation Duration" value={`${conditions.max_time}`} unit="ms" />
      </div>

      <div className="min-w-[200px]">
        <Field label="Initial voltage" value={`${conditions.vinit}`} unit="mV" />
        <Field label="Time Step" value={`${conditions.time_step}`} unit="ms" />
      </div>

      <div className="min-w-[200px]">
        <Field label="Holding Current" value={`${conditions.hypamp}`} unit="nA" />
        <Field label="Seed" value={`${conditions.seed}`} />
      </div>
    </div>
  );
}
