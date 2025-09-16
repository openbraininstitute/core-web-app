import SimulationPlot from '@/features/entities/neuron-simulation/simulation-results/simulation-plot-dynamic';
import {
  DEFAULT_PROTOCOL,
  PROTOCOL_DETAILS,
  SIMULATION_COLORS,
} from '@/constants/simulate/single-neuron';
import { PlotData } from '@/services/bluenaas-single-cell/types';
import { CurrentInjectionSimulationConfig } from '@/types/small-scale-simulator/single-neuron';
import { classNames } from '@/util/utils';

type Props = {
  currentInjection: CurrentInjectionSimulationConfig;
  stimulusData: PlotData | null;
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
    <div className={classNames('text-primary-7 mr-10 mb-4', className)}>
      <div className="text-neutral-4 text-sm uppercase">{label}</div>
      <div>
        <span className="mr-2 font-bold">{value}</span>
        {unit && <span>[{unit}]</span>}
      </div>
    </div>
  );
}

export default function StimulationDetails({ currentInjection, stimulusData }: Props) {
  const protocol = currentInjection.stimulus.stimulus_protocol ?? DEFAULT_PROTOCOL;
  return (
    <div className="flex flex-wrap">
      <div className="w-[500px] border border-neutral-200 p-4">
        <div className="text-neutral-4 mb-6 flex items-center border-b border-neutral-200 font-semibold">
          Stimulation
        </div>

        <div className="text-primary-7 mr-10">
          <div className="text-neutral-4 text-sm uppercase">Location</div>
          <div className="mb-4">
            <span
              className="mr-4 inline-block h-[11px] w-[11px] border"
              style={{ backgroundColor: SIMULATION_COLORS[0] }}
            />
            <span className="mr-2 font-bold">{currentInjection.inject_to}</span>
          </div>

          <Field label="Stimulation Mode" value={currentInjection.stimulus.stimulus_type} />
          <Field label="Protocol" value={PROTOCOL_DETAILS[protocol].label} />
          <div className="ml-4 flex">
            <Field
              label="Delay"
              value={`${PROTOCOL_DETAILS[protocol].defaults.time.delay}`}
              unit="ms"
            />
            <Field
              label="Duration"
              value={`${PROTOCOL_DETAILS[protocol].defaults.time.duration}`}
              unit="ms"
            />
            <Field
              label="Stop Time"
              value={`${PROTOCOL_DETAILS[protocol].defaults.time.stop_time}`}
              unit="ms"
            />
          </div>

          {stimulusData && <SimulationPlot title="Stimulation" plotData={stimulusData} />}
        </div>
      </div>
    </div>
  );
}
