'use client';

import { atom } from 'jotai';
import { RESET } from 'jotai/utils';
import { captureException } from '@sentry/nextjs';

import uniqBy from 'lodash/uniqBy';
import pick from 'lodash/pick';
import values from 'lodash/values';
import delay from 'lodash/delay';
import sortBy from 'lodash/sortBy';

import {
  genericSingleNeuronSimulationPlotDataAtom,
  secNamesAtom,
  simulateStepTrackerAtom,
  simulationStatusAtom,
  stimulusPreviewPlotDataAtom,
} from './single-neuron';
import { simulationExperimentalSetupAtom } from './categories/simulation-conditions';
import { currentInjectionSimulationConfigAtom } from './categories/current-injection-simulation';
import { synaptomeSimulationConfigAtom } from './categories/synaptome-simulation-config';
import { recordingSourceForSimulationAtom } from './categories/recording-source-for-simulation';
import {
  EntityCreation,
  SingleNeuronSimulation,
  SingleNeuronSimulationResource,
  SynaptomeSimulation,
} from '@/types/nexus';
import { createJsonFileOnVlabProject, createResource, fetchResourceById } from '@/api/nexus';
import { composeUrl, createDistribution, getIdFromSelfUrl } from '@/util/nexus';
import { PlotData, PlotDataEntry } from '@/services/bluenaas-single-cell/types';
import { EModel } from '@/types/e-model';
import { MEModel } from '@/types/me-model';
import {
  SingleNeuronModelSimulationConfig,
  isBluenaasError,
  SimulationStreamData,
} from '@/types/simulation/single-neuron';
import { SimulationType } from '@/types/simulation/common';
import { isJSON } from '@/util/utils';
import { getSession } from '@/authFetch';
import { nexus } from '@/config';
import { runGenericSingleNeuronSimulation } from '@/api/bluenaas/runSimulation';
import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';
import updateArray from '@/util/updateArray';

export const SIMULATION_CONFIG_FILE_NAME_BASE = 'simulation-config';
export const STIMULUS_PLOT_NAME = 'stimulus-plot';
export const SIMULATION_PLOT_NAME = 'simulation-plot';

const DEFAULT_ERROR_MSG =
  'Simulation encountered an error, please be sure that the configuration is correct and try again';
const LOW_FUNDS_ERROR_MSG =
  'The project does not have enough credits to run the simulation, please add more and try again';
const LOW_FUNDS_ERROR_CODE = 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR';

export const createSingleNeuronSimulationAtom = atom<
  null,
  [string, string, string, string, string, SimulationType],
  Promise<SingleNeuronSimulationResource | null>
>(null, async (get, set, name, description, modelSelfUrl, vLabId, projectId, simulationType) => {
  const session = await getSession();
  if (!session) {
    throw new Error('No valid session found');
  }

  const recordFromConfig = get(recordingSourceForSimulationAtom);
  const experimentalSetupConfig = get(simulationExperimentalSetupAtom);
  const currentInjectionConfig = get(currentInjectionSimulationConfigAtom);
  const synaptomeConfig = get(synaptomeSimulationConfigAtom);
  const simulationResult = get(genericSingleNeuronSimulationPlotDataAtom);
  const stimulusResults = get(stimulusPreviewPlotDataAtom);

  const singleNeuronId = getIdFromSelfUrl(modelSelfUrl);

  if (!simulationResult || !singleNeuronId) return null;

  const recordFromUniq = uniqBy(recordFromConfig, (item) =>
    values(pick(item, ['section', 'offset']))
      .map(String)
      .join()
  );

  const singleNeuronSimulationConfig: SingleNeuronModelSimulationConfig = {
    recordFrom: recordFromUniq,
    conditions: experimentalSetupConfig,
    currentInjection: currentInjectionConfig[0],
    synaptome: simulationType === 'synaptome-simulation' ? synaptomeConfig : undefined,
  };

  const resource = await fetchResourceById<EModel | MEModel>(
    singleNeuronId,
    session,
    singleNeuronId.startsWith(nexus.defaultIdBaseUrl) ? {} : { org: vLabId, project: projectId }
  );

  if (
    !resource ||
    resource['@context'] === 'https://bluebrain.github.io/nexus/contexts/error.json'
  ) {
    throw new Error('Model not found');
  }

  const simulationConfigFile = await createJsonFileOnVlabProject(
    {
      simulation: Object.keys(simulationResult).reduce((prev, curr) => {
        return {
          ...prev,
          [curr]: convertObjectKeysToSnakeCase(simulationResult[curr]),
        };
      }, {}),
      stimulus: convertObjectKeysToSnakeCase(stimulusResults),
      config: convertObjectKeysToSnakeCase(singleNeuronSimulationConfig),
    },
    simulationType === 'single-neuron-simulation'
      ? `${SIMULATION_CONFIG_FILE_NAME_BASE}-single-neuron.json`
      : `${SIMULATION_CONFIG_FILE_NAME_BASE}-synaptome.json`,
    session,
    vLabId,
    projectId
  );

  let entity: EntityCreation<SingleNeuronSimulation> | EntityCreation<SynaptomeSimulation> | null =
    null;

  const commonProperties = {
    name,
    description,
    '@context': 'https://bbp.neuroshapes.org',
    distribution: [
      createDistribution(
        simulationConfigFile,
        composeUrl('file', simulationConfigFile['@id'], {
          rev: simulationConfigFile._rev,
          org: vLabId,
          project: projectId,
        })
      ),
    ],
    injectionLocation: singleNeuronSimulationConfig.currentInjection.injectTo,
    recordingLocation: singleNeuronSimulationConfig.recordFrom.map(
      (r) => `${r.section}_${r.offset}`
    ),
    brainLocation: resource.brainLocation,
    isDraft: false,
    status: 'success',
  };

  if (simulationType === 'single-neuron-simulation') {
    entity = {
      ...commonProperties,
      '@type': ['Entity', 'SingleNeuronSimulation'],
      used: {
        '@type': 'MEModel',
        '@id': singleNeuronId,
      },
    } as EntityCreation<SingleNeuronSimulation>;
  } else if (simulationType === 'synaptome-simulation') {
    entity = {
      ...commonProperties,
      '@type': ['Entity', 'SynaptomeSimulation'],
      used: {
        '@id': resource['@id'],
        '@type': resource['@type'],
      },
    } as EntityCreation<SynaptomeSimulation>;
  }

  const resourceUrl = composeUrl('resource', '', {
    sync: true,
    schema: null,
    project: projectId,
    org: vLabId,
  });
  if (entity) {
    return createResource<SingleNeuronSimulationResource>(entity, session, resourceUrl);
  }
  return null;
});

export const launchSimulationAtom = atom<
  null,
  [string, string, string, SimulationType, number],
  void
>(
  null,
  async (
    get,
    set,
    vlabId: string,
    projectId: string,
    modelSelfUrl: string,
    simulationType: SimulationType,
    duration: number
  ) => {
    const session = await getSession();
    if (!session?.accessToken) {
      throw new Error('Session token should be valid');
    }
    const currentInjectionConfig = get(currentInjectionSimulationConfigAtom);
    const synaptomeConfig = get(synaptomeSimulationConfigAtom);
    const recordFromConfig = get(recordingSourceForSimulationAtom);
    const conditionsConfig = get(simulationExperimentalSetupAtom);
    if (simulationType === 'single-neuron-simulation') {
      if (!currentInjectionConfig) {
        throw new Error('Cannot run simulation without valid configuration for current injection');
      }
    } else if (simulationType === 'synaptome-simulation') {
      if (
        (!currentInjectionConfig || !currentInjectionConfig.length) &&
        (!synaptomeConfig || !synaptomeConfig.length)
      ) {
        throw new Error('Cannot run simulation without valid configuration');
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
      const response = await runGenericSingleNeuronSimulation({
        vlabId,
        projectId,
        modelUrl: modelSelfUrl,
        token: session.accessToken,
        config: {
          recordFrom: recordFromUniq,
          conditions: conditionsConfig,
          currentInjection:
            currentInjectionConfig.length > 0 ? currentInjectionConfig[0] : undefined,
          synaptome: simulationType === 'synaptome-simulation' ? synaptomeConfig : undefined,
          type: simulationType,
          duration,
        },
      });

      if (!response.ok) {
        let errorMessage = DEFAULT_ERROR_MSG;

        try {
          const errResponseObj = await response.json();
          if (errResponseObj.error_code === LOW_FUNDS_ERROR_CODE) {
            errorMessage = LOW_FUNDS_ERROR_MSG;
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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (reader) {
        let buffer: string = '';
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() ?? '';
          parts.forEach((part) => mergeJsonBuffer(part.trim()));
        }

        // if we encountered that the remaining part is also a string
        if (isJSON(buffer.trim())) {
          const jsonData = JSON.parse(buffer);
          mergeJsonBuffer(jsonData);
        }

        set(simulationStatusAtom, { status: 'finished' });
        set(simulateStepTrackerAtom, {
          steps: get(simulateStepTrackerAtom).steps.map((p) => ({
            ...p,
            status: p.title === 'Results' ? 'finish' : p.status,
          })),
          current: { title: 'Results', status: 'finish' },
        });
      }
    } catch (error: any) {
      captureException(error, {
        tags: { section: 'simulation', type: 'simulationType' },
        extra: {
          modelSelfUrl,
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
        description: error.cause
          ? `${error}`
          : 'We are having trouble running the simulation, please wait a few moments, and try again',
      });
      set(simulateStepTrackerAtom, {
        steps: get(simulateStepTrackerAtom).steps.map((p) => ({
          ...p,
          status: p.title === 'Results' ? 'wait' : p.status,
        })),
        current: { title: 'Experimental setup' },
      });
    }

    function mergeJsonBuffer(part: string) {
      if (part && isJSON(part)) {
        const jsonData = JSON.parse(part) as SimulationStreamData;

        if (isBluenaasError(jsonData)) {
          throw new Error(
            jsonData.details ??
              'Simulation encountered an error, please be sure that the configuration is correct and try again',
            { cause: 'BluenaasError' }
          );
        }
        const newPlot: PlotDataEntry = {
          x: jsonData.x,
          y: jsonData.y,
          type: 'scatter',
          name: jsonData.name,
          recording: jsonData.recording,
          amplitude: jsonData.amplitude,
          frequency: jsonData.frequency,
          varyingKey: jsonData.varying_key,
        };

        const currentRecording = get(genericSingleNeuronSimulationPlotDataAtom)![
          jsonData.recording
        ];

        if (currentRecording) {
          const updatedPlot = {
            ...get(genericSingleNeuronSimulationPlotDataAtom),
            [jsonData.recording]:
              !currentRecording.length || !currentRecording.find((o) => o.name === newPlot.name)
                ? [...currentRecording, newPlot]
                : updateArray({
                    array: currentRecording,
                    keyfn: (item) => item.name === newPlot.name,
                    newVal: (value) => ({
                      ...value,
                      x: [...value.x, ...newPlot.x],
                      y: [...value.y, ...newPlot.y],
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
  }
);

export const resetSimulationAtom = atom(null, (get, set, resetValue: typeof RESET) => {
  set(recordingSourceForSimulationAtom, resetValue);
  set(currentInjectionSimulationConfigAtom, resetValue);
  set(synaptomeSimulationConfigAtom, resetValue);
  set(simulationExperimentalSetupAtom, resetValue);
  set(simulateStepTrackerAtom, resetValue);
  set(simulationStatusAtom, resetValue);
  set(secNamesAtom, resetValue);
});
