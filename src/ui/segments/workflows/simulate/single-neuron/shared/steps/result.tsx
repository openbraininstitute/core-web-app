'use client';

import get from 'es-toolkit/compat/get';
import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { match } from 'ts-pattern';

import { SimulationColors } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import {
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  useCurrentSimulationConfig,
  useRecordingPlotData,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/hooks';
import type { PlotData } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { cn } from '@/utils/css-class';

const PlotRenderer = dynamic(
  () => import('@/features/entities/neuron-simulation/experiment/visualization/plot-renderer'),
  {
    ssr: false,
  }
);

export function Results({ sessionId }: { sessionId: string }) {
  const currentSimulationConfig = useCurrentSimulationConfig(sessionId);
  const recordingPlotData = useRecordingPlotData(sessionId);
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));
  const record = useSearchParams().get('record') ?? 'all';

  const duration = currentSimulationConfig.max_time;

  if (!recordingPlotData || !Object.keys(recordingPlotData).length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="text-primary-9 text-2xl">No results to display</div>
        <div className="text-label">Please run the experiment</div>
      </div>
    );
  }

  if (
    simulationStatus?.status === SimulationStatus.EXECUTED &&
    Object.values(recordingPlotData).every((o: PlotData) => o.every((p) => p.y.length === 0))
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="text-primary-9 text-center text-2xl">
          Simulation finished <br />
          but no results to display
        </div>
        <div className="text-label">If the issue persists, please contact support</div>
      </div>
    );
  }

  if (simulationStatus?.status === SimulationStatus.ERROR) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="text-primary-9 text-center text-2xl">Simulation failed</div>
        <div className="text-label">If the issue persists, please contact support</div>
      </div>
    );
  }

  const isLoading =
    simulationStatus?.status === SimulationStatus.LAUNCHED &&
    Object.values(recordingPlotData).every((o: PlotData) => o.every((p) => p.y.length === 0));

  const content = match(record)
    .with('all', () => (
      <div className="flex w-full flex-col gap-2">
        {Object.entries(recordingPlotData).map(([key, value]) => {
          return (
            <div key={key} className="flex w-full flex-col items-start justify-start">
              <PlotRenderer
                withTitle
                title={key}
                type="simulation"
                name={key}
                isDownloadable={
                  !!value.length && simulationStatus?.status === SimulationStatus.EXECUTED
                }
                onlyAmplitudeLegend={false}
                data={value.map((v, i) => ({
                  ...v,
                  line: { color: SimulationColors[i] },
                }))}
                isLoading={isLoading}
                className="h-full w-full"
                plotConfig={{
                  yAxisTitle: 'Voltage [mV]',
                  showDefaultLegends: true,
                  maxTime: duration,
                }}
                rootClassName="p-0 m-0"
                wrapperClassName="p-0"
                graphWrapperClassName="w-full"
              />
            </div>
          );
        })}
      </div>
    ))
    .otherwise(() => {
      const recordData = get(recordingPlotData, `${record}`, null);
      if (record && recordData) {
        return (
          <div className="flex w-full flex-col gap-2">
            <div key={`${record}`} className="flex w-full flex-col items-start justify-start">
              <PlotRenderer
                withTitle
                title={record}
                type="simulation"
                name={record}
                isDownloadable={
                  !!recordData.length && simulationStatus?.status === SimulationStatus.EXECUTED
                }
                onlyAmplitudeLegend={false}
                data={recordData.map((v, i) => ({
                  ...v,
                  line: { color: SimulationColors[i] },
                }))}
                isLoading={isLoading}
                className="h-full w-full"
                plotConfig={{
                  yAxisTitle: 'Voltage [mV]',
                  showDefaultLegends: true,
                  maxTime: duration,
                }}
                rootClassName="p-0 m-0"
                wrapperClassName="p-0"
                graphWrapperClassName="w-full"
                titleClassName="p-0"
              />
            </div>
          </div>
        );
      }
      return null;
    });

  return (
    <div
      className={cn(
        'secondary-scrollbar mb-4 flex h-full w-full flex-col',
        'gap-4 overflow-x-hidden overflow-y-auto px-5 select-none'
      )}
    >
      {content}
    </div>
  );
}
