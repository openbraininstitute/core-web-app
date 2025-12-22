'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import type { Layout } from 'plotly.js-dist-min';
import { getSingleNeuronStimuliPlot } from '@/api/small-scale-simulator';
import { useAppNotification } from '@/components/notification';
import type { PlotData } from '@/services/bluenaas-single-cell/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { SimulationColors } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';

import type { TStimulusModuleValue } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';

const PlotRenderer = dynamic(
  () => import('@/features/entities/neuron-simulation/experiment/visualization/plot-renderer'),
  {
    ssr: false,
  }
);

const PLOT_LAYOUT: Partial<Layout> = {
  plot_bgcolor: '#FAFAFA',
  paper_bgcolor: '#FAFAFA',
  autosize: true,
  xaxis: {
    automargin: true,
    color: '#003A8C',
    zeroline: false,
    showline: true,
    linecolor: '#888888',
    title: { text: 'Time [ms]', font: { size: 12 }, standoff: 6 },
  },
  yaxis: {
    automargin: true,
    color: '#003A8C',
    zeroline: false,
    showline: true,
    linecolor: '#888888',
    title: { text: 'Current [nA]', font: { size: 12 }, standoff: 6 },
  },
  showlegend: false,
  height: 320,
  margin: { t: 20, r: 20, b: 20, l: 20 },
  legend: {
    orientation: 'h',
    yanchor: 'top',
    xanchor: 'center',
    x: 0.5,
    y: 1.15,
  },
};

type Props = {
  memodelId: string;
  amplitudes: number[];
  protocol: TStimulusModuleValue;
};

export function StimuliPreviewPlot({ amplitudes, protocol, memodelId }: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const { error: notifyError } = useAppNotification();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: keyBuilder.stimulationProtocolPreview({
      virtualLabId,
      projectId,
      memodelId,
      amplitudes: amplitudes.join(','),
      protocol,
    }),
    queryFn: () =>
      getSingleNeuronStimuliPlot({
        modelId: memodelId,
        config: { amplitudes, stimulusProtocol: protocol },
        ctx: { projectId, virtualLabId },
      }),
    enabled: !!amplitudes && !!protocol,
  });

  const plotData: PlotData | undefined = data?.map((d, i) => ({
    type: 'scatter',
    line: { color: SimulationColors[i] }, // Since we limit the number of amperages to 15 these colors should be enought
    ...d,
  }));

  if (error && isError) {
    notifyError({
      message: 'Error while loading stimulus plot data',
      placement: 'topRight',
      key: 'plot-error',
    });
  }

  return (
    <PlotRenderer
      isDownloadable
      onlyAmplitudeLegend
      showCountValues={false}
      withTitle={false}
      title={null}
      type="stimulus"
      name={`${protocol}_plots`}
      className="min-h-[320px] w-full"
      isLoading={isLoading}
      data={plotData ?? []}
      plotConfig={{
        yAxisTitle: 'Current [nA]',
        showDefaultLegends: false,
      }}
      plotLayout={PLOT_LAYOUT}
      rootClassName="px-0"
      wrapperClassName="px-0"
      graphContainerClassName="px-0 pt-2"
      graphWrapperClassName="w-full"
    />
  );
}
