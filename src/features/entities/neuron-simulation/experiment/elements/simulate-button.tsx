'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { Form } from 'antd';

import kebabCase from 'lodash/kebabCase';

import useSimulationModal from '@/features/entities/neuron-simulation/experiment/hooks/useSimulationModal';
import SaveSimulation from '@/features/entities/neuron-simulation/experiment/elements/save-simulation';

import { currentInjectionSimulationConfigAtom } from '@/state/simulate/categories/current-injection-simulation';
import { simulationExperimentalSetupAtom } from '@/state/simulate/categories/simulation-conditions';
import { exportSimulationResultsAsZip } from '@/util/simulation-plotly-to-csv';
import { launchSimulationAtom } from '@/state/simulate/single-neuron-setter';
import { PROTOCOL_DETAILS } from '@/constants/simulate/single-neuron';
import { useAppNotification } from '@/components/notification';
import { messages } from '@/i18n/en/simulation';
import {
  genericSingleNeuronSimulationPlotDataAtom,
  simulationStatusAtom,
} from '@/state/simulate/single-neuron';

import type { Props as SaveSimulationProps } from '@/features/entities/neuron-simulation/experiment/elements/save-simulation';
import type { SimulationType } from '@/types/small-scale-simulator/common';
import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  modelId: string;
  meModelId: string;
  simulationType: SimulationType;
  disable: boolean;
};

export default function ActionButton({
  modelId,
  meModelId,
  virtualLabId,
  projectId,
  simulationType,
  disable,
}: Props) {
  const form = Form.useFormInstance();
  const [downloading, setDownloading] = useState(false);
  const { error: notifyError, success: notifySuccess } = useAppNotification();

  const simulationResults = useAtomValue(genericSingleNeuronSimulationPlotDataAtom);
  const currentInjectionConfig = useAtomValue(currentInjectionSimulationConfigAtom);
  const experimentalSetupConfig = useAtomValue(simulationExperimentalSetupAtom);
  const simulationStatus = useAtomValue(simulationStatusAtom);
  const launchSimulation = useSetAtom(launchSimulationAtom);

  const onCompleteSimulation = useSimulationModal<SaveSimulationProps>({
    showCloseIcon: false,
    Content: SaveSimulation,
  });

  const runSimulation = () => {
    const protocol = currentInjectionConfig.at(0)?.stimulus.stimulus_protocol;
    let currentInjectionDuration = 0;
    if (protocol) {
      currentInjectionDuration = PROTOCOL_DETAILS[protocol].defaults.time.stop_time;
    }
    launchSimulation(
      virtualLabId,
      projectId,
      modelId,
      simulationType,
      experimentalSetupConfig.max_time ?? currentInjectionDuration
    );
  };

  const [saveSimulation, saveModalContext] = onCompleteSimulation({
    id: 'save-simulation',
    modelId,
    meModelId,
    virtualLabId,
    projectId,
    simulationType,
  });

  const onDownloadRecordingDataAsZip = async () => {
    if (simulationResults) {
      try {
        setDownloading(true);
        await exportSimulationResultsAsZip({
          name: kebabCase(form.getFieldValue('name')) ?? 'simulation_plots',
          result: simulationResults,
        });
        notifySuccess({
          message: messages.DownloadSuccessful,
          placement: 'topRight',
          key: 'download-simulation-zip',
        });
      } catch (error) {
        notifyError({
          message: messages.DownloadFailed,
          placement: 'topRight',
          key: 'download-simulation-zip',
        });
      } finally {
        setDownloading(false);
      }
    }
  };

  useEffect(() => {
    if (simulationStatus?.status === 'error') {
      notifyError({
        message: simulationStatus.description ?? messages.SimulationFailed,
        placement: 'topRight',
        key: 'download-simulation-zip',
      });
    }
  }, [simulationStatus, notifyError]);

  return (
    <div className="flex items-center justify-between gap-4">
      {simulationStatus?.status === 'finished' && (
        <button
          className="bg-primary-8 w-max px-7 py-3 text-white"
          type="button"
          onClick={onDownloadRecordingDataAsZip}
        >
          {downloading && <LoadingOutlined className="mr-2" />}
          Download <span className="font-light">(csv)</span>
        </button>
      )}
      <button
        type="button"
        className="bg-primary-8 px-7 py-3 text-lg text-white disabled:bg-gray-300"
        onClick={runSimulation}
        disabled={simulationStatus?.status === 'launched' || disable}
      >
        {simulationStatus?.status === 'finished' ? 'Re-run Simulation' : 'Simulate'}
      </button>
      {simulationStatus?.status === 'finished' && (
        <button
          className="bg-primary-8 w-max px-7 py-3 text-white"
          type="button"
          onClick={saveSimulation}
        >
          Save
        </button>
      )}
      {saveModalContext}
    </div>
  );
}
