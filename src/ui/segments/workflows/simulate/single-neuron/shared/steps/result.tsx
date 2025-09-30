'use client';

import { useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import get from 'lodash/get';

import { PlotData } from '../types';
import { useRecordingPlotData } from './hooks';

import { SIMULATION_COLORS } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { simulationStatusAtom } from '@/state/simulate/single-neuron';

const PlotRenderer = dynamic(
  () => import('@/features/entities/neuron-simulation/experiment/visualization/plot-renderer'),
  {
    ssr: false,
  }
);

export function Results({ sessionId }: { sessionId: string }) {
  const recordingPlotData = useRecordingPlotData(sessionId);
  // const [recordingPlotData] = useAtom(genericSingleNeuronSimulationPlotDataAtomFamily(sessionId));
  const simulationStatus = useAtomValue(simulationStatusAtom);
  const record = useSearchParams().get('record') ?? 'all';

  if (!recordingPlotData || !Object.keys(recordingPlotData).length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="text-primary-9 text-2xl">No results to display</div>
        <div className="text-label">Please run the experiment</div>
      </div>
    );
  }

  const isLoading =
    simulationStatus?.status === 'launched' &&
    Object.values(recordingPlotData).every((o: PlotData) => o.every((p) => p.y.length === 0));

  let content = null;
  if (record === 'all') {
    content = (
      <div className="flex w-full flex-col gap-2">
        {Object.entries(recordingPlotData).map(([key, value]) => {
          return (
            <div key={key} className="flex w-full flex-col items-start justify-start">
              <PlotRenderer
                withTitle
                title={key}
                type="simulation"
                name={key}
                isDownloadable={!!value.length}
                onlyAmplitudeLegend={false}
                data={value.map((v, i) => ({ ...v, line: { color: SIMULATION_COLORS[i] } }))}
                isLoading={isLoading}
                className="h-full w-full"
                plotConfig={{
                  yAxisTitle: 'Voltage [mV]',
                  showDefaultLegends: true,
                }}
                rootClassName="p-0 m-0"
                wrapperClassName="p-0"
                graphWrapperClassName="w-full"
              />
            </div>
          );
        })}
      </div>
    );
  } else {
    const recordData = get(recordingPlotData, `${record}`, null);
    if (record && recordData) {
      content = (
        <div className="flex w-full flex-col gap-2">
          <div key={`${record}`} className="flex w-full flex-col items-start justify-start">
            <PlotRenderer
              withTitle
              title={record}
              type="simulation"
              name={record}
              isDownloadable={!!recordData.length}
              onlyAmplitudeLegend={false}
              data={recordData.map((v, i) => ({ ...v, line: { color: SIMULATION_COLORS[i] } }))}
              isLoading={isLoading}
              className="h-full w-full"
              plotConfig={{
                yAxisTitle: 'Voltage [mV]',
                showDefaultLegends: true,
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
  }
  return (
    <div className="secondary-scrollbar mb-4 flex h-full w-full flex-col gap-4 overflow-x-hidden overflow-y-auto px-5 select-none">
      {content}
    </div>
  );
}
