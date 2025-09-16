'use client';

import { captureException } from '@sentry/nextjs';
import { atom } from 'jotai';
import { RESET } from 'jotai/utils';
import { match } from 'ts-pattern';

import delay from 'lodash/delay';
import isNil from 'lodash/isNil';
import pick from 'lodash/pick';
import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';
import values from 'lodash/values';

import { runSingleNeuronSimulation } from '@/api/small-scale-simulator';
import updateArray from '@/util/updateArray';

import {
  createSingleNeuronSimulation,
  createSingleNeuronSynaptomeSimulation,
  getMEModel,
} from '@/api/entitycore/queries';
import { createJsonAsset } from '@/api/entitycore/queries/assets';
import { SingleNeuronSimulationStatus } from '@/api/entitycore/types/shared/neuron-simulation';
import { tryCatch } from '@/api/utils';
import {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import { messages } from '@/i18n/en/simulation';
import { PlotData, PlotDataEntry } from '@/services/bluenaas-single-cell/types';
import { currentInjectionSimulationConfigAtom } from '@/state/simulate/categories/current-injection-simulation';
import { recordingSourceForSimulationAtom } from '@/state/simulate/categories/recording-source-for-simulation';
import { simulationExperimentalSetupAtom } from '@/state/simulate/categories/simulation-conditions';
import { synaptomeSimulationConfigAtom } from '@/state/simulate/categories/synaptome-simulation-config';
import {
  genericSingleNeuronSimulationPlotDataAtom,
  secNamesAtom,
  simulateStepTrackerAtom,
  simulationStatusAtom,
  stimulusPreviewPlotDataAtom,
} from '@/state/simulate/single-neuron';
import { SimulationType } from '@/types/small-scale-simulator/common';
import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';

import type {
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import { JobStatus, Message, MessageType } from '@/services/small-scale-simulator/types';
import type {
  SimulationStreamData,
  SingleNeuronModelSimulationConfig,
} from '@/types/small-scale-simulator/single-neuron';
import { readNdjsonResponse } from '@/utils/response';

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
    simulationType: SimulationType
  ) => {
    const recordFromConfig = get(recordingSourceForSimulationAtom);
    const experimentalSetupConfig = get(simulationExperimentalSetupAtom);
    const currentInjectionConfig = get(currentInjectionSimulationConfigAtom);
    const synaptomeConfig = get(synaptomeSimulationConfigAtom);
    const simulationResult = get(genericSingleNeuronSimulationPlotDataAtom);
    const stimulusResults = get(stimulusPreviewPlotDataAtom);

    if (!simulationResult || !modelId) return null;

    const recordFromUniq = uniqBy(recordFromConfig, (item) =>
      values(pick(item, ['section', 'offset']))
        .map(String)
        .join()
    );

    const singleNeuronSimulationConfig: SingleNeuronModelSimulationConfig = {
      record_from: recordFromUniq,
      conditions: experimentalSetupConfig,
      current_injection: currentInjectionConfig[0],
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
              stimulus: convertObjectKeysToSnakeCase(stimulusResults),
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
  [string, string, string, SimulationType, number],
  void
>(
  null,
  async (
    get,
    set,
    virtualLabId: string,
    projectId: string,
    modelId: string,
    simulationType: SimulationType,
    duration: number
  ) => {
    const currentInjectionConfig = get(currentInjectionSimulationConfigAtom);
    const synaptomeConfig = get(synaptomeSimulationConfigAtom);
    const recordFromConfig = get(recordingSourceForSimulationAtom);
    const conditionsConfig = get(simulationExperimentalSetupAtom);
    if (simulationType === 'single-neuron-simulation') {
      if (!currentInjectionConfig) {
        throw new Error(messages.CurrentInjectionConfigMissingError);
      }
    } else if (simulationType === 'synaptome-simulation') {
      if (
        (!currentInjectionConfig || !currentInjectionConfig.length) &&
        (!synaptomeConfig || !synaptomeConfig.length)
      ) {
        throw new Error(messages.SynaptomeConfigurationError);
      }
    }

    set(simulationStatusAtom, { status: 'launched' });
    set(simulateStepTrackerAtom, {
      steps: get(simulateStepTrackerAtom).steps.map((p) => ({
        ...p,
        status: p.title === 'Results' ? 'process' : p.status,
      })),
      current: { title: 'Results', status: 'process' },
    });

    set(
      genericSingleNeuronSimulationPlotDataAtom,
      recordFromConfig.reduce((acc: Record<string, PlotData>, o) => {
        const key = `${o.section}_${o.offset === 0 ? '0.0' : String(o.offset)}`;
        acc[key] = [];
        return acc;
      }, {})
    );
    const recordFromUniq = uniqBy(recordFromConfig, (item) =>
      values(pick(item, ['section', 'offset']))
        .map(String)
        .join()
    );

    try {
      const { data: response, error } = await tryCatch(
        runSingleNeuronSimulation({
          ctx: { virtualLabId, projectId },
          modelId,
          config: {
            recordFrom: recordFromUniq,
            conditions: conditionsConfig,
            currentInjection:
              currentInjectionConfig.length > 0 ? currentInjectionConfig[0] : undefined,
            synaptome: simulationType === 'synaptome-simulation' ? synaptomeConfig : undefined,
            type: simulationType,
            duration,
          },
        })
      );

      if (error) {
        throw new Error('simulation failed');
      }
      if (!response.ok) {
        let errorMessage = messages.DefaultSimulationError;

        try {
          const errResponseObj = await response?.json();
          if (errResponseObj.error_code === LOW_FUNDS_ERROR_CODE) {
            errorMessage = messages.LowFundsError;
          }
        } catch {
          // ignore
        }

        set(simulationStatusAtom, {
          status: 'error',
          description: errorMessage,
        });

        delay(() => set(simulationStatusAtom, { status: null }), 1000);

        set(simulateStepTrackerAtom, {
          steps: get(simulateStepTrackerAtom).steps.map((p) => ({
            ...p,
            status: p.title === 'Results' ? 'wait' : p.status,
          })),
          current: { title: 'Experimental setup' },
        });

        return;
      }

      await readNdjsonResponse<Message<SimulationStreamData>>(response, (message) => {
        match(message)
          .with({ message_type: MessageType.DATA }, ({ data }) => appendStreamData(data))
          .with({ message_type: MessageType.STATUS, status: JobStatus.ERROR }, (msg) => {
            throw new Error(msg.extra ?? messages.SteamingSimulationResultDefaultError, {
              cause: 'SmallScaleSimulatorError',
            });
          })
          .with({ message_type: MessageType.STATUS, status: JobStatus.DONE }, () => {
            set(simulationStatusAtom, { status: 'finished' });
            set(simulateStepTrackerAtom, {
              steps: get(simulateStepTrackerAtom).steps.map((p) => ({
                ...p,
                status: p.title === 'Results' ? 'finish' : p.status,
              })),
              current: { title: 'Results', status: 'finish' },
            });
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
            currentInjection:
              currentInjectionConfig.length > 0 ? currentInjectionConfig[0] : undefined,
            synapses: simulationType === 'synaptome-simulation' ? synaptomeConfig : undefined,
            type: simulationType,
            duration,
          },
        },
      });
      set(simulationStatusAtom, {
        status: 'error',
        description: error.cause ? `${error}` : messages.RunningSimulationDefaultError,
      });
      set(simulateStepTrackerAtom, {
        steps: get(simulateStepTrackerAtom).steps.map((p) => ({
          ...p,
          status: p.title === 'Results' ? 'wait' : p.status,
        })),
        current: { title: 'Experimental setup' },
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

      const currentRecording = get(genericSingleNeuronSimulationPlotDataAtom)![
        streamData.recording
      ];

      if (currentRecording) {
        const updatedPlot = {
          ...get(genericSingleNeuronSimulationPlotDataAtom),
          [streamData.recording]:
            !currentRecording.length || !currentRecording.find((o) => o.name === newPlot.name)
              ? [...currentRecording, newPlot]
              : updateArray({
                  array: currentRecording,
                  keyfn: (item) => makeKey(item) === makeKey(newPlot),
                  newVal: (value) => ({
                    ...value,
                    x: [...value.x, ...newPlot.x],
                    y: [...value.y, ...newPlot.y],
                    variable_name: newPlot.variable_name ?? value.variable_name,
                    unit: newPlot.unit ?? value.unit,
                  }),
                }),
        };

        // Sort traces for each plot by `varyingKey` so that the legends appear in sorted order.
        Object.keys(updatedPlot).forEach((recordingLocation) => {
          updatedPlot[recordingLocation] = sortBy(updatedPlot[recordingLocation], ['varyingKey']);
        });

        set(genericSingleNeuronSimulationPlotDataAtom, updatedPlot);
      }
    }
  }
);

function makeKey(entry: PlotDataEntry): string {
  return `${entry.name}\t${entry.variable_name}\t${entry.unit}`;
}

export const resetSimulationAtom = atom(null, (get, set, resetValue: typeof RESET) => {
  set(recordingSourceForSimulationAtom, resetValue);
  set(currentInjectionSimulationConfigAtom, resetValue);
  set(synaptomeSimulationConfigAtom, resetValue);
  set(simulationExperimentalSetupAtom, resetValue);
  set(simulateStepTrackerAtom, resetValue);
  set(simulationStatusAtom, resetValue);
  set(secNamesAtom, resetValue);
});
