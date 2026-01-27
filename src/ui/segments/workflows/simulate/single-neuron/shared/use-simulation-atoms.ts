import { useAtom } from 'jotai';
import {
  AMPERAGE_CONFIGURATION_SESSION_KEY,
  EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY,
  FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY,
  OVERVIEW_CONFIGURATION_SESSION_KEY,
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  AmperageStateAtomFamily,
  ExperimentalSetupConfigurationAtomFamily,
  FrequencyInputConfigurationAtomFamily,
  genericSingleNeuronSimulationPlotDataAtomFamily,
  OverviewConfigurationAtomFamily,
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';

export function makeSimulationAtoms(sessionId: string) {
  const spcKey = getSessionKey(STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const sesKey = getSessionKey(EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY, sessionId);
  const rlcKey = getSessionKey(RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const freqKey = getSessionKey(FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY, sessionId);
  const sscKey = getSessionKey(SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const infoKey = getSessionKey(OVERVIEW_CONFIGURATION_SESSION_KEY, sessionId);
  const ampKey = getSessionKey(AMPERAGE_CONFIGURATION_SESSION_KEY, sessionId);

  return {
    overviewConfigurationAtom: OverviewConfigurationAtomFamily(infoKey),
    stimulationConfigurationAtom: StimulationConfigurationAtomFamily(spcKey),
    experimentalSetupConfigurationAtom: ExperimentalSetupConfigurationAtomFamily(sesKey),
    recordLocationConfigurationAtom: RecordLocationConfigurationAtomFamily(rlcKey),
    synaptomeConfigurationAtom: SynaptomeConfigurationAtomFamily(sscKey),
    frequencyConfigurationAtom: FrequencyInputConfigurationAtomFamily(freqKey),
    amperageConfigurationAtom: AmperageStateAtomFamily(ampKey),
    simulationResultsAtom: genericSingleNeuronSimulationPlotDataAtomFamily(sessionId),
    simulationStatusAtom: simulationStatusAtomFamily(sessionId),
  };
}

export function useSingleNeuronSimulationAtoms(sessionId: string) {
  const {
    overviewConfigurationAtom,
    stimulationConfigurationAtom,
    experimentalSetupConfigurationAtom,
    recordLocationConfigurationAtom,
    synaptomeConfigurationAtom,
    frequencyConfigurationAtom,
    amperageConfigurationAtom,
    simulationResultsAtom,
    simulationStatusAtom,
  } = makeSimulationAtoms(sessionId);

  const [overviewConfiguration, updateOverviewConfiguration] = useAtom(overviewConfigurationAtom);
  const [stimulationConfiguration, updateStimulationConfiguration] = useAtom(
    stimulationConfigurationAtom
  );
  const [experimentalSetupConfiguration, updateExperimentalSetupConfiguration] = useAtom(
    experimentalSetupConfigurationAtom
  );
  const [recordLocationConfiguration, updateRecordLocationConfiguration] = useAtom(
    recordLocationConfigurationAtom
  );
  const [synaptomeConfiguration, updateSynaptomeConfiguration] = useAtom(
    synaptomeConfigurationAtom
  );
  const [frequencyConfiguration, updateFrequencyConfiguration] = useAtom(
    frequencyConfigurationAtom
  );
  const [amperageConfiguration, updateAmperageConfiguration] = useAtom(amperageConfigurationAtom);

  const [simulationResults, updateSimulationResult] = useAtom(simulationResultsAtom);
  const [simulationStatus, updateSimulationStatus] = useAtom(simulationStatusAtom);

  return {
    overviewConfiguration,
    stimulationConfiguration,
    experimentalSetupConfiguration,
    recordLocationConfiguration,
    synaptomeConfiguration,
    frequencyConfiguration,
    amperageConfiguration,
    simulationStatus,
    simulationResults,
    updateOverviewConfiguration,
    updateStimulationConfiguration,
    updateExperimentalSetupConfiguration,
    updateRecordLocationConfiguration,
    updateSynaptomeConfiguration,
    updateFrequencyConfiguration,
    updateAmperageConfiguration,
    updateSimulationResult,
    updateSimulationStatus,
  };
}
