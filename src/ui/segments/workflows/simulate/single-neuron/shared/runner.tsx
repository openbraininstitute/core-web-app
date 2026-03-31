'use client'

import { captureException } from '@sentry/nextjs'
import {
  delay,
  isNil,
  kebabCase,
  get as lget,
  map,
  omit,
  pick,
  sortBy,
  uniqBy,
  values,
} from 'es-toolkit/compat'
import { atom, type Getter, type Setter } from 'jotai'
import { RESET } from 'jotai/utils'
import Link from 'next/link'
import { match } from 'ts-pattern'

import {
  createSingleNeuronSimulation,
  createSingleNeuronSynaptomeSimulation,
  getMEModel,
} from '@/api/entitycore/queries'
import { createJsonAsset } from '@/api/entitycore/queries/assets'
import { runSingleNeuronSimulation } from '@/api/small-scale-simulator'
import { tryCatch } from '@/api/utils'
import { config } from '@/config'
import {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation'
import { messages } from '@/i18n/en/simulation'
import { JobStatus, type Message, MessageType } from '@/services/small-scale-simulator/types'
import {
  genericSingleNeuronSimulationPlotDataAtomFamily,
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context'
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types'
import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format'
import { isType } from '@/util/type-guards'
import { readNdjsonResponse as readNewlineDelimitedJsonResponse } from '@/utils/response'

import { detectSpikeTimes } from './spike-detector'

import type { NotificationInstance } from 'antd/es/notification/interface'
import type {
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types'
import type { PlotData, PlotDataEntry } from '@/services/bluenaas-single-cell/types'
import type {
  SimulationStreamData,
  SingleNeuronModelSimulationConfig,
} from '@/types/small-scale-simulator/single-neuron'
import type {
  NeuronLocationArray,
  SimulationExperimentalSetup,
  SynapseConfigurationArray,
  TOverviewConfiguration,
  TSimulationType,
  TStimulationConfiguration,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types'

const LOW_FUNDS_ERROR_CODE = 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR'

export const createSingleNeuronSimulationAtom = atom(
  null,
  async (
    get,
    set,
    name: string,
    description: string,
    modelId: string,
    memodelId: string,
    virtualLabId: string,
    projectId: string,
    simulationType: TSimulationType,
    stimulationConfiguration: TStimulationConfiguration,
    experimentalSetupConfiguration: SimulationExperimentalSetup,
    recordingConfiguration: NeuronLocationArray,
    synaptomeConfiguration: SynapseConfigurationArray | undefined,
    simulationResult: Record<string, PlotData> | null,
    stimulusResult: PlotData | null
  ) => {
    if (!simulationResult || !modelId) return null

    const recordFromUniq = map(
      uniqBy(recordingConfiguration, (item) =>
        values(pick(item, ['section', 'offset']))
          .map(String)
          .join()
      ),
      (obj) => omit(obj, ['color'])
    )

    const singleNeuronSimulationConfig: SingleNeuronModelSimulationConfig = {
      record_from: recordFromUniq,
      conditions: experimentalSetupConfiguration,
      current_injection: stimulationConfiguration,
      synaptome:
        simulationType === SimulationType.SingleNeuronSynaptome
          ? synaptomeConfiguration
          : undefined,
    }

    const { data: meModel, error } = await tryCatch(
      getMEModel({
        id: memodelId,
        context: { virtualLabId, projectId },
      })
    )
    if (error || isNil(meModel)) {
      throw new Error(messages.SimulationPrerequisitesMEModelError)
    }

    const basePayload = {
      name,
      description,
      seed: experimentalSetupConfiguration.seed,
      injection_location: [singleNeuronSimulationConfig.current_injection.inject_to],
      recording_location: singleNeuronSimulationConfig.record_from.map(
        (r) => `${r.section}_${r.offset}`
      ),
      brain_region_id: meModel.brain_region.id,
    }
    let simulationPromise: Promise<
      ISingleNeuronSimulation | ISingleNeuronSynaptomeSimulation
    > | null = null
    if (simulationType === SimulationType.SingleNeuron) {
      simulationPromise = createSingleNeuronSimulation({
        context: { virtualLabId, projectId },
        body: { ...basePayload, me_model_id: meModel.id },
      })
    } else if (simulationType === SimulationType.SingleNeuronSynaptome) {
      simulationPromise = createSingleNeuronSynaptomeSimulation({
        context: { virtualLabId, projectId },
        body: { ...basePayload, synaptome_id: modelId },
      })
    }
    if (simulationPromise) {
      const { data: simulation, error: simulationError } = await tryCatch(simulationPromise)
      if (simulationError) {
        throw new Error(messages.CreationSimulationFailed)
      }
      const assetBasePayload =
        simulationType === SimulationType.SingleNeuron
          ? {
            label: SingleNeuronSimulation.asset.configfile,
            entityType: SingleNeuronSimulation.type,
            path: `single-neuron-simulation-${simulation.id}`,
          }
          : {
            label: SingleNeuronSynaptomeSimulation.asset.configfile,
            entityType: SingleNeuronSynaptomeSimulation.type,
            path: `single-neuron-synaptome-simulation-${simulation.id}`,
          }
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
                }
              }, {}),
              stimulus: convertObjectKeysToSnakeCase(stimulusResult),
              config: convertObjectKeysToSnakeCase(singleNeuronSimulationConfig),
            },
            ...assetBasePayload,
          })
        )
        if (asset) {
          return {
            simulation,
            asset,
          }
        }
        if (assetError) {
          throw new Error(messages.CreationSimulationIOAssetFailed)
        }
      }
    }
  }
)

/**
 * When the setter of this writable atom is called, it will update this atom:
 * `genericSingleNeuronSimulationPlotDataAtomFamily( sessionId )`
 */
export const launchSimulationAtom = atom<
  null,
  [
    string,
    string,
    string,
    string,
    string,
    TOverviewConfiguration,
    TStimulationConfiguration,
    SimulationExperimentalSetup,
    NeuronLocationArray,
    SynapseConfigurationArray,
    PlotData,
    TSimulationType,
    number,
    () => void,
    NotificationInstance,
    boolean,
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
    memodelId: string,
    sessionId: string,
    overviewConfiguration: TOverviewConfiguration,
    stimulationConfiguration: TStimulationConfiguration,
    experimentalSetupConfiguration: SimulationExperimentalSetup,
    recordingConfiguration: NeuronLocationArray,
    synaptomeConfiguration: SynapseConfigurationArray,
    stimulusGraphResult: PlotData,
    simulationType: TSimulationType,
    duration: number,
    onChangePanel: () => void,
    notify: NotificationInstance,
    isProjectAdmin: boolean
  ) => {
    checkArguments(simulationType, stimulationConfiguration, synaptomeConfiguration)
    const simulationStatusAtom = simulationStatusAtomFamily(sessionId)
    set(simulationStatusAtom, { status: SimulationStatus.LAUNCHED })
    const plotDataAtom = setInitialPlotData(recordingConfiguration, sessionId, set)
    const recordFromUniq = uniqBy(recordingConfiguration, (item) =>
      values(pick(item, ['section', 'offset']))
        .map(String)
        .join()
    )
    onChangePanel()

    try {
      const { data: response, error } = await tryCatch(
        runSingleNeuronSimulation({
          ctx: { virtualLabId, projectId },
          modelId,
          config: {
            recordFrom: recordFromUniq,
            conditions: experimentalSetupConfiguration,
            currentInjection: stimulationConfiguration,
            synaptome:
              simulationType === SimulationType.SingleNeuronSynaptome
                ? synaptomeConfiguration
                : undefined,
            type: simulationType,
            duration,
          },
        })
      )

      if (error) {
        let errorMessage =
          lget(error, 'cause.message', null) ?? messages.RunningSimulationDefaultError
        const isLowFundsError = lget(error, 'cause.code') === LOW_FUNDS_ERROR_CODE

        if (isLowFundsError) {
          errorMessage = isProjectAdmin ? messages.LowFundsError : messages.LowFundsErrorNonAdmin
        }

        set(simulationStatusAtom, {
          status: SimulationStatus.ERROR,
          description: errorMessage,
        })

        notify.error({
          message: `Simulation ${overviewConfiguration.name}`,
          description: isLowFundsError ? (
            <div className="flex flex-col gap-2  items-start">
              <p>{errorMessage}</p>
              {isProjectAdmin ? (
                <Link
                  href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/credits`}
                  className="text-primary-8 border-neutral-300 rounded-full border px-4 py-1.5 no-underline! hover:underline"
                  onClick={() => notify.destroy(`simulation-failed-${sessionId}`)}
                >
                  Transfer credits
                </Link>
              ) : (
                <Link
                  href={`${config.ROOT_ROUTE}/${virtualLabId}/overview`}
                  className="text-primary-8 border-neutral-300 rounded-full border px-4 py-1.5 no-underline! hover:underline"
                  onClick={() => notify.destroy(`simulation-failed-${sessionId}`)}
                >
                  Contact lab admin
                </Link>
              )}
            </div>
          ) : (
            errorMessage
          ),
          placement: 'topRight',
          key: `simulation-failed-${sessionId}`,
          duration: 1000,
        })
        return
      }

      if (!response?.ok) {
        let errorMessage = messages.DefaultSimulationError
        let isLowFundsError = false

        try {
          const errResponseObj = await response?.json()
          if (errResponseObj.error_code === LOW_FUNDS_ERROR_CODE) {
            isLowFundsError = true
            errorMessage = isProjectAdmin ? messages.LowFundsError : messages.LowFundsErrorNonAdmin
          }
        } catch {
          // ignore
        }

        set(simulationStatusAtom, {
          status: SimulationStatus.ERROR,
          description: errorMessage,
        })

        notify.error({
          message: `Simulation ${overviewConfiguration.name}`,
          description: isLowFundsError ? (
            <div className="flex flex-col gap-2 items-start">
              <p>{errorMessage}</p>
              {isProjectAdmin ? (
                <Link
                  href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/credits`}
                  className="text-primary-8 border-neutral-300 rounded-full border px-4 py-1.5 no-underline! hover:underline"
                  onClick={() => notify.destroy(`simulation-failed-${sessionId}`)}
                >
                  Transfer credits
                </Link>
              ) : (
                <Link
                  href={`${config.ROOT_ROUTE}/${virtualLabId}/overview`}
                  className="text-primary-8 border-neutral-300 rounded-full border px-4 py-1.5 no-underline! hover:underline"
                  onClick={() => notify.destroy(`simulation-failed-${sessionId}`)}
                >
                  Contact lab admin
                </Link>
              )}
            </div>
          ) : (
            errorMessage
          ),
          placement: 'topRight',
          key: `simulation-failed-${sessionId}`,
          duration: isLowFundsError ? 0 : undefined,
        })

        if (!isLowFundsError) {
          delay(() => set(simulationStatusAtom, RESET), 1000)
        }
        return
      }

      await readNewlineDelimitedJsonResponse<Message<SimulationStreamData>>(
        response,
        makeMessageParser(
          get,
          set,
          virtualLabId,
          projectId,
          notify,
          overviewConfiguration,
          sessionId,
          simulationStatusAtom,
          modelId,
          memodelId,
          simulationType,
          stimulationConfiguration,
          experimentalSetupConfiguration,
          recordingConfiguration,
          synaptomeConfiguration,
          plotDataAtom,
          stimulusGraphResult
        )
      )
    } catch (error) {
      captureException(error, {
        tags: { section: 'simulation', type: 'simulationType' },
        extra: {
          modelId,
          config: {
            recordFrom: recordFromUniq,
            conditions: experimentalSetupConfiguration,
            currentInjection: stimulationConfiguration,
            synapses:
              simulationType === 'synaptome-simulation' ? synaptomeConfiguration : undefined,
            type: simulationType,
            duration,
          },
        },
      })
      set(simulationStatusAtom, {
        status: SimulationStatus.ERROR,
        description: hasCause(error) ? `${error.cause}` : messages.RunningSimulationDefaultError,
      })
      notify.error({
        message: `Simulation ${overviewConfiguration.name}`,
        description: lget(error, 'cause.message', null) ?? messages.RunningSimulationDefaultError,
        placement: 'topRight',
        key: `simulation-failed-${sessionId}`,
      })
    }
  }
)

type PlotDataAtom = ReturnType<typeof genericSingleNeuronSimulationPlotDataAtomFamily>

function makeMessageParser(
  get: Getter,
  set: Setter,
  virtualLabId: string,
  projectId: string,
  notify: NotificationInstance,
  overviewConfiguration: { name: string; description?: string | undefined },
  sessionId: string,
  simulationStatusAtom: ReturnType<typeof simulationStatusAtomFamily>,
  modelId: string,
  memodelId: string,
  simulationType: TSimulationType,
  stimulationConfiguration: {
    id: number
    config_id: string
    inject_to: string
    stimulus: {
      stimulus_type: 'current_clamp' | 'voltage_clamp' | 'conductance'
      stimulus_protocol: 'ap_waveform' | 'idrest' | 'iv' | 'fire_pattern' | null
      amplitudes: number | number[]
    }
  },
  experimentalSetupConfiguration: {
    celsius: number
    vinit: number
    hypamp: number
    max_time: number
    time_step: number
    seed: number
  },
  recordingConfiguration: {
    section: string
    offset: number
    record_currents: boolean
    origin: 'injection' | 'recording'
    color?: string | undefined
  }[],
  synaptomeConfiguration: {
    id: string
    config_id: string
    delay: number
    duration: number
    frequency: number | number[]
    weight_scalar: number
    color?: string | undefined
  }[],
  plotDataAtom: PlotDataAtom,
  stimulusGraphResult: PlotData
): ((data: Message<SimulationStreamData>) => void) | undefined {
  const appendStreamData = makeAppendStreadData(get, set, plotDataAtom)
  return (message) => {
    match(message)
      .with({ message_type: MessageType.DATA }, (msg) => {
        const type = msg.data_type
        if (type === 'spikes') {
          // @TODO: Deal with spikes in another PR
        } else if (!type || type === 'trace') {
          return appendStreamData(msg.data)
        }
      })
      .with({ message_type: MessageType.STATUS, status: JobStatus.ERROR }, () => {
        notify.error({
          message: `Simulation ${overviewConfiguration.name}`,
          description: messages.SteamingSimulationResultDefaultError,
          placement: 'topRight',
          key: `simulation-failed-${sessionId}`,
        })
        set(simulationStatusAtom, {
          status: SimulationStatus.ERROR,
          description: messages.SteamingSimulationResultDefaultError,
        })
        throw new Error(messages.SteamingSimulationResultDefaultError, {
          cause: 'SmallScaleSimulatorError',
        })
      })
      .with({ message_type: MessageType.STATUS, status: JobStatus.DONE }, async () => {
        set(simulationStatusAtom, { status: SimulationStatus.EXECUTED })
        notify.success({
          message: `Simulation ${overviewConfiguration.name}`,
          description: messages.ExecutionSimulationSucceed,
          placement: 'topRight',
          key: `simulation-success-${sessionId}`,
        })
        const description = overviewConfiguration.description ?? ''
        const { data, error: saveError } = await tryCatch(
          set(
            createSingleNeuronSimulationAtom,
            overviewConfiguration.name,
            description,
            modelId,
            memodelId,
            virtualLabId,
            projectId,
            simulationType,
            stimulationConfiguration,
            experimentalSetupConfiguration,
            recordingConfiguration,
            synaptomeConfiguration,
            get(plotDataAtom),
            stimulusGraphResult as PlotData
          )
        )
        if (saveError) {
          set(simulationStatusAtom, {
            status: SimulationStatus.ERROR,
            description: messages.CreationSimulationFailed,
          })
          notify.error({
            message: `Simulation ${overviewConfiguration.name}`,
            description: messages.CreationSimulationFailed,
            placement: 'topRight',
            key: `simulation-failed-${sessionId}`,
          })
        }
        if (data) {
          notify.success({
            message: (
              <>
                Simulation <strong>{overviewConfiguration.name}</strong>
              </>
            ),
            description: (
              <div className="flex flex-col gap-2">
                <p>{messages.CreationSimulationSucceed}</p>
                <Link
                  href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(data.simulation.type)}/${data.simulation.id}`}
                  className="text-primary-8 no-underline! hover:underline"
                  onClick={() => notify.destroy(`simulation-success-${sessionId}`)}
                >
                  View Simulation
                </Link>
              </div>
            ),
            placement: 'topRight',
            duration: 0,
            key: `simulation-success-${sessionId}`,
            onClick: () => notify.destroy(`simulation-success-${sessionId}`),
          })
        }
        set(simulationStatusAtom, { status: SimulationStatus.SAVED })
      })
      .otherwise(() => null)
  }
}

function makeAppendStreadData(get: Getter, set: Setter, plotDataAtom: PlotDataAtom) {
  return (streamData: SimulationStreamData) => {
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
    }
    const currentPlotData = get(plotDataAtom)
    const currentRecording = currentPlotData?.[streamData.recording]

    if (currentRecording) {
      const key = makeKey(newPlot)
      const currentRecordingIndex = currentRecording.findIndex((o) => makeKey(o) === key)
      const value = currentRecording[currentRecordingIndex]
      if (currentRecordingIndex === -1) {
        currentRecording.push(newPlot)
      } else {
        currentRecording[currentRecordingIndex] = {
          ...value,
          x: [...value.x, ...newPlot.x],
          y: [...value.y, ...newPlot.y],
          variable_name: newPlot.variable_name ?? value.variable_name,
          unit: newPlot.unit ?? value.unit,
        }
      }
      const updatedPlot = {
        ...get(plotDataAtom),
        [streamData.recording]: currentRecording,
      }

      // Sort traces for each plot by `varyingKey` so that the legends appear in sorted order.
      Object.keys(updatedPlot).forEach((recordingLocation) => {
        updatedPlot[recordingLocation] = sortBy(updatedPlot[recordingLocation], ['varyingKey'])
      })

      set(plotDataAtom, detectSpikeTimes(updatedPlot))
    }
  }
}

function setInitialPlotData(
  recordingConfiguration: {
    section: string
    offset: number
    record_currents: boolean
    origin: 'injection' | 'recording'
    color?: string | undefined
  }[],
  sessionId: string,
  set: Setter
) {
  const initialPlotData = recordingConfiguration.reduce((acc: Record<string, PlotData>, o) => {
    const key = `${o.section}_${o.offset === 0 ? '0.0' : String(o.offset)}`
    acc[key] = []
    return acc
  }, {})
  const plotDataAtom = genericSingleNeuronSimulationPlotDataAtomFamily(sessionId)
  set(plotDataAtom, initialPlotData)
  return plotDataAtom
}

function checkArguments(
  simulationType: string,
  stimulationConfiguration: {
    id: number
    config_id: string
    inject_to: string
    stimulus: {
      stimulus_type: 'current_clamp' | 'voltage_clamp' | 'conductance'
      stimulus_protocol: 'ap_waveform' | 'idrest' | 'iv' | 'fire_pattern' | null
      amplitudes: number | number[]
    }
  },
  synaptomeConfiguration: {
    id: string
    config_id: string
    delay: number
    duration: number
    frequency: number | number[]
    weight_scalar: number
    color?: string | undefined
  }[]
) {
  if (simulationType === 'single-neuron-simulation') {
    if (!stimulationConfiguration) {
      throw new Error(messages.CurrentInjectionConfigMissingError)
    }
  } else if (simulationType === 'synaptome-simulation') {
    if (!stimulationConfiguration && (!synaptomeConfiguration || !synaptomeConfiguration.length)) {
      throw new Error(messages.SynaptomeConfigurationError)
    }
  }
}

function makeKey(entry: PlotDataEntry): string {
  return `${entry.name}\t${entry.variable_name}\t${entry.unit}`
}

function hasCause(data: unknown): data is { cause: string } {
  return isType(data, { cause: 'string' })
}
