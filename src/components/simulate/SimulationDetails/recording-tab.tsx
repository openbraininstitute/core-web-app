'use client';

import { Fragment } from 'react';
import dynamic from 'next/dynamic';

// import PlotRenderer from '@/features/entities/neuron-simulation/experiment/visualization/plot-renderer';

import { PlotData } from '@/services/bluenaas-single-cell/types';
import { SIMULATION_COLORS } from '@/constants/simulate/single-neuron';

const PlotRenderer = dynamic(
  () => import('@/features/entities/neuron-simulation/experiment/visualization/plot-renderer'),
  {
    ssr: false,
  }
);

type Props = {
  recordings: Record<string, PlotData>;
};

export default function ResultsTab({ recordings }: Props) {
  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="mt-6 flex w-full max-w-4xl flex-col items-start gap-4">
        {Object.entries(recordings).map(([key, value]) => {
          return (
            <Fragment key={key}>
              <div className="flex w-full flex-col items-start justify-start">
                <div className="flex w-full flex-col">
                  <PlotRenderer
                    withTitle
                    title={key}
                    type="simulation"
                    name={key}
                    isDownloadable={!!value.length}
                    onlyAmplitudeLegend={false}
                    data={value.map((v, i) => ({ ...v, line: { color: SIMULATION_COLORS[i] } }))}
                    className="min-h-[320px] w-full"
                    plotConfig={{
                      yAxisTitle: 'Voltage [mV]',
                      showDefaultLegends: true,
                    }}
                  />
                </div>
              </div>
              <div className="my-5 h-px w-full bg-gray-200 last:hidden" />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
