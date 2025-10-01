'use client';

import { captureException } from '@sentry/nextjs';
import { match } from 'ts-pattern';
import { atom } from 'jotai';
import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';
import values from 'lodash/values';
import isNil from 'lodash/isNil';
import delay from 'lodash/delay';
import pick from 'lodash/pick';
import lget from 'lodash/get';

import { runSingleNeuronSimulation } from '@/api/small-scale-simulator';
import {
  createSingleNeuronSimulation,
  createSingleNeuronSynaptomeSimulation,
  getMEModel,
} from '@/api/entitycore/queries';
import { createJsonAsset } from '@/api/entitycore/queries/assets';
import { SingleNeuronSimulationStatus } from '@/api/entitycore/types/shared/neuron-simulation';
import { PlotData, PlotDataEntry } from '@/services/bluenaas-single-cell/types';
import {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import {
  genericSingleNeuronSimulationPlotDataAtomFamily,
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/state/simulate/single-neuron';
import { SimulationType } from '@/types/small-scale-simulator/common';
import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';
import { readNdjsonResponse } from '@/utils/response';
import { messages } from '@/i18n/en/simulation';
import { tryCatch } from '@/api/utils';

import { type Message, JobStatus, MessageType } from '@/services/small-scale-simulator/types';
import type {
  RecordLocationArray,
  SimulationExperimentalSetup,
  TStimulationConfiguration,
  SynapseConfigurationArray,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import type {
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type {
  SimulationStreamData,
  SingleNeuronModelSimulationConfig,
} from '@/types/small-scale-simulator/single-neuron';

const LOW_FUNDS_ERROR_CODE = 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR';

export const createSingleNeuronSimulationAtom = atom(
  null,
  async (
    get,
    set,
    name: string,
    description: string,
    modelId: string,
    meModelId: string,
    virtualLabId: string,
    projectId: string,
    simulationType: SimulationType,
    stimulationConfig: TStimulationConfiguration,
    experimentalSetupConfig: SimulationExperimentalSetup,
    recordFromConfig: RecordLocationArray,
    synaptomeConfig: SynapseConfigurationArray | undefined,
    simulationResult: Record<string, PlotData> | null,
    stimulusResult: PlotData | null
  ) => {
    if (!simulationResult || !modelId) return null;

    const recordFromUniq = uniqBy(recordFromConfig, (item) =>
      values(pick(item, ['section', 'offset']))
        .map(String)
        .join()
    );

    const singleNeuronSimulationConfig: SingleNeuronModelSimulationConfig = {
      record_from: recordFromUniq,
      conditions: experimentalSetupConfig,
      current_injection: stimulationConfig,
      synaptome: simulationType === 'synaptome-simulation' ? synaptomeConfig : undefined,
    };

    const { data: meModel, error } = await tryCatch(
      getMEModel({
        id: meModelId,
        context: { virtualLabId, projectId },
      })
    );
    if (error || isNil(meModel)) {
      throw new Error(messages.SimulationPrerequisitesMEModelError);
    }

    const basePayload = {
      name,
      description,
      status: SingleNeuronSimulationStatus.success,
      seed: experimentalSetupConfig.seed,
      injection_location: [singleNeuronSimulationConfig.current_injection.inject_to],
      recording_location: singleNeuronSimulationConfig.record_from.map(
        (r) => `${r.section}_${r.offset}`
      ),
      brain_region_id: meModel.brain_region.id,
    };
    let simulationPromise: Promise<
      ISingleNeuronSimulation | ISingleNeuronSynaptomeSimulation
    > | null = null;
    if (simulationType === 'single-neuron-simulation') {
      simulationPromise = createSingleNeuronSimulation({
        context: { virtualLabId, projectId },
        body: { ...basePayload, me_model_id: meModel.id },
      });
    } else if (simulationType === 'synaptome-simulation') {
      simulationPromise = createSingleNeuronSynaptomeSimulation({
        context: { virtualLabId, projectId },
        body: { ...basePayload, synaptome_id: modelId },
      });
    }
    if (simulationPromise) {
      const { data: simulation, error: simulationError } = await tryCatch(simulationPromise);
      if (simulationError) {
        throw new Error(messages.CreationSimulationFailed);
      }
      const assetBasePayload =
        simulationType === 'single-neuron-simulation'
          ? {
              label: SingleNeuronSimulation.asset.configfile,
              entityType: SingleNeuronSimulation.type,
              path: `single-neuron-simulation-${simulation.id}`,
            }
          : {
              label: SingleNeuronSynaptomeSimulation.asset.configfile,
              entityType: SingleNeuronSynaptomeSimulation.type,
              path: `single-neuron-synaptome-simulation-${simulation.id}`,
            };
      if (simulation) {
        const { data: asset, error: assetError } = await tryCatch(
          createJsonAsset({
            ctx: {
              virtualLabId,
              projectId,
            },
            entityId: simulation.id,
            payload: {
              simulation: Object.keys(simulationResult).reduce((prev, curr) => {
                return {
                  ...prev,
                  [curr]: convertObjectKeysToSnakeCase(simulationResult[curr]),
                };
              }, {}),
              stimulus: convertObjectKeysToSnakeCase(stimulusResult),
              config: convertObjectKeysToSnakeCase(singleNeuronSimulationConfig),
            },
            ...assetBasePayload,
          })
        );
        if (asset) {
          return {
            simulation,
            asset,
          };
        }
        if (assetError) {
          throw new Error(messages.CreationSimulationIOAssetFailed);
        }
      }
    }
  }
);

export const launchSimulationAtom = atom<
  null,
  [
    string,
    string,
    string,
    string,
    TStimulationConfiguration,
    SimulationExperimentalSetup,
    RecordLocationArray,
    SynapseConfigurationArray,
    SimulationType,
    number,
    () => void,
  ],
  void
>(
  null,
  async (
    get,
    set,
    virtualLabId: string,
    projectId: string,
    modelId: string,
    sessionId: string,
    currentInjectionConfig: TStimulationConfiguration,
    conditionsConfig: SimulationExperimentalSetup,
    recordFromConfig: RecordLocationArray,
    synaptomeConfig: SynapseConfigurationArray,
    simulationType: SimulationType,
    duration: number,
    onChangePanel: () => void
  ) => {
    if (simulationType === 'single-neuron-simulation') {
      if (!currentInjectionConfig) {
        throw new Error(messages.CurrentInjectionConfigMissingError);
      }
    } else if (simulationType === 'synaptome-simulation') {
      if (!currentInjectionConfig && (!synaptomeConfig || !synaptomeConfig.length)) {
        throw new Error(messages.SynaptomeConfigurationError);
      }
    }
    const simStatusAtom = simulationStatusAtomFamily(sessionId);

    set(simStatusAtom, { status: SimulationStatus.LAUNCHED });

    const initialPlotData = recordFromConfig.reduce((acc: Record<string, PlotData>, o) => {
      const key = `${o.section}_${o.offset === 0 ? '0.0' : String(o.offset)}`;
      acc[key] = [];
      return acc;
    }, {});
    const plotDataAtom = genericSingleNeuronSimulationPlotDataAtomFamily(sessionId);

    set(plotDataAtom, initialPlotData);
    const recordFromUniq = uniqBy(recordFromConfig, (item) =>
      values(pick(item, ['section', 'offset']))
        .map(String)
        .join()
    );
    onChangePanel();

    try {
      const { data: response, error } = await tryCatch(
        runSingleNeuronSimulation({
          ctx: { virtualLabId, projectId },
          modelId,
          config: {
            recordFrom: recordFromUniq,
            conditions: conditionsConfig,
            currentInjection: currentInjectionConfig,
            synaptome: simulationType === 'synaptome-simulation' ? synaptomeConfig : undefined,
            type: simulationType,
            duration,
          },
        })
      );

      if (error) {
        set(simStatusAtom, {
          status: SimulationStatus.ERROR,
          description: lget(error, 'cause.message', null) ?? messages.RunningSimulationDefaultError,
        });
        return;
      }

      if (!response?.ok) {
        let errorMessage = messages.DefaultSimulationError;

        try {
          const errResponseObj = await response?.json();
          if (errResponseObj.error_code === LOW_FUNDS_ERROR_CODE) {
            errorMessage = messages.LowFundsError;
          }
        } catch {
          // ignore
        }

        set(simStatusAtom, {
          status: SimulationStatus.ERROR,
          description: errorMessage,
        });

        delay(() => set(simStatusAtom, { status: null }), 1000);

        return;
      }

      await readNdjsonResponse<Message<SimulationStreamData>>(response, (message) => {
        match(message)
          .with({ message_type: MessageType.DATA }, ({ data }) => appendStreamData(data))
          .with({ message_type: MessageType.STATUS, status: JobStatus.ERROR }, () => {
            throw new Error(messages.SteamingSimulationResultDefaultError, {
              cause: 'SmallScaleSimulatorError',
            });
          })
          .with({ message_type: MessageType.STATUS, status: JobStatus.DONE }, () => {
            set(simStatusAtom, { status: SimulationStatus.FINISHED });
          })
          .otherwise(() => null);
      });
    } catch (error: any) {
      captureException(error, {
        tags: { section: 'simulation', type: 'simulationType' },
        extra: {
          modelId,
          config: {
            recordFrom: recordFromUniq,
            conditions: conditionsConfig,
            currentInjection: currentInjectionConfig,
            synapses: simulationType === 'synaptome-simulation' ? synaptomeConfig : undefined,
            type: simulationType,
            duration,
          },
        },
      });
      set(simStatusAtom, {
        status: SimulationStatus.ERROR,
        description: error.cause ? `${error}` : messages.RunningSimulationDefaultError,
      });
    }

    function appendStreamData(streamData: SimulationStreamData) {
      const newPlot: PlotDataEntry = {
        x: streamData.x,
        y: streamData.y,
        type: 'scatter',
        name: streamData.name,
        recording: streamData.recording,
        amplitude: streamData.amplitude,
        frequency: streamData.frequency,
        varyingKey: streamData.varying_key,
        variable_name: streamData.variable_name,
        unit: streamData.unit,
      };
      const currentPlotData = get(plotDataAtom);
      const currentRecording = currentPlotData![streamData.recording];

      if (currentRecording) {
        const key = makeKey(newPlot);
        const currentRecordingIndex = currentRecording.findIndex((o) => makeKey(o) === key);
        const value = currentRecording[currentRecordingIndex];
        if (currentRecordingIndex === -1) {
          currentRecording.push(newPlot);
        } else {
          currentRecording[currentRecordingIndex] = {
            ...value,
            x: [...value.x, ...newPlot.x],
            y: [...value.y, ...newPlot.y],
            variable_name: newPlot.variable_name ?? value.variable_name,
            unit: newPlot.unit ?? value.unit,
          };
        }
        const updatedPlot = {
          ...get(plotDataAtom),
          [streamData.recording]: currentRecording,
        };

        // const updatedPlot2 = {
        //   ...get(plotDataAtom),
        //   [streamData.recording]:
        //     !currentRecording.length ||
        //     !currentRecording.find((o) => makeKey(o) === makeKey(newPlot))
        //       ? [...currentRecording, newPlot]
        //       : updateArray({
        //           array: currentRecording,
        //           keyfn: (item) => makeKey(item) === makeKey(newPlot),
        //           newVal: (value2) => ({
        //             ...value2,
        //             x: [...value2.x, ...newPlot.x],
        //             y: [...value2.y, ...newPlot.y],
        //             variable_name: newPlot.variable_name ?? value.variable_name,
        //             unit: newPlot.unit ?? value.unit,
        //           }),
        //         }),
        // };

        // Sort traces for each plot by `varyingKey` so that the legends appear in sorted order.
        Object.keys(updatedPlot).forEach((recordingLocation) => {
          updatedPlot[recordingLocation] = sortBy(updatedPlot[recordingLocation], ['varyingKey']);
        });

        set(plotDataAtom, updatedPlot);
      }
    }
  }
);

function makeKey(entry: PlotDataEntry): string {
  return `${entry.name}\t${entry.variable_name}\t${entry.unit}`;
}
