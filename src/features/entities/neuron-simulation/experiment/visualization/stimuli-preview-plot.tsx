'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { captureException } from '@sentry/nextjs';
import { useAtom } from 'jotai';
import dynamic from 'next/dynamic';

import useNotification from '@/hooks/notifications';

import { stimulusPreviewPlotDataAtom } from '@/state/simulate/single-neuron';
import { SIMULATION_COLORS } from '@/constants/simulate/single-neuron';
import { StimulusModule } from '@/types/simulation/single-neuron';
import { PlotData } from '@/services/bluenaas-single-cell/types';
import { getDirectCurrentGraph } from '@/api/bluenaas';
import { getSession } from '@/authFetch';

const PlotRenderer = dynamic(
  () => import('@/features/entities/neuron-simulation/experiment/visualization/plot-renderer'),
  {
    ssr: false,
  }
);

type Props = {
  modelId: string;
  amplitudes: Array<number>;
  protocol: StimulusModule;
  projectId: string;
  virtualLabId: string;
};

export default function StimuliPreviewPlot({
  modelId,
  amplitudes,
  protocol,
  projectId,
  virtualLabId,
}: Props) {
  const [stimuliPreviewPlotData, setStimuliPreviewPlotData] = useAtom(stimulusPreviewPlotDataAtom);
  const [loading, setLoading] = useState(false);
  const previousFetchController = useRef<AbortController>(undefined);

  const { error: notifyError } = useNotification();

  const cancelPreviousRequest = () => {
    if (previousFetchController.current) {
      previousFetchController.current.abort();
    }
    const controller = new AbortController();
    previousFetchController.current = controller;
    return controller;
  };

  const updateStimuliPreview = useCallback(async () => {
    const controller = cancelPreviousRequest();

    try {
      setLoading(true);
      const session = await getSession();
      if (!session) {
        throw new Error('No user session found');
      }

      if (!amplitudes || !protocol) {
        throw new Error('No Stimulus protocol found');
      }

      const rawPlotData = await getDirectCurrentGraph(
        modelId,
        session.accessToken,
        {
          amplitudes,
          stimulusProtocol: protocol,
        },
        projectId,
        virtualLabId,
        controller.signal
      );

      const plotData: PlotData = rawPlotData.map((d, i) => ({
        type: 'scatter',
        line: { color: SIMULATION_COLORS[i] }, // Since we limit the number of amperages to 15 these colors should be enought
        ...d,
      }));

      setStimuliPreviewPlotData(plotData);
    } catch (error) {
      if (!controller.signal.aborted) {
        captureException(new Error('Preview plot could not be retrieved for model'));
        notifyError(
          'Error while loading stimulus plot data',
          undefined,
          'topRight',
          true,
          'plot-error'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    amplitudes,
    protocol,
    modelId,
    notifyError,
    setStimuliPreviewPlotData,
    projectId,
    virtualLabId,
  ]);

  useEffect(() => {
    updateStimuliPreview();
  }, [updateStimuliPreview]);

  return (
    <PlotRenderer
      isDownloadable
      withTitle={false}
      title={null}
      type="stimulus"
      name={`${protocol}_plots`}
      className="min-h-[320px] w-full"
      isLoading={loading}
      data={stimuliPreviewPlotData ?? []}
      plotConfig={{
        yAxisTitle: 'Current [nA]',
        showDefaultLegends: false,
      }}
    />
  );
}
